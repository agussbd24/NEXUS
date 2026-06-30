import { Hono } from 'hono';
import { signJWT } from '../lib/jwt';
import { jsonResponse, errorResponse, authenticate } from '../lib/middleware';
import type { Env } from '../types';

const auth = new Hono<{ Bindings: Env }>();

// Setup endpoint - only works when no users exist
auth.post('/setup', async (c) => {
  const { dni, nombre, apellido, password } = await c.req.json();

  // Check if any users exist
  const userCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  if (userCount && userCount.count > 0) {
    return errorResponse('Ya existe un usuario. Use el panel de administracion.', 403);
  }

  if (!dni || !nombre || !apellido || !password) {
    return errorResponse('Todos los campos son requeridos');
  }

  const passwordHash = await hashPassword(password);

  const result = await c.env.DB.prepare(
    'INSERT INTO users (dni, nombre, apellido, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ).bind(dni, nombre, apellido, passwordHash, 'admin').run();

  // Generate JWT and login
  const token = await signJWT(
    { sub: result.meta.last_row_id, dni, role: 'admin' },
    c.env.JWT_SECRET,
    86400 * 7
  );

  return jsonResponse({
    message: 'Admin creado exitosamente',
    token,
    user: {
      id: result.meta.last_row_id,
      dni,
      nombre,
      apellido,
      role: 'admin',
    },
  }, 201);
});

auth.post('/login', async (c) => {
  const { dni, password } = await c.req.json();

  if (!dni || !password) {
    return errorResponse('DNI y contraseña son requeridos');
  }

  const user = await c.env.DB.prepare(
    'SELECT id, dni, nombre, apellido, password_hash, role, avatar_url FROM users WHERE dni = ?'
  ).bind(dni).first();

  if (!user) {
    return errorResponse('Credenciales inválidas', 401);
  }

  // Verify password using Web Crypto
  const passwordValid = await verifyPassword(password, user.password_hash as string);
  if (!passwordValid) {
    return errorResponse('Credenciales inválidas', 401);
  }

  // Update last_seen
  await c.env.DB.prepare(
    "UPDATE users SET last_seen = datetime('now'), is_online = 1 WHERE id = ?"
  ).bind(user.id).run();

  // Generate JWT
  const token = await signJWT(
    { sub: user.id, dni: user.dni, role: user.role },
    c.env.JWT_SECRET,
    86400 * 7 // 7 days
  );

  // Store session
  await c.env.SESSIONS.put(`session:${user.id}`, token, { expirationTtl: 86400 * 7 });

  return jsonResponse({
    token,
    user: {
      id: user.id,
      dni: user.dni,
      nombre: user.nombre,
      apellido: user.apellido,
      role: user.role,
      avatar_url: user.avatar_url,
    },
  });
});

auth.post('/register', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);

  // Only admin can register new users
  if (!authCtx || authCtx.role !== 'admin') {
    return errorResponse('No autorizado. Solo administradores pueden crear usuarios.', 403);
  }

  const { dni, nombre, apellido, password, role } = await c.req.json();

  if (!dni || !nombre || !apellido || !password) {
    return errorResponse('Todos los campos son requeridos');
  }

  // Check if DNI already exists
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE dni = ?').bind(dni).first();
  if (existing) {
    return errorResponse('Ya existe un usuario con ese DNI');
  }

  const passwordHash = await hashPassword(password);

  const result = await c.env.DB.prepare(
    'INSERT INTO users (dni, nombre, apellido, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ).bind(dni, nombre, apellido, passwordHash, role || 'agente').run();

  return jsonResponse({
    message: 'Usuario creado exitosamente',
    userId: result.meta.last_row_id,
  }, 201);
});

auth.get('/me', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) {
    return errorResponse('No autorizado', 401);
  }

  const user = await c.env.DB.prepare(
    'SELECT id, dni, nombre, apellido, role, avatar_url, created_at, last_seen FROM users WHERE id = ?'
  ).bind(authCtx.userId).first();

  if (!user) {
    return errorResponse('Usuario no encontrado', 404);
  }

  return jsonResponse({ user });
});

auth.post('/logout', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (authCtx) {
    await c.env.DB.prepare(
      "UPDATE users SET is_online = 0, last_seen = datetime('now') WHERE id = ?"
    ).bind(authCtx.userId).run();
    await c.env.SESSIONS.delete(`session:${authCtx.userId}`);
  }
  return jsonResponse({ message: 'Sesión cerrada' });
});

auth.post('/change-password', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) {
    return errorResponse('No autorizado', 401);
  }

  const { currentPassword, newPassword } = await c.req.json();
  if (!currentPassword || !newPassword) {
    return errorResponse('Contraseña actual y nueva contraseña son requeridas');
  }

  const user = await c.env.DB.prepare(
    'SELECT password_hash FROM users WHERE id = ?'
  ).bind(authCtx.userId).first();

  if (!user || !(await verifyPassword(currentPassword, user.password_hash as string))) {
    return errorResponse('Contraseña actual incorrecta', 401);
  }

  const newHash = await hashPassword(newPassword);
  await c.env.DB.prepare(
    'UPDATE users SET password_hash = ? WHERE id = ?'
  ).bind(newHash, authCtx.userId).run();

  return jsonResponse({ message: 'Contraseña actualizada exitosamente' });
});

// Helper functions for password hashing using Web Crypto (bcrypt-compatible)
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(password);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  // Format: iterations:salt_hex:iv_hex:encrypted_hex
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const encHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');

  return `pbkdf2:100000:${saltHex}:${ivHex}:${encHex}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    if (hash.startsWith('pbkdf2:')) {
      const parts = hash.split(':');
      const iterations = parseInt(parts[1]);
      const salt = new Uint8Array(parts[2].match(/.{2}/g)!.map(h => parseInt(h, 16)));
      const iv = new Uint8Array(parts[3].match(/.{2}/g)!.map(h => parseInt(h, 16)));
      const encrypted = new Uint8Array(parts[4].match(/.{2}/g)!.map(h => parseInt(h, 16)));

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted) === password;
    }
    return false;
  } catch {
    return false;
  }
}

export default auth;

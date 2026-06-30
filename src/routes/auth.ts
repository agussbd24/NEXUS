import { Hono } from 'hono';
import { signJWT } from '../lib/jwt';
import { jsonResponse, errorResponse, authenticate } from '../lib/middleware';
import type { Env } from '../types';

const auth = new Hono<{ Bindings: Env }>();

async function checkRateLimit(db: D1Database, identifier: string, action: string, maxAttempts: number, windowSeconds: number): Promise<boolean> {
  const record = await db.prepare(
    'SELECT attempts, window_start FROM rate_limits WHERE identifier = ? AND action = ?'
  ).bind(identifier, action).first<{ attempts: number; window_start: string }>();

  if (record) {
    const windowStart = new Date(record.window_start).getTime();
    const now = Date.now();
    if (now - windowStart < windowSeconds * 1000) {
      if (record.attempts >= maxAttempts) return false;
      await db.prepare(
        'UPDATE rate_limits SET attempts = attempts + 1 WHERE identifier = ? AND action = ?'
      ).bind(identifier, action).run();
    } else {
      await db.prepare(
        'UPDATE rate_limits SET attempts = 1, window_start = datetime(\'now\') WHERE identifier = ? AND action = ?'
      ).bind(identifier, action).run();
    }
  } else {
    await db.prepare(
      'INSERT INTO rate_limits (identifier, action, attempts, window_start) VALUES (?, ?, 1, datetime(\'now\'))'
    ).bind(identifier, action).run();
  }
  return true;
}

auth.post('/setup', async (c) => {
  const { dni, nombre, apellido, password } = await c.req.json();

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
  try {
    const body = await c.req.json();
    const { dni, password } = body;

    if (!dni || !password) {
      return errorResponse('DNI y contrasena son requeridos');
    }

    const allowed = await checkRateLimit(c.env.DB, `login:${dni}`, 'login', 5, 300);
    if (!allowed) {
      return errorResponse('Demasiados intentos. Espere 5 minutos.', 429);
    }

    const user = await c.env.DB.prepare(
      'SELECT id, dni, nombre, apellido, password_hash, role, avatar_url, status FROM users WHERE dni = ?'
    ).bind(dni).first();

    if (!user) {
      return errorResponse('Credenciales invalidas', 401);
    }

    const passwordValid = await verifyPassword(password, user.password_hash as string);
    if (!passwordValid) {
      return errorResponse('Credenciales invalidas', 401);
    }

    await c.env.DB.prepare(
      "UPDATE users SET last_seen = datetime('now'), is_online = 1 WHERE id = ?"
    ).bind(user.id).run();

    const token = await signJWT(
      { sub: user.id, dni: user.dni, role: user.role },
      c.env.JWT_SECRET,
      86400 * 7
    );

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
        status: user.status || '',
      },
    });
  } catch (err: any) {
    return errorResponse(`Error login: ${err.message || err}`, 500);
  }
});

auth.post('/register', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);

  if (!authCtx || authCtx.role !== 'admin') {
    return errorResponse('No autorizado. Solo administradores pueden crear usuarios.', 403);
  }

  const { dni, nombre, apellido, password, role } = await c.req.json();

  if (!dni || !nombre || !apellido || !password) {
    return errorResponse('Todos los campos son requeridos');
  }

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
    'SELECT id, dni, nombre, apellido, role, avatar_url, status, created_at, last_seen FROM users WHERE id = ?'
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
  return jsonResponse({ message: 'Sesion cerrada' });
});

auth.post('/change-password', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) {
    return errorResponse('No autorizado', 401);
  }

  const { currentPassword, newPassword } = await c.req.json();
  if (!currentPassword || !newPassword) {
    return errorResponse('Contrasena actual y nueva contrasena son requeridas');
  }

  const user = await c.env.DB.prepare(
    'SELECT password_hash FROM users WHERE id = ?'
  ).bind(authCtx.userId).first();

  if (!user || !(await verifyPassword(currentPassword, user.password_hash as string))) {
    return errorResponse('Contrasena actual incorrecta', 401);
  }

  const newHash = await hashPassword(newPassword);
  await c.env.DB.prepare(
    'UPDATE users SET password_hash = ? WHERE id = ?'
  ).bind(newHash, authCtx.userId).run();

  return jsonResponse({ message: 'Contrasena actualizada exitosamente' });
});

auth.put('/status', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const { status } = await c.req.json();
  await c.env.DB.prepare(
    'UPDATE users SET status = ? WHERE id = ?'
  ).bind(status || '', authCtx.userId).run();

  return jsonResponse({ message: 'Estado actualizado' });
});

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordBytes = new TextEncoder().encode(password + Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''));

  const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBytes);
  const hashArray = new Uint8Array(hashBuffer);

  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

  return `sha256:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    if (hash.startsWith('sha256:')) {
      const parts = hash.split(':');
      const salt = parts[1];
      const storedHash = parts[2];

      const passwordBytes = new TextEncoder().encode(password + salt);
      const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBytes);
      const hashArray = new Uint8Array(hashBuffer);
      const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

      return hashHex === storedHash;
    }

    if (hash.startsWith('pbkdf2:')) {
      const parts = hash.split(':');
      const saltHex = parts[2];
      const ivHex = parts[3];
      const encHex = parts[4];

      const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
      const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
      const encrypted = new Uint8Array(encHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
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

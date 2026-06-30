import { Hono } from 'hono';
import { authenticate, jsonResponse, errorResponse } from '../lib/middleware';
import type { Env } from '../types';

const users = new Hono<{ Bindings: Env }>();

users.get('/', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const { search } = c.req.query();
  let query = 'SELECT id, dni, nombre, apellido, role, avatar_url, status, last_seen, is_online FROM users';
  const params: any[] = [];

  if (search) {
    query += ' WHERE (nombre LIKE ? OR apellido LIKE ? OR dni LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY nombre, apellido';

  const stmt = params.length > 0
    ? c.env.DB.prepare(query).bind(...params)
    : c.env.DB.prepare(query);

  const { results } = await stmt.all();
  return jsonResponse({ users: results });
});

users.get('/:id', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const user = await c.env.DB.prepare(
    'SELECT id, dni, nombre, apellido, role, avatar_url, status, created_at, last_seen, is_online FROM users WHERE id = ?'
  ).bind(c.req.param('id')).first();

  if (!user) return errorResponse('Usuario no encontrado', 404);
  return jsonResponse({ user });
});

users.put('/:id', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const targetId = parseInt(c.req.param('id'));
  if (authCtx.role !== 'admin' && authCtx.userId !== targetId) {
    return errorResponse('No tiene permisos para editar este usuario', 403);
  }

  const { nombre, apellido, role, avatar_url, status } = await c.req.json();

  const updates: string[] = [];
  const params: any[] = [];

  if (nombre) { updates.push('nombre = ?'); params.push(nombre); }
  if (apellido) { updates.push('apellido = ?'); params.push(apellido); }
  if (role && authCtx.role === 'admin') { updates.push('role = ?'); params.push(role); }
  if (avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(avatar_url); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }

  if (updates.length === 0) return errorResponse('No hay campos para actualizar');

  params.push(targetId);
  await c.env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return jsonResponse({ message: 'Usuario actualizado' });
});

users.delete('/:id', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx || authCtx.role !== 'admin') {
    return errorResponse('Solo administradores pueden eliminar usuarios', 403);
  }

  const targetId = parseInt(c.req.param('id'));
  if (authCtx.userId === targetId) {
    return errorResponse('No puede eliminarse a si mismo');
  }

  await c.env.DB.prepare('DELETE FROM reactions WHERE user_id = ?').bind(targetId).run();
  await c.env.DB.prepare('DELETE FROM read_receipts WHERE user_id = ?').bind(targetId).run();
  await c.env.DB.prepare('DELETE FROM participants WHERE user_id = ?').bind(targetId).run();

  const { results: userMessages } = await c.env.DB.prepare(
    'SELECT id FROM messages WHERE sender_id = ?'
  ).bind(targetId).all();
  for (const msg of userMessages) {
    await c.env.DB.prepare('DELETE FROM reactions WHERE message_id = ?').bind(msg.id).run();
  }
  await c.env.DB.prepare('DELETE FROM messages WHERE sender_id = ?').bind(targetId).run();

  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run();

  return jsonResponse({ message: 'Usuario eliminado' });
});

export default users;

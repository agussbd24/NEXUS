import { Hono } from 'hono';
import { authenticate, jsonResponse, errorResponse } from '../lib/middleware';
import type { Env } from '../types';

const messages = new Hono<{ Bindings: Env }>();

messages.get('/:conversationId', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const convoId = parseInt(c.req.param('conversationId'));
  const { before, limit } = c.req.query();

  // Check membership
  const member = await c.env.DB.prepare(
    'SELECT 1 FROM participants WHERE conversation_id = ? AND user_id = ?'
  ).bind(convoId, authCtx.userId).first();

  if (!member) return errorResponse('No es participante', 403);

  let query = `
    SELECT m.*, u.nombre as sender_nombre, u.apellido as sender_apellido, u.avatar_url as sender_avatar
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ?
  `;
  const params: any[] = [convoId];

  if (before) {
    query += ' AND m.id < ?';
    params.push(parseInt(before));
  }

  query += ' ORDER BY m.created_at DESC LIMIT ?';
  params.push(parseInt(limit) || 50);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  return jsonResponse({ messages: results.reverse() });
});

messages.post('/:conversationId', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const convoId = parseInt(c.req.param('conversationId'));
  const { content, content_type, file_url, file_name, file_size, reply_to } = await c.req.json();

  // Check membership
  const member = await c.env.DB.prepare(
    'SELECT 1 FROM participants WHERE conversation_id = ? AND user_id = ?'
  ).bind(convoId, authCtx.userId).first();

  if (!member) return errorResponse('No es participante', 403);

  if (!content && !file_url) {
    return errorResponse('Mensaje o archivo requerido');
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO messages (conversation_id, sender_id, content, content_type, file_url, file_name, file_size, reply_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    convoId,
    authCtx.userId,
    content || null,
    content_type || 'text',
    file_url || null,
    file_name || null,
    file_size || null,
    reply_to || null
  ).run();

  // Update conversation timestamp
  await c.env.DB.prepare(
    "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?"
  ).bind(convoId).run();

  // Get the full message
  const message = await c.env.DB.prepare(`
    SELECT m.*, u.nombre as sender_nombre, u.apellido as sender_apellido, u.avatar_url as sender_avatar
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).bind(result.meta.last_row_id).first();

  // Broadcast via Durable Object
  try {
    const doId = c.env.CHAT_ROOM.idFromName(`chat:${convoId}`);
    const stub = c.env.CHAT_ROOM.get(doId);
    await stub.fetch(new Request('https://nexus.internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'message',
        payload: message,
        conversation_id: convoId,
        user_id: authCtx.userId,
      }),
    }));
  } catch (e) {
    // DO might not be running, that's ok
  }

  return jsonResponse({ message }, 201);
});

messages.put('/:conversationId/:messageId', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const messageId = parseInt(c.req.param('messageId'));
  const { content } = await c.req.json();

  // Check ownership
  const msg = await c.env.DB.prepare(
    'SELECT sender_id FROM messages WHERE id = ?'
  ).bind(messageId).first();

  if (!msg) return errorResponse('Mensaje no encontrado', 404);
  if (msg.sender_id !== authCtx.userId) return errorResponse('Solo puede editar sus propios mensajes', 403);

  await c.env.DB.prepare(
    "UPDATE messages SET content = ?, is_edited = 1, updated_at = datetime('now') WHERE id = ?"
  ).bind(content, messageId).run();

  return jsonResponse({ message: 'Mensaje actualizado' });
});

messages.delete('/:conversationId/:messageId', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const messageId = parseInt(c.req.param('messageId'));

  // Check ownership or admin
  const msg = await c.env.DB.prepare(
    'SELECT sender_id FROM messages WHERE id = ?'
  ).bind(messageId).first();

  if (!msg) return errorResponse('Mensaje no encontrado', 404);
  if (msg.sender_id !== authCtx.userId && authCtx.role !== 'admin') {
    return errorResponse('No tiene permisos', 403);
  }

  await c.env.DB.prepare(
    "UPDATE messages SET is_deleted = 1, content = NULL, updated_at = datetime('now') WHERE id = ?"
  ).bind(messageId).run();

  return jsonResponse({ message: 'Mensaje eliminado' });
});

messages.post('/:conversationId/read', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const convoId = parseInt(c.req.param('conversationId'));
  const { message_id } = await c.req.json();

  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO read_receipts (message_id, user_id, read_at)
    SELECT id, ?, datetime('now') FROM messages 
    WHERE conversation_id = ? AND id <= ? AND sender_id != ?
  `).bind(authCtx.userId, convoId, message_id, authCtx.userId).run();

  return jsonResponse({ message: 'Mensajes marcados como leídos' });
});

messages.get('/:conversationId/poll', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const convoId = parseInt(c.req.param('conversationId'));
  const lastId = parseInt(c.req.query('last_id') || '0');

  const member = await c.env.DB.prepare(
    'SELECT 1 FROM participants WHERE conversation_id = ? AND user_id = ?'
  ).bind(convoId, authCtx.userId).first();
  if (!member) return errorResponse('No es participante', 403);

  const { results: newMessages } = await c.env.DB.prepare(`
    SELECT m.*, u.nombre as sender_nombre, u.apellido as sender_apellido, u.avatar_url as sender_avatar
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ? AND m.id > ?
    ORDER BY m.created_at ASC LIMIT 50
  `).bind(convoId, lastId).all();

  const { results: onlineUsers } = await c.env.DB.prepare(
    'SELECT id FROM users WHERE is_online = 1 AND id != ?'
  ).bind(authCtx.userId).all();

  return jsonResponse({
    messages: newMessages,
    online_users: onlineUsers.map((u) => u.id),
  });
});

export default messages;

import { Hono } from 'hono';
import { authenticate, jsonResponse, errorResponse } from '../lib/middleware';
import type { Env } from '../types';

const conversations = new Hono<{ Bindings: Env }>();

conversations.get('/', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const { results } = await c.env.DB.prepare(`
    SELECT c.*, 
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT sender_id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_sender,
      (SELECT COUNT(*) FROM messages m 
        WHERE m.conversation_id = c.id 
        AND m.created_at > COALESCE(
          (SELECT read_at FROM read_receipts WHERE message_id = m.id AND user_id = ?), 
          '1970-01-01'
        )
        AND m.sender_id != ?
      ) as unread_count
    FROM conversations c
    JOIN participants p ON c.id = p.conversation_id
    WHERE p.user_id = ?
    ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC
  `).bind(authCtx.userId, authCtx.userId, authCtx.userId).all();

  // Get participants for each conversation
  const convos = [];
  for (const convo of results) {
    const { results: participants } = await c.env.DB.prepare(`
      SELECT u.id, u.nombre, u.apellido, u.avatar_url, u.is_online, p.role
      FROM participants p
      JOIN users u ON p.user_id = u.id
      WHERE p.conversation_id = ?
    `).bind(convo.id).all();

    convos.push({ ...convo, participants });
  }

  return jsonResponse({ conversations: convos });
});

conversations.post('/', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const { type, name, participant_ids } = await c.req.json();

  if (!type || !participant_ids || !Array.isArray(participant_ids)) {
    return errorResponse('Tipo y participantes son requeridos');
  }

  // For direct chats, check if conversation already exists
  if (type === 'direct' && participant_ids.length === 1) {
    const otherUserId = participant_ids[0];
    const existing = await c.env.DB.prepare(`
      SELECT c.id FROM conversations c
      WHERE c.type = 'direct'
      AND EXISTS (SELECT 1 FROM participants WHERE conversation_id = c.id AND user_id = ?)
      AND EXISTS (SELECT 1 FROM participants WHERE conversation_id = c.id AND user_id = ?)
    `).bind(authCtx.userId, otherUserId).first();

    if (existing) {
      return jsonResponse({ conversationId: existing.id });
    }
  }

  // Create conversation
  const result = await c.env.DB.prepare(
    'INSERT INTO conversations (type, name, created_by) VALUES (?, ?, ?)'
  ).bind(type, name || null, authCtx.userId).run();

  const conversationId = result.meta.last_row_id;

  // Add creator as participant
  await c.env.DB.prepare(
    'INSERT INTO participants (conversation_id, user_id, role) VALUES (?, ?, ?)'
  ).bind(conversationId, authCtx.userId, 'admin').run();

  // Add other participants
  for (const userId of participant_ids) {
    if (userId !== authCtx.userId) {
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO participants (conversation_id, user_id) VALUES (?, ?)'
      ).bind(conversationId, userId).run();
    }
  }

  return jsonResponse({ conversationId }, 201);
});

conversations.get('/:id', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const convoId = parseInt(c.req.param('id'));

  // Check membership
  const member = await c.env.DB.prepare(
    'SELECT 1 FROM participants WHERE conversation_id = ? AND user_id = ?'
  ).bind(convoId, authCtx.userId).first();

  if (!member) return errorResponse('No es participante de esta conversación', 403);

  const conversation = await c.env.DB.prepare(
    'SELECT * FROM conversations WHERE id = ?'
  ).bind(convoId).first();

  if (!conversation) return errorResponse('Conversación no encontrada', 404);

  const { results: participants } = await c.env.DB.prepare(`
    SELECT u.id, u.nombre, u.apellido, u.avatar_url, u.is_online, p.role
    FROM participants p
    JOIN users u ON p.user_id = u.id
    WHERE p.conversation_id = ?
  `).bind(convoId).all();

  return jsonResponse({ conversation: { ...conversation, participants } });
});

conversations.delete('/:id', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const convoId = parseInt(c.req.param('id'));

  const member = await c.env.DB.prepare(
    'SELECT role FROM participants WHERE conversation_id = ? AND user_id = ?'
  ).bind(convoId, authCtx.userId).first();

  if (!member || (member.role !== 'admin' && authCtx.role !== 'admin')) {
    return errorResponse('No tiene permisos para eliminar esta conversación', 403);
  }

  await c.env.DB.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(convoId).run();
  await c.env.DB.prepare('DELETE FROM read_receipts WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)').bind(convoId).run();
  await c.env.DB.prepare('DELETE FROM participants WHERE conversation_id = ?').bind(convoId).run();
  await c.env.DB.prepare('DELETE FROM conversations WHERE id = ?').bind(convoId).run();
  return jsonResponse({ message: 'Conversación eliminada' });
});

conversations.post('/:id/participants', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const convoId = parseInt(c.req.param('id'));
  const { user_id } = await c.req.json();

  if (!user_id) return errorResponse('user_id requerido');

  const member = await c.env.DB.prepare(
    'SELECT 1 FROM participants WHERE conversation_id = ? AND user_id = ?'
  ).bind(convoId, authCtx.userId).first();
  if (!member) return errorResponse('No es participante', 403);

  const existing = await c.env.DB.prepare(
    'SELECT 1 FROM participants WHERE conversation_id = ? AND user_id = ?'
  ).bind(convoId, user_id).first();
  if (existing) return errorResponse('Ya es participante');

  await c.env.DB.prepare(
    'INSERT INTO participants (conversation_id, user_id) VALUES (?, ?)'
  ).bind(convoId, user_id).run();

  return jsonResponse({ message: 'Participante agregado' }, 201);
});

conversations.delete('/:id/participants/:userId', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const convoId = parseInt(c.req.param('id'));
  const targetUserId = parseInt(c.req.param('userId'));

  const member = await c.env.DB.prepare(
    'SELECT role FROM participants WHERE conversation_id = ? AND user_id = ?'
  ).bind(convoId, authCtx.userId).first();
  if (!member) return errorResponse('No es participante', 403);

  if (targetUserId === authCtx.userId) return errorResponse('No puede quitarse a si mismo');

  if (member.role !== 'admin' && authCtx.role !== 'admin') {
    return errorResponse('Solo admins pueden remover participantes', 403);
  }

  await c.env.DB.prepare(
    'DELETE FROM participants WHERE conversation_id = ? AND user_id = ?'
  ).bind(convoId, targetUserId).run();

  return jsonResponse({ message: 'Participante removido' });
});

export default conversations;

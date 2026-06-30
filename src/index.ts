import { Hono } from 'hono';
import { corsHeaders, errorResponse, jsonResponse } from './lib/middleware';
import auth from './routes/auth';
import users from './routes/users';
import conversations from './routes/conversations';
import messages from './routes/messages';
import files from './routes/files';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }
  await next();
});

// Health check
app.get('/', (c) => {
  return jsonResponse({
    name: 'NEXUS API',
    version: '1.0.0',
    status: 'running',
  });
});

// API Routes
app.route('/api/auth', auth);
app.route('/api/users', users);
app.route('/api/conversations', conversations);
app.route('/api/messages', messages);
app.route('/api/files', files);

// Durable Object WebSocket proxy
app.get('/ws/chat/:conversationId', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse('Token requerido', 401);
  }

  const { verifyJWT } = await import('./lib/jwt');
  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return errorResponse('Token inválido', 401);
  }

  const conversationId = c.req.param('conversationId');
  const userId = payload.sub;

  // Forward to Durable Object
  const doId = c.env.CHAT_ROOM.idFromName(`chat:${conversationId}`);
  const stub = c.env.CHAT_ROOM.get(doId);

  const url = new URL(c.req.url);
  url.pathname = '/';
  url.searchParams.set('conversationId', conversationId);
  url.searchParams.set('userId', String(userId));

  return stub.fetch(new Request(url.toString(), {
    headers: c.req.raw.headers,
  }));
});

// 404 handler
app.notFound((c) => {
  return errorResponse('Endpoint no encontrado', 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return errorResponse('Error interno del servidor', 500);
});

export default {
  fetch: app.fetch,
};

export { ChatRoom } from './durable-objects/ChatRoom';

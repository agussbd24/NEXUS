import { Hono } from 'hono';
import { corsHeaders, errorResponse, jsonResponse } from './lib/middleware';
import auth from './routes/auth';
import users from './routes/users';
import conversations from './routes/conversations';
import messages from './routes/messages';
import files from './routes/files';
import type { Env } from './types';

const api = new Hono<{ Bindings: Env }>();

// CORS middleware for API
api.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }
  await next();
});

// API Routes
api.route('/auth', auth);
api.route('/users', users);
api.route('/conversations', conversations);
api.route('/messages', messages);
api.route('/files', files);

// Durable Object WebSocket proxy
api.get('/ws/chat/:conversationId', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse('Token requerido', 401);
  }

  const { verifyJWT } = await import('./lib/jwt');
  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return errorResponse('Token invalido', 401);
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

const app = new Hono<{ Bindings: Env }>();

// API routes go first
app.route('/api', api);

// WebSocket route (needs to be before static assets)
app.get('/ws/:path*', async (c) => {
  const authHeader = c.req.header('Authorization') || new URL(c.req.url).searchParams.get('token');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!token) {
    return errorResponse('Token requerido', 401);
  }

  const { verifyJWT } = await import('./lib/jwt');
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return errorResponse('Token invalido', 401);
  }

  const pathParts = c.req.url.split('/');
  const conversationIdIndex = pathParts.findIndex(p => p === 'chat') + 1;
  const conversationId = pathParts[conversationIdIndex]?.split('?')[0];

  if (!conversationId) {
    return errorResponse('Conversation ID requerido', 400);
  }

  const userId = payload.sub;

  const doId = c.env.CHAT_ROOM.idFromName(`chat:${conversationId}`);
  const stub = c.env.CHAT_ROOM.get(doId);

  const url = new URL(c.req.url);
  url.searchParams.set('conversationId', conversationId);
  url.searchParams.set('userId', String(userId));

  return stub.fetch(new Request(url.toString(), {
    headers: c.req.raw.headers,
  }));
});

// Static assets (frontend)
app.get('*', async (c) => {
  // @ts-ignore
  const assets = c.env.ASSETS;
  if (assets) {
    return assets.fetch(c.req.raw);
  }
  return c.notFound();
});

// Fallback
app.notFound((c) => {
  // Try to serve index.html for SPA routing
  // @ts-ignore
  const assets = c.env.ASSETS;
  if (assets) {
    const url = new URL(c.req.url);
    url.pathname = '/';
    return assets.fetch(new Request(url.toString()));
  }
  return errorResponse('Not found', 404);
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

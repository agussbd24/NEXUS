import { Hono } from 'hono';
import { authenticate, jsonResponse, errorResponse } from '../lib/middleware';
import type { Env } from '../types';

const files = new Hono<{ Bindings: Env }>();

files.post('/upload', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const formData = await c.req.formData();
  const fileValue = formData.get('file');

  if (!fileValue || typeof fileValue === 'string') return errorResponse('Archivo requerido');
  const file: File = fileValue;

  // Generate unique key
  const ext = file.name.split('.').pop() || '';
  const key = `files/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Upload to R2
  await c.env.R2.put(key, file, {
    httpMetadata: {
      contentType: file.type,
    },
  });

  return jsonResponse({
    url: `/api/files/${key}`,
    key,
    name: file.name,
    size: file.size,
    type: file.type,
  }, 201);
});

files.get('/:key{.+}', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const key = c.req.param('key');
  const object = await c.env.R2.get(key);

  if (!object) return errorResponse('Archivo no encontrado', 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000');

  return new Response(object.body, { headers });
});

files.delete('/:key{.+}', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const key = c.req.param('key');
  await c.env.R2.delete(key);

  return jsonResponse({ message: 'Archivo eliminado' });
});

export default files;

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

  if (file.size > 25 * 1024 * 1024) {
    return errorResponse('El archivo no puede superar 25MB');
  }

  const ext = file.name.split('.').pop() || '';
  const key = `files/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  const metadata = {
    name: file.name,
    size: file.size,
    type: file.type,
    uploaded_by: authCtx.userId,
    uploaded_at: new Date().toISOString(),
  };

  await c.env.SESSIONS.put(`file:${key}`, base64, {
    expirationTtl: 86400 * 30,
    metadata,
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
  const value = await c.env.SESSIONS.getWithMetadata(`file:${key}`);

  if (!value.value) return errorResponse('Archivo no encontrado', 404);

  const base64 = value.value;
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const meta = value.metadata as any;
  const contentType = meta?.type || 'application/octet-stream';

  return new Response(binary, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000',
      'Content-Disposition': `inline; filename="${meta?.name || 'file'}"`,
    },
  });
});

files.delete('/:key{.+}', async (c) => {
  const authCtx = await authenticate(c.req.raw, c.env);
  if (!authCtx) return errorResponse('No autorizado', 401);

  const key = c.req.param('key');
  await c.env.SESSIONS.delete(`file:${key}`);
  return jsonResponse({ message: 'Archivo eliminado' });
});

export default files;

import { Hono } from 'hono';
import { authenticate, jsonResponse, errorResponse } from '../lib/middleware';
import type { Env } from '../types';

const files = new Hono<{ Bindings: Env }>();

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

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
  const base64 = arrayBufferToBase64(arrayBuffer);

  const metadata = {
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
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
  const key = c.req.param('key');
  const value = await c.env.SESSIONS.getWithMetadata(`file:${key}`);

  if (!value.value) return errorResponse('Archivo no encontrado', 404);

  const arrayBuffer = base64ToArrayBuffer(value.value);

  const meta = value.metadata as any;
  const contentType = meta?.type || 'application/octet-stream';

  return new Response(arrayBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000',
      'Content-Disposition': `inline; filename="${meta?.name || 'file'}"`,
      'Access-Control-Allow-Origin': '*',
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

import { verifyJWT } from './jwt';
import type { Env, JWTPayload } from '../types';

export interface AuthContext {
  userId: number;
  dni: string;
  role: string;
}

export async function authenticate(request: Request, env: Env): Promise<AuthContext | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return null;

  return {
    userId: payload.sub,
    dni: payload.dni,
    role: payload.role,
  } as AuthContext;
}

export function corsHeaders(origin: string = '*'): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function jsonResponse(data: any, status: number = 200, origin: string = '*'): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

export function errorResponse(message: string, status: number = 400, origin: string = '*'): Response {
  return jsonResponse({ error: message }, status, origin);
}

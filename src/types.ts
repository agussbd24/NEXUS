export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  CHAT_ROOM: DurableObjectNamespace;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export interface User {
  id: number;
  dni: string;
  nombre: string;
  apellido: string;
  password_hash: string;
  role: 'admin' | 'oficial' | 'agente';
  avatar_url: string | null;
  public_key: string | null;
  status: string;
  created_at: string;
  last_seen: string;
  is_online: number;
}

export interface Conversation {
  id: number;
  type: 'direct' | 'group';
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  conversation_id: number;
  user_id: number;
  role: 'admin' | 'member';
  notifications: number;
  is_muted: number;
  is_archived: number;
  is_pinned: number;
  joined_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string | null;
  content_type: 'text' | 'image' | 'file' | 'voice' | 'video' | 'system';
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  reply_to: number | null;
  is_edited: number;
  is_deleted: number;
  is_pinned: number;
  forwarded_from: number | null;
  created_at: string;
  updated_at: string;
}

export interface JWTPayload {
  sub: number;
  dni: string;
  role: string;
  exp: number;
}

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'read' | 'online' | 'join' | 'leave' | 'edit' | 'delete' | 'reaction' | 'rename' | 'pin';
  payload: any;
  conversation_id: number;
  user_id: number;
  timestamp: string;
}

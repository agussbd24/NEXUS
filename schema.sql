-- ============================================
-- NEXUS - Schema de Base de Datos
-- Sistema de Mensajeria Institucional
-- ============================================

-- Usuarios del sistema
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dni TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'agente' CHECK(role IN ('admin', 'oficial', 'agente')),
  avatar_url TEXT,
  public_key TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  last_seen TEXT DEFAULT (datetime('now')),
  is_online INTEGER DEFAULT 0
);

-- Conversaciones (1:1 o grupo)
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'direct' CHECK(type IN ('direct', 'group')),
  name TEXT,
  description TEXT,
  avatar_url TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Participantes de conversaciones
CREATE TABLE IF NOT EXISTS participants (
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  notifications INTEGER DEFAULT 1,
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (conversation_id, user_id)
);

-- Mensajes
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id),
  content TEXT,
  content_type TEXT DEFAULT 'text' CHECK(content_type IN ('text', 'image', 'file', 'voice', 'video', 'system')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  reply_to INTEGER REFERENCES messages(id),
  is_edited INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Estados de lectura
CREATE TABLE IF NOT EXISTS read_receipts (
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  read_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (message_id, user_id)
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_users_dni ON users(dni);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

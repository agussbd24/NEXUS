-- ============================================
-- NEXUS Migration 002: New Features
-- ============================================

-- User status/about text
ALTER TABLE users ADD COLUMN status TEXT DEFAULT '';

-- Conversation muting and archiving
ALTER TABLE participants ADD COLUMN is_muted INTEGER DEFAULT 0;
ALTER TABLE participants ADD COLUMN is_archived INTEGER DEFAULT 0;

-- Conversation pinning
ALTER TABLE participants ADD COLUMN is_pinned INTEGER DEFAULT 0;

-- Message reactions
CREATE TABLE IF NOT EXISTS reactions (
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (message_id, user_id, emoji)
);

-- Pinned messages
ALTER TABLE messages ADD COLUMN is_pinned INTEGER DEFAULT 0;

-- Message forwarding (track original sender)
ALTER TABLE messages ADD COLUMN forwarded_from INTEGER REFERENCES users(id);

-- Rate limiting table for login attempts
CREATE TABLE IF NOT EXISTS rate_limits (
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  attempts INTEGER DEFAULT 1,
  window_start TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (identifier, action)
);

-- Indexes for new features
CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON messages(conversation_id, is_pinned) WHERE is_pinned = 1;
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action);

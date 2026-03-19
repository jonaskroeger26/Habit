CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

INSERT INTO chat_messages (room_id, user_id, user_display_name, content) VALUES 
  ('general', 'system', 'System', 'Welcome to the Habit Breaker community! 🔥')
ON CONFLICT DO NOTHING;

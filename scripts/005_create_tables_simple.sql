CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO chat_rooms (id, name, description) VALUES
  ('smoking', 'Quit Smoking', 'Support for quitting smoking'),
  ('alcohol', 'Alcohol Free', 'Sobriety support group'),
  ('social-media', 'Digital Detox', 'Breaking social media addiction'),
  ('fitness', 'Fitness Journey', 'Exercise and health habits'),
  ('general', 'General Support', 'General accountability and motivation')
ON CONFLICT DO NOTHING;

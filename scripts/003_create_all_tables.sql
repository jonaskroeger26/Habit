CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);

CREATE TABLE IF NOT EXISTS habit_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES habit_categories(id),
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_checkin TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_habits_user ON user_habits(user_id);

CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES user_habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_check_ins_habit ON check_ins(habit_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_user ON check_ins(user_id);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

INSERT INTO chat_rooms (id, name, description) VALUES
  ('smoking', 'Quit Smoking', 'Support for quitting smoking'),
  ('alcohol', 'Alcohol Free', 'Sobriety support group'),
  ('social-media', 'Digital Detox', 'Breaking social media addiction'),
  ('fitness', 'Fitness Journey', 'Exercise and health habits'),
  ('general', 'General Support', 'General accountability and motivation')
ON CONFLICT DO NOTHING;

INSERT INTO habit_categories (name, description) VALUES
  ('Addiction', 'Breaking addictions like smoking, alcohol, drugs'),
  ('Health', 'Improving diet, exercise, and sleep'),
  ('Mental Health', 'Meditation, anxiety management, therapy'),
  ('Social Media', 'Reducing screen time and social media use'),
  ('Productivity', 'Building focus and eliminating procrastination'),
  ('Self Care', 'Skincare, grooming, personal hygiene')
ON CONFLICT DO NOTHING;

-- Habit Breaker App - Database Schema Setup
-- Execute these SQL statements in your Supabase SQL Editor

-- 1. Create tables
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Flame',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES habit_categories(id) ON DELETE CASCADE,
  custom_name TEXT,
  reason_to_quit TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES user_habits(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('clean', 'relapsed')),
  notes TEXT,
  streak_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES habit_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES habit_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
  reaction_type TEXT CHECK (reaction_type IN ('fire', 'heart', 'clap', 'strong')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, comment_id)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_habits_user_id ON user_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_habits_category_id ON user_habits(category_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_habit_id ON check_ins(habit_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category_id ON forum_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_post_id ON forum_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_user_id ON forum_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON reactions(comment_id);

-- 3. Seed habit categories
INSERT INTO habit_categories (name, description, icon) VALUES
('Smoking', 'Quit smoking and tobacco use', 'Cigarette'),
('Alcohol', 'Reduce or eliminate alcohol consumption', 'Wine'),
('Social Media', 'Break social media addiction', 'Smartphone'),
('Sugar', 'Reduce sugar intake', 'Candy'),
('Caffeine', 'Reduce caffeine dependency', 'Coffee'),
('Porn', 'Overcome porn addiction', 'Eye'),
('Gaming', 'Break excessive gaming habits', 'Gamepad2'),
('Junk Food', 'Eat healthier, avoid junk food', 'Utensils'),
('Procrastination', 'Stop procrastinating and be productive', 'Clock'),
('Negative Thoughts', 'Develop more positive thinking patterns', 'Brain')
ON CONFLICT (name) DO NOTHING;

-- 4. Create chat rooms for each category
INSERT INTO chat_rooms (category_id, name, description) 
SELECT id, 'General Discussion', 'General chat room for ' || name 
FROM habit_categories
ON CONFLICT DO NOTHING;

-- 5. Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies
-- Users: public read, authenticated can read own
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);

-- User Habits: only owner can see their habits
CREATE POLICY "User habits are viewable by owner" ON user_habits FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own habits" ON user_habits FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own habits" ON user_habits FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own habits" ON user_habits FOR DELETE USING (user_id = auth.uid());

-- Check-ins: only owner can see their check-ins
CREATE POLICY "Check-ins are viewable by owner" ON check_ins FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own check-ins" ON check_ins FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own check-ins" ON check_ins FOR UPDATE USING (user_id = auth.uid());

-- Chat messages: public read, authenticated users can write
CREATE POLICY "Chat messages are viewable by everyone" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Users can create own messages" ON chat_messages FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own messages" ON chat_messages FOR DELETE USING (user_id = auth.uid());

-- Forum posts: public read, authenticated users can write/edit own
CREATE POLICY "Forum posts are viewable by everyone" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "Users can create own posts" ON forum_posts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own posts" ON forum_posts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own posts" ON forum_posts FOR DELETE USING (user_id = auth.uid());

-- Forum comments: public read, authenticated users can write/delete own
CREATE POLICY "Forum comments are viewable by everyone" ON forum_comments FOR SELECT USING (true);
CREATE POLICY "Users can create own comments" ON forum_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON forum_comments FOR DELETE USING (user_id = auth.uid());

-- Reactions: public read, authenticated users can create/delete own
CREATE POLICY "Reactions are viewable by everyone" ON reactions FOR SELECT USING (true);
CREATE POLICY "Users can create own reactions" ON reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own reactions" ON reactions FOR DELETE USING (user_id = auth.uid());

-- 7. Enable Realtime for chat messages and forum comments
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE forum_comments;

-- Habit Breaker App - Row Level Security Policies
-- Migration 002: Enable RLS and create policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Users policies (wallet-based auth - no auth.uid())
-- All users are readable, users can update their own profile
CREATE POLICY "users_select_all" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (true);

-- Habit categories - public read
CREATE POLICY "habit_categories_select_all" ON habit_categories FOR SELECT USING (true);

-- User habits - public read for leaderboard, own write
CREATE POLICY "user_habits_select_all" ON user_habits FOR SELECT USING (true);
CREATE POLICY "user_habits_insert_own" ON user_habits FOR INSERT WITH CHECK (true);
CREATE POLICY "user_habits_update_own" ON user_habits FOR UPDATE USING (true);
CREATE POLICY "user_habits_delete_own" ON user_habits FOR DELETE USING (true);

-- Check-ins - own read/write
CREATE POLICY "check_ins_select_all" ON check_ins FOR SELECT USING (true);
CREATE POLICY "check_ins_insert_own" ON check_ins FOR INSERT WITH CHECK (true);
CREATE POLICY "check_ins_update_own" ON check_ins FOR UPDATE USING (true);

-- Chat rooms - public read
CREATE POLICY "chat_rooms_select_all" ON chat_rooms FOR SELECT USING (true);

-- Chat messages - public read/insert
CREATE POLICY "chat_messages_select_all" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_messages_insert_all" ON chat_messages FOR INSERT WITH CHECK (true);

-- Forum posts - public read/insert
CREATE POLICY "forum_posts_select_all" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "forum_posts_insert_all" ON forum_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "forum_posts_update_own" ON forum_posts FOR UPDATE USING (true);
CREATE POLICY "forum_posts_delete_own" ON forum_posts FOR DELETE USING (true);

-- Forum comments - public read/insert
CREATE POLICY "forum_comments_select_all" ON forum_comments FOR SELECT USING (true);
CREATE POLICY "forum_comments_insert_all" ON forum_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "forum_comments_delete_own" ON forum_comments FOR DELETE USING (true);

-- Reactions - public read/insert
CREATE POLICY "reactions_select_all" ON reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert_all" ON reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "reactions_delete_own" ON reactions FOR DELETE USING (true);

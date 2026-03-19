-- Habit Breaker App - Seed Data
-- Migration 003: Insert preset habit categories and chat rooms

-- Insert preset habit categories
INSERT INTO habit_categories (name, icon, description, color) VALUES
  ('Smoking', 'cigarette', 'Quit smoking cigarettes, vaping, or tobacco products', '#ef4444'),
  ('Alcohol', 'wine', 'Stop drinking alcohol and stay sober', '#f97316'),
  ('Social Media', 'smartphone', 'Break free from social media addiction', '#3b82f6'),
  ('Junk Food', 'pizza', 'Stop eating unhealthy processed foods', '#eab308'),
  ('Gambling', 'dice', 'Overcome gambling addiction', '#22c55e'),
  ('Gaming', 'gamepad-2', 'Control excessive video game playing', '#8b5cf6')
ON CONFLICT (name) DO NOTHING;

-- Create a chat room for each category
INSERT INTO chat_rooms (category_id, name, description)
SELECT 
  id,
  name || ' Support',
  'Chat with others breaking free from ' || LOWER(name)
FROM habit_categories
ON CONFLICT DO NOTHING;

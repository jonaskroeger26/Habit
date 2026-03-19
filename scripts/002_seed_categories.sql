-- Seed data for habit categories

INSERT INTO habit_categories (name, icon, description, color) VALUES
  ('Smoking', '🚭', 'Quit smoking and tobacco use', '#FF6B6B'),
  ('Alcohol', '🍷', 'Reduce or quit alcohol consumption', '#4ECDC4'),
  ('Social Media', '📱', 'Limit or quit social media scrolling', '#95E1D3'),
  ('Junk Food', '🍕', 'Eat healthier, reduce junk food', '#F38181'),
  ('Gambling', '🎲', 'Stop or reduce gambling habits', '#AA96DA'),
  ('Pornography', '🔒', 'Quit pornography addiction', '#FCBAD3'),
  ('Procrastination', '⏰', 'Stop procrastinating and start tasks', '#A8E6CF'),
  ('Sugar Addiction', '🍬', 'Reduce sugar intake', '#FFD3B6')
ON CONFLICT (name) DO NOTHING;

-- Create chat rooms for each category
INSERT INTO chat_rooms (category_id, name, description) 
SELECT id, name || ' Support Group', 'Real-time support chat for ' || name FROM habit_categories
ON CONFLICT DO NOTHING;

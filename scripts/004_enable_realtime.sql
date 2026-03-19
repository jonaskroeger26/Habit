-- Habit Breaker App - Enable Realtime
-- Migration 004: Enable realtime for chat messages

-- Enable realtime for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

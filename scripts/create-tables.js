import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('Creating tables...');
  
  try {
    // Create users table
    const { error: usersError } = await supabase.from('users').select().limit(1);
    if (usersError && usersError.code === 'PGRST116') {
      console.log('Creating users table...');
      const { error } = await supabase.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            wallet_address TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            current_streak INTEGER DEFAULT 0,
            best_streak INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      if (error) console.error('Users table error:', error);
    }

    // Create chat_rooms table
    const { error: roomsError } = await supabase.from('chat_rooms').select().limit(1);
    if (roomsError && roomsError.code === 'PGRST116') {
      console.log('Creating chat_rooms table...');
      const { error } = await supabase.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS chat_rooms (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      if (error) console.error('Chat rooms table error:', error);
    }

    // Create chat_messages table
    const { error: messagesError } = await supabase.from('chat_messages').select().limit(1);
    if (messagesError && messagesError.code === 'PGRST116') {
      console.log('Creating chat_messages table...');
      const { error } = await supabase.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS chat_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            room_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            user_display_name TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      if (error) console.error('Chat messages table error:', error);
    }

    console.log('Tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

createTables();

-- Add wallet_address to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

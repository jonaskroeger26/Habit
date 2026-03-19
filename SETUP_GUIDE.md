# Habit Breaker App - Setup Guide

## Overview
Habit Breaker is a community-driven platform for breaking bad habits using Solana wallet authentication and Supabase for data storage. Users can track progress, connect with others, participate in real-time chat, and compete on leaderboards.

## Prerequisites
- Node.js 18+ and pnpm
- A Supabase account
- A Solana wallet (Phantom or Solflare)

## Setup Instructions

### 1. Environment Variables
Create a `.env.local` file in the project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase dashboard under Settings > API.

### 2. Database Setup
Copy all the SQL from `DATABASE_SETUP.sql` and execute it in your Supabase SQL Editor:

1. Go to your Supabase project
2. Click "SQL Editor" in the left sidebar
3. Create a new query and paste the contents of `DATABASE_SETUP.sql`
4. Click "Run"

This will create:
- **users** - User profiles linked to wallet addresses
- **habit_categories** - Predefined habit types (Smoking, Alcohol, etc.)
- **user_habits** - Individual habits tracked by each user
- **check_ins** - Daily check-in records for tracking streaks
- **chat_rooms** - Chat rooms for each habit category
- **chat_messages** - Messages in chat rooms (real-time)
- **forum_posts** - Discussion forum posts
- **forum_comments** - Comments on forum posts (real-time)
- **reactions** - Emoji reactions on posts/comments

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Run Development Server
```bash
pnpm dev
```

Visit `http://localhost:3000` in your browser.

## Architecture

### Authentication Flow
1. User connects Solana wallet (Phantom/Solflare)
2. Wallet address becomes the unique identifier
3. System attempts to sign in with wallet address
4. If user doesn't exist, automatically creates new account
5. User is redirected to dashboard

### Database Design
- **Row Level Security (RLS)** ensures users can only access their own private data
- **Realtime subscriptions** on chat_messages and forum_comments for live updates
- **Check-ins** track daily progress with automatic streak calculation
- **Reactions** system for engagement (fire 🔥, heart ❤️, clap 👏, strong 💪)

### Features

#### 1. Habit Tracking
- Support for preset categories and custom habits
- Multiple habits per user
- Daily check-in system
- Automatic streak calculation

#### 2. Community Chat
- Real-time chat rooms per habit category
- Persistent message history
- User engagement and support

#### 3. Forum Discussions
- Create discussion posts
- Comment on others' posts
- Emoji reactions (fire, heart, clap, strong)

#### 4. Leaderboards
- Streak-based ranking
- Filtered by habit category
- Competition for motivation

## File Structure

```
app/
├── layout.tsx                 # Root layout with Solana provider
├── page.tsx                   # Landing page
├── dashboard/                 # Dashboard page (protected)
├── habits/                    # Habit tracking pages
├── community/                 # Chat and forum pages
└── leaderboard/              # Leaderboard page

components/
├── auth/
│   └── wallet-button.tsx     # Solana wallet connection
├── habits/                    # Habit components
├── community/                 # Chat/forum components
└── leaderboard/              # Leaderboard components

lib/
├── auth/
│   └── solana-auth.ts        # Solana auth utilities
├── supabase/
│   ├── client.ts             # Client-side Supabase
│   └── server.ts             # Server-side Supabase
└── solana/
    └── wallet-provider.tsx   # Solana wallet context

DATABASE_SETUP.sql            # Complete database schema
```

## Key Technologies

- **Next.js 16** - React framework with App Router
- **Solana Web3.js** - Blockchain integration
- **Wallet Adapter** - Multi-wallet support (Phantom, Solflare)
- **Supabase** - PostgreSQL database with auth
- **Tailwind CSS** - Styling
- **Lucide Icons** - UI icons
- **SWR** - Data fetching and caching

## Development Notes

- All user data is scoped to their wallet address
- Check-ins are time-gated to prevent gaming the system
- Real-time features use Supabase Realtime subscriptions
- Theme is dark mode by default with purple accent color

## Deployment

### Deploy to Vercel
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel project settings
3. Deploy automatically on every push

### Environment Variables in Production
Make sure to add these in Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Troubleshooting

### "Supabase URL or key not found"
- Check `.env.local` has correct values
- Verify keys are from correct Supabase project
- Make sure env variables are prefixed with `NEXT_PUBLIC_`

### Wallet Connection Issues
- Ensure you have Phantom or Solflare installed
- Check you're on Mainnet (not Devnet)
- Try refreshing the page

### Database Errors
- Verify DATABASE_SETUP.sql executed successfully
- Check Supabase project is active
- Ensure RLS policies are correctly applied

## Next Steps
1. Set up environment variables
2. Execute DATABASE_SETUP.sql in Supabase
3. Run `pnpm dev`
4. Connect wallet and start breaking habits!

## Support
For issues or questions:
- Check Supabase docs: https://supabase.com/docs
- Solana docs: https://docs.solana.com
- Create an issue in the repository

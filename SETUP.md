# PiGenovo 2.0 - Setup & Deployment Guide

## Prerequisites

- Node.js v18+
- npm or yarn
- A Supabase account (https://supabase.com)
- A Google Gemini API key (https://ai.google.dev/)
- A Vercel account (https://vercel.com)

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Initialize Supabase Database

1. Go to your Supabase project dashboard
2. Open **SQL Editor**
3. Create a new query and paste the contents of `supabase_schema.sql`
4. Click **Run** to execute

### 4. Fix Database Relationships (IMPORTANT)

After running the initial schema, you need to add the foreign key relationships for Supabase PostgREST joins to work:

1. Go to **SQL Editor** again
2. Create a new query and paste the contents of `database_migrations.sql`
3. Click **Run** to execute

These foreign keys enable the admin panel and dashboards to properly join related tables.

### 5. Create Initial Settings

Run this SQL in your Supabase editor to set exchange rates:

```sql
INSERT INTO settings (id, value) VALUES (
  'exchange_rates',
  '{"usdt_rwf": 1300, "pi_rwf": 45000}'::jsonb
);
```

### 6. Add Initial News Assets (Optional)

```sql
INSERT INTO news_assets (id, name, description) VALUES
('tech', 'TECH', 'Technology sector news assets'),
('crypto', 'CRYPTO', 'Cryptocurrency news assets'),
('sports', 'SPORTS', 'Sports news assets'),
('politics', 'POLITICS', 'Politics news assets');
```

### 7. Run Development Server

```bash
npm run dev
```

Access at http://localhost:5173

## Deployment on Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Connect to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Click **Continue**

### 3. Configure Environment Variables

In Vercel Project Settings → Environment Variables, add:

- `GEMINI_API_KEY` - Your Google Gemini API key
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### 4. Deploy

Vercel will automatically deploy. Your app will be available at `https://your-project.vercel.app`

## Important: Database Setup

⚠️ **Make sure to run BOTH SQL files in your Supabase dashboard:**

1. **supabase_schema.sql** - Creates all tables and policies
2. **database_migrations.sql** - Adds foreign key relationships

Without the relationships, admin features may not work properly.

## Project Structure

```
pigenovo-2.0/
├── src/
│   ├── components/
│   │   ├── Auth.tsx              # Authentication UI
│   │   ├── Dashboard.tsx          # Main dashboard container
│   │   ├── AdminPanel.tsx         # Admin management panel
│   │   ├── TradingExchange.tsx    # News asset trading
│   │   ├── WatchEarn.tsx          # Task earning system
│   │   ├── Wallet.tsx             # Wallet management
│   │   ├── AIAssistant.tsx        # Gemini AI chat
│   │   └── ui/                    # shadcn/ui components
│   ├── App.tsx                    # Main app router
│   ├── main.tsx                   # React entry point
│   └── supabaseClient.js          # Supabase client config
├── server.ts                      # Express backend
├── supabase_schema.sql            # Database schema
├── database_migrations.sql        # Foreign key relationships
├── vercel.json                    # Vercel SPA routing config
└── package.json                   # Dependencies

```

## Features

1. **Authentication** - Email, phone OTP, and Google OAuth
2. **Trading** - Real-time news asset candlestick charts
3. **Watch & Earn** - Complete tasks for rewards
4. **Wallet** - Manage balance, deposits, withdrawals
5. **AI Assistant** - Powered by Google Gemini
6. **Admin Panel** - Complete platform management

## Troubleshooting

### White Screen After Login

Check browser console for errors. Usually caused by missing environment variables.

### 404 Errors on Routes

Verify `vercel.json` is deployed. This file configures SPA routing.

### Supabase 400 Errors

Run `database_migrations.sql` to add the missing foreign key relationships.

### Chart Not Displaying

Check that the `TradingExchange` component has a parent container with defined height.

## Support

For issues or questions, check the Supabase docs and Vercel deployment guide.


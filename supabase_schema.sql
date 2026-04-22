/*
  PiGenovo 2.0 - Database Schema
  Run this in your Supabase SQL Editor
*/

-- 1. Users & Wallets
-- Supabase Auth handles users, but we need a public.profiles table for extra data
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Admin check function
create or replace function is_admin(user_id uuid)
returns boolean as $$
declare
  user_email text;
begin
  -- Get user email from auth.users (if available via current session)
  user_email := auth.jwt() ->> 'email';

  -- Check if user is in profiles with admin role OR has the specific admin email
  return exists (
    select 1 from profiles
    where id = user_id and role = 'admin'
  ) or user_email = 'tmusumeni@gmail.com';
end;
$$ language plpgsql security definer;

create table wallets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  balance decimal(12,2) default 0.00 not null,
  currency text default 'RWF' not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- New Table for financial requests (to sync with code)
create table wallet_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('deposit', 'withdrawal')),
  method text not null,
  amount decimal(12,2) not null,
  currency text not null,
  details jsonb,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Existing Transactions table for legacy/other records
create table transactions (
  id uuid default gen_random_uuid() primary key,
  wallet_id uuid references wallets on delete cascade not null,
  type text not null check (type in ('deposit', 'withdrawal', 'reward', 'trade_buy', 'trade_sell')),
  amount decimal(12,2) not null,
  status text default 'completed' check (status in ('pending', 'completed', 'failed')),
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Watch & Earn
create table earn_tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  platform text default 'youtube' check (platform in ('whatsapp', 'x', 'tiktok', 'youtube')),
  task_url text not null,
  reward_amount decimal(12,2) default 100.00 not null,
  is_active boolean default true,
  requirements text, -- e.g. "Subscribe, Like, Watch 3min"
  proof_image_url text, -- For WhatsApp: example proof image uploaded by admin
  proof_link text, -- For WhatsApp: example proof link or instructions
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table proofs (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references earn_tasks on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  image_url text not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3.5 Share & Earn (WhatsApp Status Ads)
create table ads (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  image_url text not null, -- Ad image to post on WhatsApp status
  link text not null, -- Link/promotion URL
  reward_amount decimal(12,2) default 200.00 not null,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table ad_shares (
  id uuid default gen_random_uuid() primary key,
  ad_id uuid references ads on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  proof_image_url text, -- Screenshot proof that user posted on status
  proof_link text, -- Optional link proof
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default (now() + interval '24 hours'),
  unique(ad_id, user_id) -- User can only share each ad once
);

-- 4. News Trading
create table news_assets (
  id text primary key, -- e.g., 'tech', 'crypto'
  name text not null,
  description text
);

create table trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  asset_id text references news_assets not null,
  type text not null check (type in ('buy', 'sell')),
  amount decimal(12,2) not null, -- amount in RWF
  asset_quantity decimal(18,8) not null,
  price_at_trade decimal(12,2) not null,
  fee decimal(12,2) default 0.00,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table profiles enable row level security;
alter table wallets enable row level security;
alter table transactions enable row level security;
alter table tasks enable row level security;
alter table proofs enable row level security;
alter table ads enable row level security;
alter table ad_shares enable row level security;
alter table news_assets enable row level security;
alter table trades enable row level security;

-- Basic Policies (Owner access + Admin access)
create policy "Users can view their own profile" on profiles for select using (auth.uid() = id or is_admin(auth.uid()));
create policy "Admins can update profiles" on profiles for update using (is_admin(auth.uid()));

create policy "Users can view their own wallet" on wallets for select using (auth.uid() = user_id or is_admin(auth.uid()));
create policy "Admins can update wallets" on wallets for update using (is_admin(auth.uid()));
create policy "Admins can insert wallets" on wallets for insert with check (is_admin(auth.uid()));

create policy "Users can view their own transactions" on transactions for select using (
  wallet_id in (select id from wallets where user_id = auth.uid()) or is_admin(auth.uid())
);

create policy "Users can view their own wallet_transactions" on wallet_transactions for select using (auth.uid() = user_id or is_admin(auth.uid()));
create policy "Users can insert their own wallet_transactions" on wallet_transactions for insert with check (auth.uid() = user_id);
create policy "Admins can update wallet_transactions" on wallet_transactions for update using (is_admin(auth.uid()));

create policy "Users can view active tasks" on earn_tasks for select using (is_active = true or is_admin(auth.uid()));
create policy "Admins can manage tasks" on earn_tasks for all using (is_admin(auth.uid()));

create policy "Users can view their own proofs" on proofs for select using (auth.uid() = user_id or is_admin(auth.uid()));
create policy "Users can insert their own proofs" on proofs for insert with check (auth.uid() = user_id);
create policy "Admins can update proofs" on proofs for update using (is_admin(auth.uid()));

create policy "Users can view active ads" on ads for select using (is_active = true or is_admin(auth.uid()));
create policy "Admins can manage ads" on ads for all using (is_admin(auth.uid()));

create policy "Users can view their own ad shares" on ad_shares for select using (auth.uid() = user_id or is_admin(auth.uid()));
create policy "Users can insert their own ad shares" on ad_shares for insert with check (auth.uid() = user_id);
create policy "Admins can update ad shares" on ad_shares for update using (is_admin(auth.uid()));

create policy "Anyone can view news assets" on news_assets for select using (true);
create policy "Admins can manage assets" on news_assets for all using (is_admin(auth.uid()));

create policy "Users can view their own trades" on trades for select using (auth.uid() = user_id or is_admin(auth.uid()));
create policy "Users can insert their own trades" on trades for insert with check (auth.uid() = user_id);

-- Trigger to create profile and wallet on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  
  insert into public.wallets (user_id, balance)
  values (new.id, 0.00);
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to credit wallet when proof is approved
create or replace function public.handle_proof_approved()
returns trigger as $$
declare
  task_reward decimal(12,2);
  user_wallet_id uuid;
begin
  -- Only execute if status changed to 'approved'
  if new.status = 'approved' and old.status != 'approved' then
    -- Get the reward amount from the task
    select reward_amount into task_reward from earn_tasks where id = new.task_id;
    
    -- Get the user's wallet
    select id into user_wallet_id from wallets where user_id = new.user_id;
    
    if user_wallet_id is not null and task_reward > 0 then
      -- Update wallet balance
      update wallets 
      set balance = balance + task_reward,
          updated_at = now()
      where id = user_wallet_id;
      
      -- Create transaction record
      insert into transactions (wallet_id, type, amount, status, description)
      values (user_wallet_id, 'reward', task_reward, 'completed', 'Watch & Earn reward - Proof approved');
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_proof_approved
  after update on proofs
  for each row execute procedure public.handle_proof_approved();

-- Trigger to credit wallet when ad share is approved
create or replace function public.handle_ad_share_approved()
returns trigger as $$
declare
  ad_reward decimal(12,2);
  user_wallet_id uuid;
begin
  -- Only execute if status changed to 'approved'
  if new.status = 'approved' and old.status != 'approved' then
    -- Get the reward amount from the ad
    select reward_amount into ad_reward from ads where id = new.ad_id;
    
    -- Get the user's wallet
    select id into user_wallet_id from wallets where user_id = new.user_id;
    
    if user_wallet_id is not null and ad_reward > 0 then
      -- Update wallet balance
      update wallets 
      set balance = balance + ad_reward,
          updated_at = now()
      where id = user_wallet_id;
      
      -- Create transaction record
      insert into transactions (wallet_id, type, amount, status, description)
      values (user_wallet_id, 'reward', ad_reward, 'completed', 'Share & Earn reward - Ad share approved');
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_ad_share_approved
  after update on ad_shares
  for each row execute procedure public.handle_ad_share_approved();

-- ======== STORAGE BUCKET POLICIES ========
-- Run this section in your Supabase SQL Editor

-- First, ensure the 'proofs' bucket exists with RLS enabled
INSERT INTO storage.buckets (id, name, public, avif_autodetection) 
VALUES ('proofs', 'proofs', false, false) 
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to proofs bucket
CREATE POLICY "Allow authenticated users to upload proofs"
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'proofs');

-- Allow users to view all proofs (admins verify via database)
CREATE POLICY "Allow authenticated users to view proofs"
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'proofs');

-- Allow admins to delete proofs
CREATE POLICY "Allow admins to delete proofs"
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'proofs' AND 
  auth.jwt() ->> 'email' = 'tmusumeni@gmail.com'
);

/* 
  Migration Script: Add Share & Earn Ads Tables
  Run this in your Supabase SQL Editor if you already have the database schema
*/

-- Create ads table
CREATE TABLE IF NOT EXISTS ads (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  image_url text not null,
  link text not null,
  reward_amount decimal(12,2) default 200.00 not null,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create ad_shares table
CREATE TABLE IF NOT EXISTS ad_shares (
  id uuid default gen_random_uuid() primary key,
  ad_id uuid references ads on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  proof_image_url text,
  proof_link text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default (now() + interval '24 hours'),
  unique(ad_id, user_id)
);

-- Enable RLS
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_shares ENABLE ROW LEVEL SECURITY;

-- Policies for ads
CREATE POLICY "Users can view active ads" ON ads FOR SELECT USING (is_active = true OR auth.jwt() ->> 'email' = 'tmusumeni@gmail.com');
CREATE POLICY "Admins can manage ads" ON ads FOR ALL USING (auth.jwt() ->> 'email' = 'tmusumeni@gmail.com');

-- Policies for ad_shares
CREATE POLICY "Users can view their own ad shares" ON ad_shares FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'tmusumeni@gmail.com');
CREATE POLICY "Users can insert their own ad shares" ON ad_shares FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update ad shares" ON ad_shares FOR UPDATE USING (auth.jwt() ->> 'email' = 'tmusumeni@gmail.com');

-- Create trigger function for ad share approvals
CREATE OR REPLACE FUNCTION public.handle_ad_share_approved()
RETURNS trigger AS $$
DECLARE
  ad_reward decimal(12,2);
  user_wallet_id uuid;
BEGIN
  IF new.status = 'approved' AND old.status != 'approved' THEN
    SELECT reward_amount INTO ad_reward FROM ads WHERE id = new.ad_id;
    SELECT id INTO user_wallet_id FROM wallets WHERE user_id = new.user_id;
    
    IF user_wallet_id IS NOT NULL AND ad_reward > 0 THEN
      UPDATE wallets 
      SET balance = balance + ad_reward,
          updated_at = now()
      WHERE id = user_wallet_id;
      
      INSERT INTO transactions (wallet_id, type, amount, status, description)
      VALUES (user_wallet_id, 'reward', ad_reward, 'completed', 'Share & Earn reward - Ad share approved');
    END IF;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_ad_share_approved ON ad_shares;
CREATE TRIGGER on_ad_share_approved
  AFTER UPDATE ON ad_shares
  FOR EACH ROW EXECUTE PROCEDURE public.handle_ad_share_approved();

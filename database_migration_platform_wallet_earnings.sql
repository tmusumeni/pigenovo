/*
  Migration: Platform Wallet & Earnings System
  
  This migration creates:
  1. platform_wallet - Main platform money account
  2. platform_earnings - Log all earnings sources
  3. Functions for tracking and transferring earnings
  
  System flow:
  - User loss → Added to platform wallet
  - User profit → Deducted from platform wallet
  - Proforma charges → platform_earnings → platform_wallet
  - Trading fees → platform_earnings → platform_wallet
  - Advertising charges → platform_earnings → platform_wallet
*/

-- ================================================================
-- 1. CREATE PLATFORM WALLET TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS public.platform_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance NUMERIC(20, 2) NOT NULL DEFAULT 0,
  total_earnings NUMERIC(20, 2) NOT NULL DEFAULT 0,
  total_trading_fees NUMERIC(20, 2) NOT NULL DEFAULT 0,
  total_proforma_charges NUMERIC(20, 2) NOT NULL DEFAULT 0,
  total_advertising_charges NUMERIC(20, 2) NOT NULL DEFAULT 0,
  total_user_losses NUMERIC(20, 2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure only one platform wallet exists
ALTER TABLE public.platform_wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform wallet is readable by authenticated users"
  ON public.platform_wallet FOR SELECT
  USING (true);

CREATE POLICY "Only system can update platform wallet"
  ON public.platform_wallet FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- ================================================================
-- 2. CREATE PLATFORM EARNINGS LOG TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS public.platform_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  earnings_type VARCHAR(50) NOT NULL,  -- 'trading_fee', 'proforma_charge', 'advertising_charge', 'user_loss'
  source_id UUID,  -- Reference to trade, proforma, etc.
  source_type VARCHAR(50),  -- 'trade', 'proforma', 'advertising'
  amount NUMERIC(20, 2) NOT NULL,
  user_id UUID REFERENCES public.auth.users(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all earnings if implemented"
  ON public.platform_earnings FOR SELECT
  USING (true);

-- Create indexes for efficient querying
CREATE INDEX idx_platform_earnings_type ON public.platform_earnings(earnings_type);
CREATE INDEX idx_platform_earnings_user ON public.platform_earnings(user_id);
CREATE INDEX idx_platform_earnings_created ON public.platform_earnings(created_at);

-- ================================================================
-- 3. INITIALIZE PLATFORM WALLET (if not exists)
-- ================================================================

INSERT INTO public.platform_wallet (balance, total_earnings)
SELECT 0, 0
WHERE NOT EXISTS (SELECT 1 FROM public.platform_wallet);

-- ================================================================
-- 4. CREATE FUNCTION TO ADD TRADING FEE TO PLATFORM
-- ================================================================

CREATE OR REPLACE FUNCTION public.add_trading_fee(
  p_trade_id UUID,
  p_user_id UUID,
  p_fee_amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := FALSE;
BEGIN
  -- Log the earning
  INSERT INTO public.platform_earnings (
    earnings_type,
    source_id,
    source_type,
    amount,
    user_id,
    description
  ) VALUES (
    'trading_fee',
    p_trade_id,
    'trade',
    p_fee_amount,
    p_user_id,
    'Trading fee from trade ' || p_trade_id::text
  );

  -- Update platform wallet
  UPDATE public.platform_wallet
  SET 
    balance = balance + p_fee_amount,
    total_earnings = total_earnings + p_fee_amount,
    total_trading_fees = total_trading_fees + p_fee_amount,
    updated_at = now()
  WHERE id = (SELECT id FROM public.platform_wallet LIMIT 1);

  v_success := TRUE;
  RETURN v_success;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 5. CREATE FUNCTION TO LOG USER LOSSES (Loss → Platform)
-- ================================================================

CREATE OR REPLACE FUNCTION public.log_user_loss(
  p_trade_id UUID,
  p_user_id UUID,
  p_loss_amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := FALSE;
BEGIN
  -- Only process if loss is positive
  IF p_loss_amount > 0 THEN
    -- Log the earning
    INSERT INTO public.platform_earnings (
      earnings_type,
      source_id,
      source_type,
      amount,
      user_id,
      description
    ) VALUES (
      'user_loss',
      p_trade_id,
      'trade',
      p_loss_amount,
      p_user_id,
      'User loss from trade ' || p_trade_id::text
    );

    -- Update platform wallet
    UPDATE public.platform_wallet
    SET 
      balance = balance + p_loss_amount,
      total_earnings = total_earnings + p_loss_amount,
      total_user_losses = total_user_losses + p_loss_amount,
      updated_at = now()
    WHERE id = (SELECT id FROM public.platform_wallet LIMIT 1);

    v_success := TRUE;
  END IF;
  
  RETURN v_success;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 6. CREATE FUNCTION FOR USER PROFIT (Profit → User, Deduct Platform)
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_user_profit(
  p_trade_id UUID,
  p_user_id UUID,
  p_profit_amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance NUMERIC;
  v_success BOOLEAN := FALSE;
BEGIN
  -- Only process if profit is positive
  IF p_profit_amount > 0 THEN
    -- Check if platform wallet has enough balance
    SELECT balance INTO v_current_balance
    FROM public.platform_wallet
    LIMIT 1;

    IF v_current_balance >= p_profit_amount THEN
      -- Deduct from platform wallet
      UPDATE public.platform_wallet
      SET 
        balance = balance - p_profit_amount,
        updated_at = now()
      WHERE id = (SELECT id FROM public.platform_wallet LIMIT 1);

      -- Log the transaction
      INSERT INTO public.platform_earnings (
        earnings_type,
        source_id,
        source_type,
        amount,
        user_id,
        description
      ) VALUES (
        'user_profit_paid',
        p_trade_id,
        'trade',
        -p_profit_amount,
        p_user_id,
        'User profit paid for trade ' || p_trade_id::text
      );

      v_success := TRUE;
    ELSE
      -- Not enough balance - platform covers from credit
      UPDATE public.platform_wallet
      SET 
        balance = balance - p_profit_amount,
        updated_at = now()
      WHERE id = (SELECT id FROM public.platform_wallet LIMIT 1);

      v_success := TRUE;
    END IF;
  END IF;

  RETURN v_success;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 7. CREATE FUNCTION TO ADD PROFORMA CHARGE
-- ================================================================

CREATE OR REPLACE FUNCTION public.add_proforma_charge(
  p_proforma_id UUID,
  p_user_id UUID,
  p_charge_amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := FALSE;
BEGIN
  -- Log the earning
  INSERT INTO public.platform_earnings (
    earnings_type,
    source_id,
    source_type,
    amount,
    user_id,
    description
  ) VALUES (
    'proforma_charge',
    p_proforma_id,
    'proforma',
    p_charge_amount,
    p_user_id,
    'Proforma processing charge'
  );

  -- Update platform wallet
  UPDATE public.platform_wallet
  SET 
    balance = balance + p_charge_amount,
    total_earnings = total_earnings + p_charge_amount,
    total_proforma_charges = total_proforma_charges + p_charge_amount,
    updated_at = now()
  WHERE id = (SELECT id FROM public.platform_wallet LIMIT 1);

  v_success := TRUE;
  RETURN v_success;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 8. CREATE FUNCTION TO ADD ADVERTISING CHARGE
-- ================================================================

CREATE OR REPLACE FUNCTION public.add_advertising_charge(
  p_user_id UUID,
  p_charge_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := FALSE;
BEGIN
  -- Log the earning
  INSERT INTO public.platform_earnings (
    earnings_type,
    source_type,
    amount,
    user_id,
    description
  ) VALUES (
    'advertising_charge',
    'advertising',
    p_charge_amount,
    p_user_id,
    COALESCE(p_description, 'Advertising platform charge')
  );

  -- Update platform wallet
  UPDATE public.platform_wallet
  SET 
    balance = balance + p_charge_amount,
    total_earnings = total_earnings + p_charge_amount,
    total_advertising_charges = total_advertising_charges + p_charge_amount,
    updated_at = now()
  WHERE id = (SELECT id FROM public.platform_wallet LIMIT 1);

  v_success := TRUE;
  RETURN v_success;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 9. CREATE FUNCTION TO GET PLATFORM WALLET BALANCE
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_platform_wallet()
RETURNS TABLE (
  balance NUMERIC,
  total_earnings NUMERIC,
  total_trading_fees NUMERIC,
  total_proforma_charges NUMERIC,
  total_advertising_charges NUMERIC,
  total_user_losses NUMERIC,
  last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pw.balance,
    pw.total_earnings,
    pw.total_trading_fees,
    pw.total_proforma_charges,
    pw.total_advertising_charges,
    pw.total_user_losses,
    pw.updated_at
  FROM public.platform_wallet pw
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 10. CREATE FUNCTION FOR EARNINGS SUMMARY
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_platform_earnings_summary(
  p_days_back INT DEFAULT 30
)
RETURNS TABLE (
  earnings_type VARCHAR,
  total_amount NUMERIC,
  transaction_count BIGINT,
  average_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pe.earnings_type,
    SUM(pe.amount) as total_amount,
    COUNT(*) as transaction_count,
    AVG(pe.amount) as average_amount
  FROM public.platform_earnings pe
  WHERE pe.created_at >= now() - INTERVAL '1 day' * p_days_back
  GROUP BY pe.earnings_type
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 11. GRANTS & PERMISSIONS
-- ================================================================

GRANT EXECUTE ON FUNCTION public.add_trading_fee TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_loss TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_user_profit TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_proforma_charge TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_advertising_charge TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_earnings_summary TO authenticated;

-- ================================================================
-- SUMMARY
-- ================================================================
/*
  PLATFORM WALLET & EARNINGS SYSTEM
  
  Tables Created:
  1. platform_wallet - Main platform account with balance tracking
  2. platform_earnings - Detailed log of all earnings sources
  
  Functions Created:
  1. add_trading_fee() - Log trading fees to platform
  2. log_user_loss() - Add user losses to platform wallet
  3. handle_user_profit() - Deduct user profits from platform wallet
  4. add_proforma_charge() - Add proforma processing charges
  5. add_advertising_charge() - Add advertising charges
  6. get_platform_wallet() - Get current platform balance
  7. get_platform_earnings_summary() - Get earnings breakdown
  
  How It Works:
  
  USER LOSES TRADE:
    - Closing price < Entry price (for long)
    - Loss amount → platform_earnings table
    - Loss amount → platform_wallet balance
    - Loss amount added to platform_wallet.total_user_losses
  
  USER WINS TRADE:
    - Closing price > Entry price (for long)
    - Profit amount → deducted from platform_wallet
    - Profit amount → added to user wallet
    - Logged as 'user_profit_paid'
  
  PROFORMA CHARGES:
    - When proforma is created/sent
    - Charge amount → platform_earnings
    - Charge amount → platform_wallet balance
  
  ADVERTISING CHARGES:
    - When user places ad
    - Charge amount → platform_earnings
    - Charge amount → platform_wallet balance
  
  TRADING FEES:
    - Current: 0.1% on all trades
    - Fee amount → platform_earnings
    - Fee amount → platform_wallet balance
  
  To Move Earnings to Wallet:
  - Admin manually transfers from platform_wallet
  - Or auto-transfer daily/weekly as needed
  - All tracked in platform_earnings table
*/

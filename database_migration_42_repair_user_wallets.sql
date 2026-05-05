-- Migration 42: Repair all user wallets
-- Purpose: Create missing wallets for all users and normalize null balances

-- Function to repair wallet records for all users
CREATE OR REPLACE FUNCTION public.repair_all_user_wallets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_created integer := 0;
  v_fixed integer := 0;
BEGIN
  -- Create missing wallets for users who don't have one
  INSERT INTO public.wallets (user_id, balance, currency, updated_at)
  SELECT u.id, 0.00, 'RWF', NOW()
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.wallets w WHERE w.user_id = u.id
  );
  GET DIAGNOSTICS v_created = ROW_COUNT;

  -- Normalize any null balances to zero
  UPDATE public.wallets
  SET balance = 0.00,
      updated_at = NOW()
  WHERE balance IS NULL;
  GET DIAGNOSTICS v_fixed = ROW_COUNT;

  RETURN jsonb_build_object(
    'created', v_created,
    'fixed_null_balances', v_fixed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.repair_all_user_wallets() TO authenticated;

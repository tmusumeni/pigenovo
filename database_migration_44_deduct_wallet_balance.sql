-- Migration 44: Add deduct_wallet_balance RPC
-- Purpose: Provide a reusable server-side function to deduct wallet balance and record wallet transactions.

CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(
  p_user_id uuid,
  p_amount numeric,
  p_description text
)
RETURNS jsonb AS $$
DECLARE
  v_wallet RECORD;
BEGIN
  SELECT id, balance, currency
  INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User wallet not found');
  END IF;

  IF v_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;

  UPDATE public.wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    method,
    amount,
    currency,
    details,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    'withdrawal',
    'wallet_charge',
    p_amount,
    COALESCE(v_wallet.currency, 'RWF'),
    jsonb_build_object('description', p_description, 'source', 'deduct_wallet_balance'),
    'approved',
    NOW(),
    NOW()
  );

  RETURN jsonb_build_object('success', true, 'amount', p_amount, 'balance', v_wallet.balance - p_amount, 'currency', v_wallet.currency);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance(uuid, numeric, text) TO authenticated;

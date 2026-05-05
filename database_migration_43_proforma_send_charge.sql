-- Migration 43: Add proforma send charge functionality
-- Purpose: Add setting for charging users when sending proformas and modify send function to deduct charge

-- Add proforma send charge setting
INSERT INTO public.settings (id, value, description, created_at, updated_at)
VALUES (
  'proforma_send_charge',
  '{"charge": 500}',
  'Charge amount in RWF deducted from sender wallet when sending proformas',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Update the send_proforma_to_receiver_v2 function to deduct charge from sender wallet
CREATE OR REPLACE FUNCTION public.send_proforma_to_receiver_v2(
  p_proforma_id uuid,
  p_sender_user_id uuid,
  p_receiver_email text
)
RETURNS json AS $$
DECLARE
  v_receiver_user_id uuid;
  v_proforma_record proformas%ROWTYPE;
  v_recipient_id uuid;
  v_send_charge numeric := 500; -- Default charge
  v_sender_wallet wallets%ROWTYPE;
BEGIN
  -- Get send charge from settings
  SELECT (value->>'charge')::numeric INTO v_send_charge
  FROM public.settings
  WHERE id = 'proforma_send_charge'
  LIMIT 1;

  -- If no setting found, use default
  IF v_send_charge IS NULL THEN
    v_send_charge := 500;
  END IF;

  -- Get sender wallet and check balance
  SELECT * INTO v_sender_wallet FROM public.wallets
  WHERE user_id = p_sender_user_id;

  IF v_sender_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender wallet not found. Please contact support.');
  END IF;

  IF v_sender_wallet.balance < v_send_charge THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient wallet balance. Need ' || v_send_charge || ' RWF to send proforma.');
  END IF;

  -- Get proforma
  SELECT * INTO v_proforma_record FROM proformas
  WHERE id = p_proforma_id AND user_id = p_sender_user_id AND status = 'draft';

  IF v_proforma_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Proforma not found or already sent');
  END IF;

  -- Find receiver user ID by email in auth.users
  SELECT id INTO v_receiver_user_id FROM auth.users
  WHERE email = p_receiver_email
  LIMIT 1;

  IF v_receiver_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User with email ' || p_receiver_email || ' not found. They must register first.');
  END IF;

  -- Check if recipient already exists
  SELECT id INTO v_recipient_id FROM proforma_recipients
  WHERE proforma_id = p_proforma_id AND receiver_user_id = v_receiver_user_id;

  IF v_recipient_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'This proforma has already been sent to ' || p_receiver_email);
  END IF;

  -- Deduct charge from sender wallet
  UPDATE public.wallets
  SET balance = balance - v_send_charge,
      updated_at = NOW()
  WHERE user_id = p_sender_user_id;

  -- Record the transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    description,
    reference_type,
    reference_id,
    created_at
  ) VALUES (
    p_sender_user_id,
    'debit',
    v_send_charge,
    'Proforma send charge - ' || v_proforma_record.number,
    'proforma_send',
    p_proforma_id,
    NOW()
  );

  -- Create recipient record and update proforma status
  INSERT INTO proforma_recipients (proforma_id, receiver_user_id, sent_date, status)
  VALUES (p_proforma_id, v_receiver_user_id, NOW(), 'pending')
  RETURNING id INTO v_recipient_id;

  -- Update proforma status to 'sent'
  UPDATE proformas
  SET status = 'sent'
  WHERE id = p_proforma_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Proforma sent successfully',
    'recipient_id', v_recipient_id,
    'receiver_email', p_receiver_email,
    'charge_deducted', v_send_charge
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.send_proforma_to_receiver_v2 TO authenticated;
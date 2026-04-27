/*
  Migration 23: Proforma Recipients Table
  
  This is the CLEAN solution for receiver visibility.
  Instead of using client_user_id on proformas, we create a separate
  proforma_recipients table that explicitly lists who can see each proforma.
  
  Benefits:
  - Multiple recipients per proforma possible
  - No RLS conflicts
  - Simple queries
  - Clear permissions
*/

-- ============================================================================
-- TABLE: Proforma Recipients (Receivers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proforma_recipients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proforma_id uuid NOT NULL REFERENCES public.proformas(id) ON DELETE CASCADE,
  receiver_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_date timestamp DEFAULT NOW(),
  viewed_date timestamp,
  status text DEFAULT 'pending', -- pending, accepted, rejected, converted
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_proforma_recipients_receiver ON public.proforma_recipients(receiver_user_id);
CREATE INDEX IF NOT EXISTS idx_proforma_recipients_proforma ON public.proforma_recipients(proforma_id);
CREATE INDEX IF NOT EXISTS idx_proforma_recipients_status ON public.proforma_recipients(status);

-- ============================================================================
-- RLC POLICIES FOR PROFORMA_RECIPIENTS TABLE
-- ============================================================================

-- Enable RLS on proforma_recipients
ALTER TABLE public.proforma_recipients ENABLE ROW LEVEL SECURITY;

-- Allow users to view their received proformas (as receiver)
CREATE POLICY "Users can view their received proformas"
  ON public.proforma_recipients
  FOR SELECT
  USING (auth.uid() = receiver_user_id);

-- Allow senders to view who they sent proformas to (for tracking)
CREATE POLICY "Senders can view their sent proformas recipients"
  ON public.proforma_recipients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.proformas
      WHERE proformas.id = proforma_recipients.proforma_id
      AND proformas.user_id = auth.uid()
    )
  );

-- Allow RPC functions to insert (with SECURITY DEFINER, this won't be used but kept for clarity)
CREATE POLICY "RPC functions can insert recipients"
  ON public.proforma_recipients
  FOR INSERT
  WITH CHECK (true);

-- Allow RPC functions to update (with SECURITY DEFINER)
CREATE POLICY "RPC functions can update recipients"
  ON public.proforma_recipients
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RPC FUNCTION: Send proforma to receiver (NEW VERSION)
-- ============================================================================

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
BEGIN
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
    'receiver_email', p_receiver_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC FUNCTION: Receiver accept proforma (NEW VERSION)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recipient_accept_proforma(
  p_proforma_id uuid,
  p_receiver_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_recipient_record proforma_recipients%ROWTYPE;
BEGIN
  -- Get recipient record
  SELECT * INTO v_recipient_record FROM proforma_recipients 
  WHERE proforma_id = p_proforma_id AND receiver_user_id = p_receiver_user_id;
  
  IF v_recipient_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'You are not authorized to accept this proforma');
  END IF;
  
  -- Update recipient status
  UPDATE proforma_recipients 
  SET 
    status = 'accepted',
    viewed_date = NOW(),
    updated_at = NOW()
  WHERE id = v_recipient_record.id;
  
  -- Update proforma status to accepted
  UPDATE proformas 
  SET status = 'accepted'
  WHERE id = p_proforma_id;
  
  RETURN json_build_object('success', true, 'message', 'Proforma accepted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC FUNCTION: Receiver reject proforma (NEW VERSION)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recipient_reject_proforma(
  p_proforma_id uuid,
  p_receiver_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_recipient_record proforma_recipients%ROWTYPE;
BEGIN
  -- Get recipient record
  SELECT * INTO v_recipient_record FROM proforma_recipients 
  WHERE proforma_id = p_proforma_id AND receiver_user_id = p_receiver_user_id;
  
  IF v_recipient_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'You are not authorized to reject this proforma');
  END IF;
  
  -- Update recipient status
  UPDATE proforma_recipients 
  SET 
    status = 'rejected',
    viewed_date = NOW(),
    updated_at = NOW()
  WHERE id = v_recipient_record.id;
  
  -- Update proforma status to rejected
  UPDATE proformas 
  SET status = 'rejected'
  WHERE id = p_proforma_id;
  
  RETURN json_build_object('success', true, 'message', 'Proforma rejected');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SIMPLE SELECT: Get proformas received by current user (WITH ALL FIELDS)
-- ============================================================================
-- Usage: SELECT * FROM get_received_proformas('user-uuid-here');

DROP FUNCTION IF EXISTS public.get_received_proformas(uuid);

CREATE OR REPLACE FUNCTION public.get_received_proformas(p_receiver_user_id uuid)
RETURNS TABLE (
  id uuid,
  number text,
  client_name text,
  client_email text,
  client_phone text,
  description text,
  amount numeric,
  currency text,
  proforma_date timestamp,
  valid_until timestamp,
  tax_rate numeric,
  discount_rate numeric,
  tax_amount numeric,
  discount_amount numeric,
  total_amount numeric,
  status text,
  user_id uuid,
  sent_date timestamp,
  viewed_date timestamp,
  recipient_status text,
  created_at timestamp
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.number,
    p.client_name,
    p.client_email,
    p.client_phone,
    p.description,
    p.amount,
    p.currency,
    p.proforma_date,
    p.valid_until,
    p.tax_rate,
    p.discount_rate,
    p.tax_amount,
    p.discount_amount,
    p.total_amount,
    p.status,
    p.user_id,
    pr.sent_date,
    pr.viewed_date,
    pr.status as recipient_status,
    p.created_at
  FROM proformas p
  INNER JOIN proforma_recipients pr ON p.id = pr.proforma_id
  WHERE pr.receiver_user_id = p_receiver_user_id
  ORDER BY pr.sent_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION send_proforma_to_receiver_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION recipient_accept_proforma TO authenticated;
GRANT EXECUTE ON FUNCTION recipient_reject_proforma TO authenticated;
GRANT EXECUTE ON FUNCTION get_received_proformas TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE proforma_recipients IS 'Explicitly tracks who can see/access each proforma';
COMMENT ON COLUMN proforma_recipients.status IS 'pending, accepted, rejected, or converted';

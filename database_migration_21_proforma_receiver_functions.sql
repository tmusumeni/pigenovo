/*
  Migration 21: RPC Functions for Proforma Receiver Management
  - Find or create receiver account by email
  - Send proforma to receiver
  - Permissions check for accept/reject
  Run this in your Supabase SQL Editor
*/

-- Function to find or get user ID by email (searches profiles table)
CREATE OR REPLACE FUNCTION find_user_by_email(p_email text)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Search in profiles table
  SELECT id INTO v_user_id FROM profiles
  WHERE email = p_email AND role = 'user'
  LIMIT 1;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send proforma to receiver (updates proforma with receiver info)
CREATE OR REPLACE FUNCTION send_proforma_to_receiver(
  p_proforma_id uuid,
  p_sender_user_id uuid,
  p_receiver_email text
)
RETURNS uuid AS $$
DECLARE
  v_receiver_user_id uuid;
  v_proforma_record proformas%ROWTYPE;
BEGIN
  -- Get proforma
  SELECT * INTO v_proforma_record FROM proformas 
  WHERE id = p_proforma_id AND user_id = p_sender_user_id AND status = 'draft';
  
  IF v_proforma_record IS NULL THEN
    RAISE EXCEPTION 'Proforma not found or already sent';
  END IF;
  
  -- Find receiver user ID by email
  SELECT find_user_by_email(p_receiver_email) INTO v_receiver_user_id;
  
  IF v_receiver_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email %s not found. They must register first.', p_receiver_email;
  END IF;
  
  -- Update proforma with receiver and sent status
  UPDATE proformas 
  SET 
    status = 'sent',
    client_user_id = v_receiver_user_id,
    sent_date = NOW()
  WHERE id = p_proforma_id;
  
  RETURN p_proforma_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept proforma (only receiver can do this)
CREATE OR REPLACE FUNCTION receiver_accept_proforma(
  p_proforma_id uuid,
  p_receiver_user_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_proforma_record proformas%ROWTYPE;
BEGIN
  -- Get proforma and verify receiver is the one accepting
  SELECT * INTO v_proforma_record FROM proformas 
  WHERE id = p_proforma_id AND client_user_id = p_receiver_user_id AND status = 'sent';
  
  IF v_proforma_record IS NULL THEN
    RAISE EXCEPTION 'Proforma not found or you are not authorized to accept it';
  END IF;
  
  -- Mark as accepted by receiver
  UPDATE proformas 
  SET 
    status = 'accepted',
    viewed_by_client = true
  WHERE id = p_proforma_id;
  
  RETURN p_proforma_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject proforma (only receiver can do this)
CREATE OR REPLACE FUNCTION receiver_reject_proforma(
  p_proforma_id uuid,
  p_receiver_user_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_proforma_record proformas%ROWTYPE;
BEGIN
  -- Get proforma and verify receiver is the one rejecting
  SELECT * INTO v_proforma_record FROM proformas 
  WHERE id = p_proforma_id AND client_user_id = p_receiver_user_id AND status = 'sent';
  
  IF v_proforma_record IS NULL THEN
    RAISE EXCEPTION 'Proforma not found or you are not authorized to reject it';
  END IF;
  
  -- Mark as rejected by receiver
  UPDATE proformas 
  SET 
    status = 'rejected',
    viewed_by_client = true
  WHERE id = p_proforma_id;
  
  RETURN p_proforma_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

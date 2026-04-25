/*
  Migration 22: Email Notification System for Proformas
  
  This migration creates:
  1. Email notification logs table
  2. RPC functions to send notifications
  3. Triggers to log notification events
  
  NOTE: For email sending, you need to set up one of these:
  - Supabase Edge Functions (recommended)
  - Resend (email service) API integration
  - SendGrid API integration
  - Gmail SMTP relay
*/

-- ============================================================================
-- TABLE: Email Notification Logs (for tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS proforma_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proforma_id uuid NOT NULL REFERENCES proformas(id) ON DELETE CASCADE,
  receiver_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL, -- 'sent', 'accepted', 'rejected', 'ready_to_invoice'
  receiver_email text NOT NULL,
  sent_at timestamp DEFAULT NOW(),
  email_status text DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  error_message text,
  created_at timestamp DEFAULT NOW()
);

-- Create indexes for quick lookups
CREATE INDEX idx_proforma_notifications_receiver ON proforma_notifications(receiver_user_id);
CREATE INDEX idx_proforma_notifications_proforma ON proforma_notifications(proforma_id);
CREATE INDEX idx_proforma_notifications_type ON proforma_notifications(notification_type);

-- ============================================================================
-- RPC FUNCTION: Send Receiver Notification Email (placeholder)
-- ============================================================================
-- This function is called from the frontend when a new proforma is detected
-- It logs the notification and can trigger an Edge Function to send email

CREATE OR REPLACE FUNCTION send_receiver_notification_email(
  p_receiver_user_id uuid,
  p_proforma_id uuid,
  p_proforma_number text,
  p_sender_name text
)
RETURNS json AS $$
DECLARE
  v_receiver_email text;
  v_sender_id uuid;
  v_notification_id uuid;
BEGIN
  -- Get receiver's email from profiles
  SELECT email INTO v_receiver_email 
  FROM profiles 
  WHERE id = p_receiver_user_id
  LIMIT 1;
  
  IF v_receiver_email IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Receiver email not found');
  END IF;
  
  -- Get sender's ID
  SELECT user_id INTO v_sender_id
  FROM proformas
  WHERE id = p_proforma_id
  LIMIT 1;
  
  IF v_sender_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Proforma not found');
  END IF;
  
  -- Log notification in database
  INSERT INTO proforma_notifications (
    proforma_id,
    receiver_user_id,
    sender_user_id,
    notification_type,
    receiver_email,
    email_status
  ) VALUES (
    p_proforma_id,
    p_receiver_user_id,
    v_sender_id,
    'sent',
    v_receiver_email,
    'pending'
  ) RETURNING id INTO v_notification_id;
  
  -- Return success with notification ID
  -- In production, this would trigger an Edge Function to actually send the email
  RETURN json_build_object(
    'success', true,
    'message', 'Notification logged. Email will be sent via Edge Function.',
    'notification_id', v_notification_id,
    'receiver_email', v_receiver_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC FUNCTION: Send Accept/Reject Notifications
-- ============================================================================
CREATE OR REPLACE FUNCTION send_status_notification_email(
  p_proforma_id uuid,
  p_notification_type text, -- 'accepted' or 'rejected'
  p_notifier_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_proforma_record proformas%ROWTYPE;
  v_notifier_email text;
  v_notification_id uuid;
BEGIN
  -- Get proforma
  SELECT * INTO v_proforma_record FROM proformas WHERE id = p_proforma_id LIMIT 1;
  
  IF v_proforma_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Proforma not found');
  END IF;
  
  -- Get notifier's email
  SELECT email INTO v_notifier_email 
  FROM profiles 
  WHERE id = p_notifier_user_id
  LIMIT 1;
  
  IF v_notifier_email IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Notifier email not found');
  END IF;
  
  -- Log notification
  INSERT INTO proforma_notifications (
    proforma_id,
    receiver_user_id,
    sender_user_id,
    notification_type,
    receiver_email,
    email_status
  ) VALUES (
    p_proforma_id,
    v_proforma_record.user_id,
    v_proforma_record.client_user_id,
    p_notification_type,
    v_notifier_email,
    'pending'
  ) RETURNING id INTO v_notification_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Status notification logged',
    'notification_id', v_notification_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENT: HOW TO SET UP EMAIL SENDING
-- ============================================================================
/*
OPTION 1: Use Supabase Edge Functions + Resend (Recommended)
========================================================
1. Create Edge Function: supabase/functions/send-proforma-email/index.ts
2. Deploy: supabase functions deploy send-proforma-email
3. Function triggers on proforma_notifications table INSERT
4. Sends email via Resend API (resend.com)

OPTION 2: Use Database Webhook
========================================================
1. Supabase → Database Webhooks
2. Create webhook on proforma_notifications INSERT
3. POST to external service with notification data
4. External service sends email

OPTION 3: Use pg_cron + pgmail (Advanced)
========================================================
1. Enable pg_cron extension
2. Configure pgmail for SMTP
3. Schedule recurring job to send pending emails

For now, the notification is logged in the database and the frontend
shows the toast notification immediately to the receiver.
*/

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_receiver_notification_email TO authenticated;
GRANT EXECUTE ON FUNCTION send_status_notification_email TO authenticated;

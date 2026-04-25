/*
  Migration 20: Add Receiver/Job Giver Support to Proformas
  - Add client_user_id to track who receives the proforma
  - Restrict accept/reject to only the receiver
  Run this in your Supabase SQL Editor
*/

-- Add receiver tracking to proformas
ALTER TABLE proformas
ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES auth.users ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS sent_date timestamp with time zone;

-- Add comment
COMMENT ON COLUMN proformas.client_user_id IS 'User ID of the Job Giver/Company who receives and accepts this proforma';
COMMENT ON COLUMN proformas.sent_date IS 'Date when proforma was sent to receiver';

-- Create index for finding proformas by receiver
CREATE INDEX IF NOT EXISTS idx_proformas_client_user_id ON proformas(client_user_id);
CREATE INDEX IF NOT EXISTS idx_proformas_user_id_status ON proformas(user_id, status);

-- Add column to track if receiver has viewed it
ALTER TABLE proformas
ADD COLUMN IF NOT EXISTS viewed_by_client boolean DEFAULT false;

COMMENT ON COLUMN proformas.viewed_by_client IS 'Whether the receiver has viewed this proforma';

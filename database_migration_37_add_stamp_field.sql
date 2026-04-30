/*
  Migration: Add Stamp Upload Support for Proformas and Invoices
  Run this in your Supabase SQL Editor
*/

-- Add stamp_url field to proformas table
ALTER TABLE proformas ADD COLUMN IF NOT EXISTS stamp_url text;
ALTER TABLE proformas ADD COLUMN IF NOT EXISTS stamp_uploaded_at timestamp with time zone;

-- Add stamp_url field to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stamp_url text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stamp_uploaded_at timestamp with time zone;

-- Create index for stamp uploads
CREATE INDEX IF NOT EXISTS idx_proformas_stamp_url ON proformas(stamp_url);
CREATE INDEX IF NOT EXISTS idx_invoices_stamp_url ON invoices(stamp_url);

-- Add comment for documentation
COMMENT ON COLUMN proformas.stamp_url IS 'URL to the uploaded stamp/logo image for this proforma';
COMMENT ON COLUMN invoices.stamp_url IS 'URL to the uploaded stamp/logo image for this invoice';

/*
  Migration 18: Ensure Invoices AND Proformas Tables Have Tax/Discount Columns and Update Convert Function
  Run this in your Supabase SQL Editor to fix the "record has no field tax_rate" error
*/

-- Step 0: Add tax and discount columns to proformas table if they don't exist
ALTER TABLE proformas
ADD COLUMN IF NOT EXISTS tax_rate decimal(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_rate decimal(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount decimal(12,2) DEFAULT 0;

-- Add comments for proformas
COMMENT ON COLUMN proformas.tax_rate IS 'Tax percentage (e.g., 18 for 18% VAT)';
COMMENT ON COLUMN proformas.discount_rate IS 'Discount percentage (e.g., 10 for 10% off)';
COMMENT ON COLUMN proformas.tax_amount IS 'Calculated tax amount based on tax_rate';
COMMENT ON COLUMN proformas.discount_amount IS 'Calculated discount amount based on discount_rate';
COMMENT ON COLUMN proformas.total_amount IS 'Final total: amount - discount + tax';

-- Step 1: Add tax and discount columns to invoices table if they don't exist
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS tax_rate decimal(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_rate decimal(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount decimal(12,2) DEFAULT 0;

-- Step 2: Add comments for invoices
COMMENT ON COLUMN invoices.tax_rate IS 'Tax percentage (e.g., 18 for 18% VAT)';
COMMENT ON COLUMN invoices.discount_rate IS 'Discount percentage (e.g., 10 for 10% off)';
COMMENT ON COLUMN invoices.tax_amount IS 'Calculated tax amount based on tax_rate';
COMMENT ON COLUMN invoices.discount_amount IS 'Calculated discount amount based on discount_rate';
COMMENT ON COLUMN invoices.total_amount IS 'Final total: amount - discount + tax';

-- Step 3: Create indexes for tax lookups
CREATE INDEX IF NOT EXISTS idx_proformas_tax_rate ON proformas(tax_rate);
CREATE INDEX IF NOT EXISTS idx_invoices_tax_rate ON invoices(tax_rate);

-- Step 4: Update the convert_proforma_to_invoice RPC function to include tax and discount
CREATE OR REPLACE FUNCTION convert_proforma_to_invoice(
  p_proforma_id uuid,
  p_user_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_invoice_id uuid;
  v_proforma_record proformas%ROWTYPE;
BEGIN
  -- Get proforma record
  SELECT * INTO v_proforma_record FROM proformas 
  WHERE id = p_proforma_id AND user_id = p_user_id;
  
  IF v_proforma_record IS NULL THEN
    RAISE EXCEPTION 'Proforma not found';
  END IF;
  
  IF v_proforma_record.status = 'converted' THEN
    RAISE EXCEPTION 'Proforma already converted to invoice';
  END IF;
  
  -- Create invoice from proforma with tax and discount included
  INSERT INTO invoices (
    user_id, number, client_name, client_phone, client_email,
    amount, currency, description, status, invoice_date, due_date,
    tax_rate, discount_rate, tax_amount, discount_amount, total_amount
  ) VALUES (
    p_user_id,
    'INV-' || v_proforma_record.number,
    v_proforma_record.client_name,
    v_proforma_record.client_phone,
    v_proforma_record.client_email,
    v_proforma_record.amount,
    v_proforma_record.currency,
    v_proforma_record.description,
    'sent',
    NOW(),
    NOW() + INTERVAL '30 days',
    COALESCE(v_proforma_record.tax_rate, 0),
    COALESCE(v_proforma_record.discount_rate, 0),
    COALESCE(v_proforma_record.tax_amount, 0),
    COALESCE(v_proforma_record.discount_amount, 0),
    COALESCE(v_proforma_record.total_amount, v_proforma_record.amount)
  ) RETURNING id INTO v_invoice_id;
  
  -- Copy proforma items to invoice items
  INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount)
  SELECT v_invoice_id, description, quantity, unit_price, amount
  FROM proforma_items
  WHERE proforma_id = p_proforma_id;
  
  -- Mark proforma as converted
  UPDATE proformas SET status = 'converted' WHERE id = p_proforma_id;
  
  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

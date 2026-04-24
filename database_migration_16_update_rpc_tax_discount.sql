/*
  Migration: Update RPC Function to Include Tax and Discount on Proforma to Invoice Conversion
  Run this AFTER database_migration_15_tax_discount.sql
*/

-- Update the convert_proforma_to_invoice function to include tax and discount
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
  
  -- Create invoice from proforma with tax and discount
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
    v_proforma_record.tax_rate,
    v_proforma_record.discount_rate,
    v_proforma_record.tax_amount,
    v_proforma_record.discount_amount,
    v_proforma_record.total_amount
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

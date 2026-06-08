/*
  Migration: Create proforma_audit_logs table
  Tracks proforma conversions and purchase codes for audit/backfill purposes.
*/

CREATE TABLE IF NOT EXISTS proforma_audit_logs (
  id uuid default gen_random_uuid() primary key,
  action text not null,
  user_id uuid references auth.users not null,
  proforma_id uuid references proformas not null,
  invoice_id uuid references invoices not null,
  purchase_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_proforma_audit_logs_invoice_id ON proforma_audit_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_proforma_audit_logs_proforma_id ON proforma_audit_logs(proforma_id);
CREATE INDEX IF NOT EXISTS idx_proforma_audit_logs_user_id ON proforma_audit_logs(user_id);

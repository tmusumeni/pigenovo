/*
  Migration 19: Add Tax and Discount Totals to Reports
  Run this in your Supabase SQL Editor
*/

-- Add tax and discount total columns to reports table
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS total_tax decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_discount decimal(12,2) DEFAULT 0;

-- Add comments for reports
COMMENT ON COLUMN reports.total_tax IS 'Total tax amount from all invoices in the period';
COMMENT ON COLUMN reports.total_discount IS 'Total discount amount from all invoices in the period';

-- Create index for report lookups
CREATE INDEX IF NOT EXISTS idx_reports_period ON reports(start_date, end_date);

/*
  Migration: Add Tax and Discount Fields to Proformas and Invoices
  Allows sellers to set tax rates and discounts that carry over to invoices
*/

-- Add tax_rate and discount_rate to proformas table
ALTER TABLE proformas
ADD COLUMN IF NOT EXISTS tax_rate decimal(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_rate decimal(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount decimal(12,2) DEFAULT 0;

-- Add comment for tax_rate
COMMENT ON COLUMN proformas.tax_rate IS 'Tax percentage (e.g., 18 for 18% VAT)';

-- Add comment for discount_rate
COMMENT ON COLUMN proformas.discount_rate IS 'Discount percentage (e.g., 10 for 10% off)';

-- Add comment for tax_amount
COMMENT ON COLUMN proformas.tax_amount IS 'Calculated tax amount based on tax_rate';

-- Add comment for discount_amount
COMMENT ON COLUMN proformas.discount_amount IS 'Calculated discount amount based on discount_rate';

-- Add comment for total_amount
COMMENT ON COLUMN proformas.total_amount IS 'Final total: amount - discount + tax';

-- Add tax_rate and discount_rate to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS tax_rate decimal(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_rate decimal(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount decimal(12,2) DEFAULT 0;

-- Add comments for invoices
COMMENT ON COLUMN invoices.tax_rate IS 'Tax percentage (e.g., 18 for 18% VAT)';
COMMENT ON COLUMN invoices.discount_rate IS 'Discount percentage (e.g., 10 for 10% off)';
COMMENT ON COLUMN invoices.tax_amount IS 'Calculated tax amount based on tax_rate';
COMMENT ON COLUMN invoices.discount_amount IS 'Calculated discount amount based on discount_rate';
COMMENT ON COLUMN invoices.total_amount IS 'Final total: amount - discount + tax';

-- Create index for tax lookups (useful for tax reports)
CREATE INDEX IF NOT EXISTS idx_proformas_tax_rate ON proformas(tax_rate);
CREATE INDEX IF NOT EXISTS idx_invoices_tax_rate ON invoices(tax_rate);

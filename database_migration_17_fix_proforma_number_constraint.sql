/*
  Migration: Fix Proforma & Invoice Number Constraint to be Per-User
  Issue: Global UNIQUE constraint prevented multiple users from using PRO-001, INV-001
  Solution: Change to composite unique index on (user_id, number)
*/

-- Drop the global unique constraints
ALTER TABLE proformas 
DROP CONSTRAINT IF EXISTS proformas_number_key;

ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_number_key;

-- Create composite unique indices that allow each user to have PRO-001, PRO-002, INV-001, INV-002, etc.
CREATE UNIQUE INDEX IF NOT EXISTS idx_proformas_user_number 
ON proformas(user_id, number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_number 
ON invoices(user_id, number);

-- Add comments explaining the new constraints
COMMENT ON INDEX idx_proformas_user_number IS 'Ensures each user has unique proforma numbers (PRO-001, PRO-002, etc.), but different users can share the same numbers';
COMMENT ON INDEX idx_invoices_user_number IS 'Ensures each user has unique invoice numbers (INV-001, INV-002, etc.), but different users can share the same numbers';

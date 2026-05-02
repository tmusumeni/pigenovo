-- Create proforma_shares table for sharing proformas publicly
CREATE TABLE IF NOT EXISTS proforma_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proforma_id UUID NOT NULL REFERENCES proformas(id) ON DELETE CASCADE,
  share_token VARCHAR(32) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  share_type VARCHAR(20) DEFAULT 'qr', -- 'qr', 'email', 'whatsapp'
  recipient_email VARCHAR(255),
  share_cost INTEGER DEFAULT 500, -- 500 RWF charge
  cost_deducted BOOLEAN DEFAULT FALSE,
  CONSTRAINT valid_share_type CHECK (share_type IN ('qr', 'email', 'whatsapp'))
);

-- Create invoice_shares table for sharing invoices publicly
CREATE TABLE IF NOT EXISTS invoice_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  share_token VARCHAR(32) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  share_type VARCHAR(20) DEFAULT 'qr', -- 'qr', 'email', 'whatsapp'
  recipient_email VARCHAR(255),
  share_cost INTEGER DEFAULT 500, -- 500 RWF charge
  cost_deducted BOOLEAN DEFAULT FALSE,
  CONSTRAINT valid_share_type CHECK (share_type IN ('qr', 'email', 'whatsapp'))
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_proforma_shares_token ON proforma_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_proforma_shares_proforma_id ON proforma_shares(proforma_id);
CREATE INDEX IF NOT EXISTS idx_proforma_shares_created_by ON proforma_shares(created_by);
CREATE INDEX IF NOT EXISTS idx_invoice_shares_token ON invoice_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_invoice_shares_invoice_id ON invoice_shares(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_shares_created_by ON invoice_shares(created_by);

-- Enable RLS
ALTER TABLE proforma_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proforma_shares
CREATE POLICY "Users can view their own proforma shares"
  ON proforma_shares FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create proforma shares"
  ON proforma_shares FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own proforma shares"
  ON proforma_shares FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for invoice_shares
CREATE POLICY "Users can view their own invoice shares"
  ON invoice_shares FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create invoice shares"
  ON invoice_shares FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own invoice shares"
  ON invoice_shares FOR DELETE
  USING (created_by = auth.uid());

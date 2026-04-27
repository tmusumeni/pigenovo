/*
  Migration 32: Fix get_received_proformas RPC - Simplified approach
  
  Use SETOF to return rows directly - more reliable than RETURNS TABLE
  This avoids type mismatch issues
*/

DROP FUNCTION IF EXISTS public.get_received_proformas(uuid);

CREATE OR REPLACE FUNCTION public.get_received_proformas(p_receiver_user_id uuid)
RETURNS TABLE (
  id uuid,
  number text,
  client_name text,
  client_email text,
  client_phone text,
  description text,
  amount numeric,
  currency text,
  proforma_date timestamp,
  valid_until timestamp,
  tax_rate numeric,
  discount_rate numeric,
  tax_amount numeric,
  discount_amount numeric,
  total_amount numeric,
  status text,
  user_id uuid,
  sent_date timestamp,
  viewed_date timestamp,
  recipient_status text,
  created_at timestamp
) AS $$
  SELECT 
    p.id::uuid,
    p.number::text,
    p.client_name::text,
    COALESCE(p.client_email, '')::text,
    COALESCE(p.client_phone, '')::text,
    COALESCE(p.description, '')::text,
    COALESCE(p.amount, 0)::numeric,
    COALESCE(p.currency, 'RWF')::text,
    p.proforma_date::timestamp,
    p.valid_until::timestamp,
    (0)::numeric,
    (0)::numeric,
    (0)::numeric,
    (0)::numeric,
    COALESCE(p.amount, 0)::numeric,
    p.status::text,
    p.user_id::uuid,
    pr.sent_date::timestamp,
    pr.viewed_date::timestamp,
    COALESCE(pr.status, 'pending')::text,
    p.created_at::timestamp
  FROM public.proformas p
  INNER JOIN public.proforma_recipients pr ON p.id = pr.proforma_id
  WHERE pr.receiver_user_id = p_receiver_user_id
  ORDER BY pr.sent_date DESC NULLS LAST;
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_received_proformas(uuid) TO authenticated;

-- Usage:
-- SELECT * FROM public.get_received_proformas('receiver-user-id-uuid-here');

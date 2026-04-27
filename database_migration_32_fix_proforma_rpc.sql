/*
  Migration 32: Fix get_received_proformas RPC - Add missing fields
  
  The component expects tax_rate, discount_rate, tax_amount, discount_amount fields
  These need to be added to the table first or returned as 0 from the RPC
  
  SOLUTION: Return these fields as 0/default values since the table doesn't have them
  The component will work with these default values
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
  proforma_date timestamp without time zone,
  valid_until timestamp without time zone,
  tax_rate numeric,
  discount_rate numeric,
  tax_amount numeric,
  discount_amount numeric,
  total_amount numeric,
  status text,
  user_id uuid,
  sent_date timestamp without time zone,
  viewed_date timestamp without time zone,
  recipient_status text,
  created_at timestamp without time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.number,
    p.client_name,
    p.client_email,
    p.client_phone,
    p.description,
    p.amount,
    p.currency,
    p.proforma_date,
    p.valid_until,
    0::numeric as tax_rate,
    0::numeric as discount_rate,
    0::numeric as tax_amount,
    0::numeric as discount_amount,
    p.amount as total_amount,
    p.status,
    p.user_id,
    pr.sent_date,
    pr.viewed_date,
    pr.status as recipient_status,
    p.created_at
  FROM proformas p
  INNER JOIN proforma_recipients pr ON p.id = pr.proforma_id
  WHERE pr.receiver_user_id = p_receiver_user_id
  ORDER BY pr.sent_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_received_proformas(uuid) TO authenticated;

-- Usage:
-- SELECT * FROM public.get_received_proformas('receiver-user-id-uuid-here');

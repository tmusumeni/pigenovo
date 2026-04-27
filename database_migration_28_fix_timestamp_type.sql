/*
  Migration 28: Fix Timestamp Type Mismatch in RPC Function
  
  ERROR: "timestamp without time zone does not match expected type timestamp with time zone"
  
  The RETURNS TABLE definition was using 'timestamp with time zone' but the actual
  database columns are 'timestamp without time zone'. This causes a type mismatch.
  
  Solution: Change the RETURNS TABLE definition to match the actual columns.
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
  status text,
  user_id uuid,
  sent_date timestamp,
  viewed_date timestamp,
  recipient_status text,
  created_at timestamp
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

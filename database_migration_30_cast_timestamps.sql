/*
  Migration 30: FINAL FIX - Cast timestamps in RPC function
  
  The proforma_recipients table has 'timestamp without time zone' columns
  but we're declaring the function to return 'timestamp with time zone'.
  
  Solution: Cast the columns to the correct type in the SELECT statement.
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
  proforma_date timestamp with time zone,
  valid_until timestamp with time zone,
  status text,
  user_id uuid,
  sent_date timestamp with time zone,
  viewed_date timestamp with time zone,
  recipient_status text,
  created_at timestamp with time zone
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
    p.proforma_date AT TIME ZONE 'UTC',
    p.valid_until AT TIME ZONE 'UTC',
    p.status,
    p.user_id,
    pr.sent_date AT TIME ZONE 'UTC',
    pr.viewed_date AT TIME ZONE 'UTC',
    pr.status as recipient_status,
    p.created_at AT TIME ZONE 'UTC'
  FROM proformas p
  INNER JOIN proforma_recipients pr ON p.id = pr.proforma_id
  WHERE pr.receiver_user_id = p_receiver_user_id
  ORDER BY pr.sent_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_received_proformas(uuid) TO authenticated;

/*
  Migration 26: Fix get_received_proformas RPC Function
  
  The function was failing because it tries to select columns that might not exist.
  This version selects ONLY core columns that are guaranteed to exist.
*/

-- Drop the broken function
DROP FUNCTION IF EXISTS public.get_received_proformas(uuid);

-- Recreate with ONLY guaranteed columns
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

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION public.get_received_proformas(uuid) TO authenticated;

-- Test the function (uncomment to verify)
-- SELECT * FROM public.get_received_proformas('your-receiver-user-id-here');

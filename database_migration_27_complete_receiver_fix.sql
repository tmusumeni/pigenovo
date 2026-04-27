/*
  
  ╔════════════════════════════════════════════════════════════════════════════╗
  ║                   COMPLETE RECEIVER PROFORMAS FIX                           ║
  ║                    Run this ENTIRE script in Supabase                       ║
  ║                          All in ONE go                                      ║
  ╚════════════════════════════════════════════════════════════════════════════╝

  This script:
  1. Removes ALL problematic RLS policies
  2. Recreates ONLY the necessary policies (no circular references)
  3. Fixes the RPC function
  4. Verifies everything works

*/

-- ============================================================================
-- STEP 1: DROP ALL PROBLEMATIC POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their received proformas" ON public.proforma_recipients;
DROP POLICY IF EXISTS "Senders can view their sent proformas recipients" ON public.proforma_recipients;
DROP POLICY IF EXISTS "RPC functions can insert recipients" ON public.proforma_recipients;
DROP POLICY IF EXISTS "RPC functions can update recipients" ON public.proforma_recipients;

-- ============================================================================
-- STEP 2: START FRESH - ENABLE RLS
-- ============================================================================

ALTER TABLE public.proforma_recipients ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: CREATE ONLY 2 ESSENTIAL POLICIES (NO CIRCULAR REFERENCES)
-- ============================================================================

-- Policy 1: Receivers can see their records (simple, direct check)
CREATE POLICY "Receivers can see their received proformas"
  ON public.proforma_recipients
  FOR SELECT
  USING (auth.uid() = receiver_user_id);

-- Policy 2: Allow RPC and internal operations 
CREATE POLICY "System can manage recipients"
  ON public.proforma_recipients
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update recipients"
  ON public.proforma_recipients
  FOR UPDATE
  USING (true);

-- ============================================================================
-- STEP 4: FIX THE RPC FUNCTION (Drop and recreate)
-- ============================================================================

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

-- Grant execution permission
GRANT EXECUTE ON FUNCTION public.get_received_proformas(uuid) TO authenticated;

-- ============================================================================
-- STEP 5: VERIFY THE FIX WORKS
-- ============================================================================

-- Count how many proformas are in the database
SELECT COUNT(*) as total_proforma_recipients FROM public.proforma_recipients;

-- List the policies (should be 3 now)
SELECT policyname FROM pg_policies WHERE tablename = 'proforma_recipients';

-- The RPC function should return data with this format
-- SELECT * FROM public.get_received_proformas('your-receiver-id-here');

-- ============================================================================
-- DONE
-- ============================================================================
/*
  
  AFTER RUNNING THIS:
  
  1. Hard refresh your app: Ctrl+Shift+R
  2. Log in as a receiver
  3. Go to "Received Proformas" tab
  4. Should see proformas (not 0)
  
  If STILL showing 0:
  - Verify proformas were actually SENT to this receiver
  - Run: SELECT * FROM public.proforma_recipients;
  - Should show rows
  
  If still not working:
  - Check browser console (F12) for errors
  - Report the exact error message
  
*/

/*
  Migration 24: Fix Receiver RLS Policies
  
  This migration adds the necessary RLS policies to allow receivers to access
  proformas sent to them. The issue was that the proformas and proforma_recipients
  tables needed proper RLS policies to work together.
  
  Run this in your Supabase SQL Editor to fix the "0 received proformas" issue.
*/

-- ============================================================================
-- ADD RLS TO PROFORMA_RECIPIENTS TABLE
-- ============================================================================

-- Enable RLS on proforma_recipients if not already enabled
ALTER TABLE public.proforma_recipients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their received proformas" ON public.proforma_recipients;
DROP POLICY IF EXISTS "Senders can view their sent proformas recipients" ON public.proforma_recipients;
DROP POLICY IF EXISTS "RPC functions can insert recipients" ON public.proforma_recipients;
DROP POLICY IF EXISTS "RPC functions can update recipients" ON public.proforma_recipients;

-- Allow users to view their received proformas (as receiver)
CREATE POLICY "Users can view their received proformas"
  ON public.proforma_recipients
  FOR SELECT
  USING (auth.uid() = receiver_user_id);

-- Allow senders to view who they sent proformas to (for tracking)
CREATE POLICY "Senders can view their sent proformas recipients"
  ON public.proforma_recipients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.proformas
      WHERE proformas.id = proforma_recipients.proforma_id
      AND proformas.user_id = auth.uid()
    )
  );

-- Allow RPC functions to insert (with SECURITY DEFINER, this won't be used but kept for clarity)
CREATE POLICY "RPC functions can insert recipients"
  ON public.proforma_recipients
  FOR INSERT
  WITH CHECK (true);

-- Allow RPC functions to update (with SECURITY DEFINER)
CREATE POLICY "RPC functions can update recipients"
  ON public.proforma_recipients
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ADD ADDITIONAL RLS POLICIES TO PROFORMAS TABLE
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Receivers can see proformas sent to them" ON public.proformas;

-- Add policy to allow receivers to see proformas sent to them
CREATE POLICY "Receivers can see proformas sent to them"
  ON public.proformas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.proforma_recipients
      WHERE proforma_recipients.proforma_id = proformas.id
      AND proforma_recipients.receiver_user_id = auth.uid()
    )
  );

-- ============================================================================
-- ADD ADDITIONAL RLS POLICIES TO PROFORMA_ITEMS TABLE
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Receivers can see proforma items for proformas sent to them" ON public.proforma_items;

-- Add policy to allow receivers to see items in proformas sent to them
CREATE POLICY "Receivers can see proforma items for proformas sent to them"
  ON public.proforma_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.proformas p
      INNER JOIN public.proforma_recipients pr ON p.id = pr.proforma_id
      WHERE p.id = proforma_items.proforma_id
      AND pr.receiver_user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFY FUNCTIONS EXIST AND HAVE CORRECT PERMISSIONS
-- ============================================================================

-- Ensure get_received_proformas function has proper permissions
GRANT EXECUTE ON FUNCTION public.get_received_proformas(uuid) TO authenticated;

-- Test query (uncomment to verify it works)
-- SELECT * FROM public.get_received_proformas('your-user-id-here');

-- ============================================================================
-- SUMMARY
-- ============================================================================
/*
  This migration fixes the "0 received proformas" issue by:
  1. Adding RLS policies to proforma_recipients table
     - Receivers can see their received proformas
     - Senders can see who they sent to
     - RPC functions can insert/update
  
  2. Adding RLS policy to proformas table
     - Receivers can see proformas sent to them
  
  3. Adding RLS policy to proforma_items table
     - Receivers can see items in proformas sent to them
  
  After running this migration:
  - Receivers will see all proformas sent to them in the "Received Proformas" tab
  - The get_received_proformas() RPC function will return results
  - All accept/reject operations will work correctly
*/

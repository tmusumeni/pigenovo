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

-- Allow RPC functions to insert/update (with SECURITY DEFINER)
-- Senders don't need to query proforma_recipients directly; RPC functions handle this

-- ============================================================================
-- RPC FUNCTIONS HANDLE PROFORMA ACCESS FOR RECEIVERS
-- ============================================================================
-- No additional RLS policies needed on proformas or proforma_items tables
-- because the RPC functions (get_received_proformas, recipient_accept_proforma,
-- recipient_reject_proforma) have SECURITY DEFINER and bypass RLS.
-- These functions handle all authorization logic internally.

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
  
  1. Enabling RLS on proforma_recipients table
  2. Adding single policy: Receivers can see their received proformas
     - Only receivers listed in proforma_recipients.receiver_user_id can see their rows
  
  3. RPC functions handle all proformas/proforma_items access
     - get_received_proformas() has SECURITY DEFINER (bypasses RLS)
     - recipient_accept_proforma() has SECURITY DEFINER
     - recipient_reject_proforma() has SECURITY DEFINER
     - These functions authorize users internally
  
  This avoids circular RLS policy references.
  
  After running this migration:
  - Receivers will see all proformas sent to them in the "Received Proformas" tab
  - The get_received_proformas() RPC function will return results
  - All accept/reject operations will work correctly
*/

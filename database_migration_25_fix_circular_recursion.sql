/*
  Migration 25: Remove Circular Recursion in RLS Policies
  
  The "Senders can view their sent proformas recipients" policy creates infinite recursion
  when saving proformas because it checks the proformas table from within proforma_recipients RLS.
  
  Solution: Remove that policy. Senders don't need direct access to proforma_recipients anyway.
  They can see their sent proformas from the proformas table directly.
*/

-- ============================================================================
-- FIX CIRCULAR RECURSION
-- ============================================================================

-- Drop the problematic policy that checks proformas from proforma_recipients
DROP POLICY IF EXISTS "Senders can view their sent proformas recipients" ON public.proforma_recipients;

-- Keep only the simple, direct policies:
-- 1. Receivers can see their received proformas (direct user_id check)
-- 2. RPC functions can insert/update (for send/accept/reject operations)

-- ============================================================================
-- RESULT
-- ============================================================================
/*
  After this migration:
  - Receivers can still see their received proformas (policy unchanged)
  - RPC functions can still insert/update (policy unchanged)  
  - Senders see their own proformas via the proformas table RLS (no change needed)
  - No circular references = no infinite recursion errors
  - Saving proformas works again
*/

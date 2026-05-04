-- Migration 40: Add secure RPCs for public sender profile lookup on shared invoices/proformas
-- Purpose: Allow public share pages to display sender metadata without exposing full profiles

-- Create an RPC for invoice share sender profile lookup
CREATE OR REPLACE FUNCTION public.get_invoice_share_sender_profile(p_share_token text)
RETURNS TABLE(
  id uuid,
  full_name text,
  email text,
  phone_number text,
  company_name text,
  country text,
  country_code text,
  avatar_url text,
  bio text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.phone_number, p.company_name, p.country, p.country_code, p.avatar_url, p.bio
  FROM public.invoice_shares s
  JOIN public.invoices i ON i.id = s.invoice_id
  JOIN public.profiles p ON p.id = i.user_id
  WHERE s.share_token = p_share_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invoice_share_sender_profile(text) TO public;

-- Create an RPC for proforma share sender profile lookup
CREATE OR REPLACE FUNCTION public.get_proforma_share_sender_profile(p_share_token text)
RETURNS TABLE(
  id uuid,
  full_name text,
  email text,
  phone_number text,
  company_name text,
  country text,
  country_code text,
  avatar_url text,
  bio text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.phone_number, p.company_name, p.country, p.country_code, p.avatar_url, p.bio
  FROM public.proforma_shares s
  JOIN public.proformas pr ON pr.id = s.proforma_id
  JOIN public.profiles p ON p.id = pr.user_id
  WHERE s.share_token = p_share_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_proforma_share_sender_profile(text) TO public;

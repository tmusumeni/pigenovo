-- Migration 41: Add feature visibility settings for admin control
-- Purpose: Allow admins to show/hide features like trading from the sidebar

CREATE TABLE IF NOT EXISTS public.feature_visibility (
  id BIGSERIAL PRIMARY KEY,
  feature_name text NOT NULL UNIQUE,
  is_visible boolean DEFAULT true,
  description text,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Enable RLS on feature_visibility table
ALTER TABLE public.feature_visibility ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public to read feature visibility settings
CREATE POLICY "Public can read feature visibility" ON public.feature_visibility
  FOR SELECT
  USING (true);

-- Policy: Only admins can update feature visibility
CREATE POLICY "Only admins can update feature visibility" ON public.feature_visibility
  FOR UPDATE
  USING (
    is_admin(auth.uid())
  )
  WITH CHECK (
    is_admin(auth.uid())
  );

-- Insert default features
INSERT INTO public.feature_visibility (feature_name, is_visible, description)
VALUES
  ('trading', true, 'Trading Exchange feature'),
  ('watch_earn', true, 'Watch & Earn feature'),
  ('proformas', true, 'Proformas management'),
  ('invoices', true, 'Invoices management'),
  ('reports', true, 'Reports management'),
  ('ai_assistant', true, 'AI Assistant feature'),
  ('wallet', true, 'Wallet feature')
ON CONFLICT (feature_name) DO NOTHING;

-- Create RPC to get feature visibility
CREATE OR REPLACE FUNCTION public.get_feature_visibility()
RETURNS TABLE(feature_name text, is_visible boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT fv.feature_name, fv.is_visible
  FROM public.feature_visibility fv;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_feature_visibility() TO authenticated, anon;

-- Create RPC to update feature visibility (admin only)
CREATE OR REPLACE FUNCTION public.update_feature_visibility(p_feature_name text, p_is_visible boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can update feature visibility';
  END IF;
  
  UPDATE public.feature_visibility
  SET is_visible = p_is_visible, updated_at = NOW()
  WHERE feature_name = p_feature_name;
  
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_feature_visibility(text, boolean) TO authenticated;

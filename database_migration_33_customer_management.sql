/*
  Migration 33: Customer Management System
  
  Creates a comprehensive customer database with:
  - Full customer profiles with company info
  - TIN (Tax Identification Number)
  - Searchable by name and phone
  - Link to profiles table for registered customers
  - Searchable customer list for invoices/proformas
*/

-- ============================================================================
-- CREATE CUSTOMERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Customer Basic Info
  full_name text NOT NULL,
  phone_number text,
  email text,
  -- Business Info
  company_name text,
  tin_number text, -- Tax Identification Number
  -- Tracking
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(full_name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_company ON public.customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_tin ON public.customers(tin_number);
CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(is_active);

-- ============================================================================
-- RLS POLICIES FOR CUSTOMERS TABLE
-- ============================================================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Users can only see their own customers
CREATE POLICY "Users can view their own customers"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own customers
CREATE POLICY "Users can create their own customers"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own customers
CREATE POLICY "Users can update their own customers"
  ON public.customers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own customers
CREATE POLICY "Users can delete their own customers"
  ON public.customers FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RPC FUNCTION: Search customers by name or phone
-- ============================================================================

DROP FUNCTION IF EXISTS public.search_customers(uuid, text);

CREATE OR REPLACE FUNCTION public.search_customers(
  p_user_id uuid,
  p_search_term text
)
RETURNS TABLE (
  id uuid,
  full_name text,
  phone_number text,
  email text,
  company_name text,
  tin_number text,
  is_active boolean,
  created_at timestamp,
  updated_at timestamp
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id::uuid,
    c.full_name::text,
    COALESCE(c.phone_number, '')::text,
    COALESCE(c.email, '')::text,
    COALESCE(c.company_name, '')::text,
    COALESCE(c.tin_number, '')::text,
    c.is_active::boolean,
    c.created_at::timestamp,
    c.updated_at::timestamp
  FROM public.customers c
  WHERE c.user_id = p_user_id
    AND c.is_active = true
    AND (
      LOWER(c.full_name) LIKE LOWER('%' || p_search_term || '%')
      OR LOWER(COALESCE(c.phone_number, '')) LIKE LOWER('%' || p_search_term || '%')
      OR LOWER(COALESCE(c.company_name, '')) LIKE LOWER('%' || p_search_term || '%')
    )
  ORDER BY c.full_name ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC FUNCTION: Get customer details by ID
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_customer_details(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_customer_details(
  p_user_id uuid,
  p_customer_id uuid
)
RETURNS TABLE (
  id uuid,
  full_name text,
  phone_number text,
  email text,
  company_name text,
  tin_number text,
  is_active boolean,
  created_at timestamp
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id::uuid,
    c.full_name::text,
    COALESCE(c.phone_number, '')::text,
    COALESCE(c.email, '')::text,
    COALESCE(c.company_name, '')::text,
    COALESCE(c.tin_number, '')::text,
    c.is_active::boolean,
    c.created_at::timestamp
  FROM public.customers c
  WHERE c.id = p_customer_id
    AND c.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC FUNCTION: Create or update customer
-- ============================================================================

DROP FUNCTION IF EXISTS public.upsert_customer(uuid, uuid, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.upsert_customer(
  p_user_id uuid,
  p_customer_id uuid,
  p_full_name text,
  p_phone_number text,
  p_email text,
  p_company_name text,
  p_tin_number text
)
RETURNS TABLE (
  id uuid,
  success boolean,
  message text
) AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  IF p_customer_id IS NULL OR p_customer_id = '00000000-0000-0000-0000-000000000000'::uuid THEN
    -- INSERT new customer
    INSERT INTO public.customers (user_id, full_name, phone_number, email, company_name, tin_number)
    VALUES (p_user_id, p_full_name, p_phone_number, p_email, p_company_name, p_tin_number)
    RETURNING customers.id INTO v_customer_id;
    
    RETURN QUERY SELECT v_customer_id::uuid, true::boolean, 'Customer created successfully'::text;
  ELSE
    -- UPDATE existing customer
    UPDATE public.customers
    SET 
      full_name = p_full_name,
      phone_number = p_phone_number,
      email = p_email,
      company_name = p_company_name,
      tin_number = p_tin_number,
      updated_at = NOW()
    WHERE id = p_customer_id AND user_id = p_user_id;
    
    RETURN QUERY SELECT p_customer_id::uuid, true::boolean, 'Customer updated successfully'::text;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::uuid, false::boolean, SQLERRM::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.search_customers(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_details(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_customer(uuid, uuid, text, text, text, text, text) TO authenticated;

-- ============================================================================
-- SUMMARY
-- ============================================================================
/*
  CUSTOMER MANAGEMENT SYSTEM

  Tables Created:
  1. customers - Full customer profiles with business info

  Functions Created:
  1. search_customers(user_id, search_term) - Search by name, phone, or company
  2. get_customer_details(user_id, customer_id) - Get full customer details
  3. upsert_customer(...) - Create or update customer

  Fields:
  - Full Name (required)
  - Phone Number
  - Email
  - Company Name
  - TIN Number (Tax Identification)

  Features:
  - Fast search by name, phone, or company
  - RLS: Each user only sees their own customers
  - Automatic indexes for performance
  - Timestamps for tracking
  - Active flag for soft deletes

  Usage:
  -- Search customers
  SELECT * FROM public.search_customers(auth.uid(), 'search term');

  -- Get customer details
  SELECT * FROM public.get_customer_details(auth.uid(), 'customer-id-uuid');

  -- Create/update customer
  SELECT * FROM public.upsert_customer(
    auth.uid(),
    NULL,  -- NULL for insert, UUID for update
    'John Doe',
    '+250788888888',
    'john@example.com',
    'Acme Corp',
    'TIN123456'
  );
*/

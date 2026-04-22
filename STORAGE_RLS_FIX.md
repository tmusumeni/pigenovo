# Fix Supabase Storage RLS Error

## Problem
You're getting a "400 Bad Request" error with message "one row violates row level security policy" when uploading proofs. This is because your `proofs` storage bucket is missing Row Level Security (RLS) policies.

## Solution

### Step 1: Go to Supabase Dashboard
1. Navigate to https://app.supabase.com
2. Select your project `vcyxtkfpwixgeiymrozg`
3. Go to **Storage** → **Buckets**
4. Ensure the **proofs** bucket exists. If not, create it:
   - Click "New bucket"
   - Name: `proofs`
   - Make it private (uncheck "Public bucket")
   - Click "Create bucket"

### Step 2: Enable RLS on the Storage Bucket
1. In **Storage**, click on the **proofs** bucket
2. Go to the **Policies** tab
3. Click "New Policy"
4. Choose "For INSERT operations"
5. Paste this policy code:
```sql
CREATE POLICY "Allow authenticated users to upload proofs"
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'proofs');
```
6. Click "Review" and "Save policy"

### Step 3: Add SELECT Policy
1. Click "New Policy" again
2. Choose "For SELECT operations"
3. Paste this policy code:
```sql
CREATE POLICY "Allow authenticated users to view proofs"
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'proofs');
```
4. Click "Review" and "Save policy"

### Step 4: (Optional) Add DELETE Policy for Admins
1. Click "New Policy" again
2. Choose "For DELETE operations"
3. Paste this policy code:
```sql
CREATE POLICY "Allow admins to delete proofs"
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'proofs' AND 
  auth.jwt() ->> 'email' = 'tmusumeni@gmail.com'
);
```
4. Click "Review" and "Save policy"

## Alternative: Run SQL in SQL Editor
If you prefer, you can run all policies at once:

1. Go to **SQL Editor** in Supabase
2. Click "New query"
3. Copy the entire policy section from `supabase_schema.sql` (starting from `-- ======== STORAGE BUCKET POLICIES ========`)
4. Paste it in the SQL editor
5. Click "Run"

## Test the Fix
After adding the policies, try uploading a proof image in the Watch & Earn section. It should now work without the RLS error.

## Troubleshooting
- If you still get the error, make sure you're logged in (authenticated) before uploading
- Check that your Supabase session is valid in the app
- Clear browser cache and try again
- Verify the bucket name is exactly `proofs` (case-sensitive)

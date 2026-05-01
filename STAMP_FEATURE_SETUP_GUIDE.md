# 🔖 Stamp Upload Feature - Setup & Troubleshooting Guide

## ✅ Step-by-Step Setup

### Step 1: Run Database Migration

**You MUST run this SQL in your Supabase SQL Editor:**

1. Open your Supabase project
2. Click **SQL Editor** in left sidebar
3. Click **+ New Query**
4. Copy and paste this SQL:

```sql
-- Add stamp_url field to proformas table
ALTER TABLE proformas ADD COLUMN IF NOT EXISTS stamp_url text;
ALTER TABLE proformas ADD COLUMN IF NOT EXISTS stamp_uploaded_at timestamp with time zone;

-- Add stamp_url field to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stamp_url text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stamp_uploaded_at timestamp with time zone;

-- Create index for stamp uploads
CREATE INDEX IF NOT EXISTS idx_proformas_stamp_url ON proformas(stamp_url);
CREATE INDEX IF NOT EXISTS idx_invoices_stamp_url ON invoices(stamp_url);
```

5. Click **Run** button
6. Wait for success message

**✅ Status**: Check if you see green checkmark and "Success"

---

### Step 2: Create Storage Bucket

1. Go to **Storage** in Supabase dashboard
2. Click **Create a new bucket**
3. Name: `proforma-stamps`
4. Select **Public** access
5. Click **Create bucket**

**✅ Status**: Bucket should appear in your storage list

---

### Step 3: Create RLS Policies for Storage

1. Go to **Storage** → Click `proforma-stamps` bucket
2. Go to **Policies** tab
3. Click **New policy** and add these:

**Policy 1 - Allow uploads:**
```sql
CREATE POLICY "Allow authenticated users to upload stamps"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'proforma-stamps'
  AND auth.role() = 'authenticated'
);
```

**Policy 2 - Allow public read:**
```sql
CREATE POLICY "Allow public read access to stamps"
ON storage.objects
FOR SELECT
USING (bucket_id = 'proforma-stamps');
```

**✅ Status**: Both policies should show in Policies list

---

## 🧪 Test the Feature

### Upload a Stamp:
1. Create a proforma
2. Click **Preview**
3. Look for stamp upload input (if not visible, scroll down)
4. Upload a PNG or JPG image (max 5MB)
5. Should show success message: "✅ Stamp uploaded successfully"

### Verify in Browser Console:

1. **Open DevTools** (F12)
2. **Go to Console tab**
3. **Upload stamp and watch for these messages:**

```
✅ "Stamp public URL: https://..." (shows URL was generated)
✅ "Stamp saved successfully for proforma: [ID]" (shows saved to DB)
✅ "Stamp URL in first proforma: https://..." (shows retrieved from DB)
```

---

## 🔍 Troubleshooting

### ❌ Stamp Not Showing After Upload

**Check Console Messages:**
- `"Stamp public URL:"` - ✅ URL generated?
- `"Stamp saved successfully"` - ✅ Saved to database?
- `"Error loading stamp from URL:"` - ❌ URL not loading from storage

**Solutions:**

1. **Verify Database Migration Ran:**
   - In Supabase SQL Editor run:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name='proformas' AND column_name='stamp_url';
   ```
   - Should show: `stamp_url` ✅
   - If empty ❌ → Run migration again

2. **Verify Storage Bucket Exists:**
   - Storage → Should see `proforma-stamps`
   - If not ❌ → Create bucket again

3. **Verify RLS Policies:**
   - Storage → `proforma-stamps` → Policies
   - Should show 2 policies (INSERT, SELECT)
   - If not ❌ → Create policies again

4. **Check Storage URL Format:**
   - Should be: `https://[project-id].supabase.co/storage/v1/object/public/proforma-stamps/...`
   - If different → Check bucket access settings

---

### ❌ Upload Fails with "Bucket not found"

**Solution:**
1. Create the storage bucket (Step 2 above)
2. Make sure bucket is **PUBLIC**
3. Refresh page and try again

---

### ❌ Profile Fetching Error (PGRST116)

**Solution:**
- This is fixed in latest version
- Just refresh page
- Should see no more errors

---

## 📋 Verification Checklist

Before claiming stamps work, verify:

- [ ] **Database**: `stamp_url` column exists in `proformas` table
- [ ] **Database**: `stamp_uploaded_at` column exists in `proformas` table  
- [ ] **Storage**: `proforma-stamps` bucket exists and is PUBLIC
- [ ] **Storage**: Upload policy exists for authenticated users
- [ ] **Storage**: Read policy exists for public access
- [ ] **Frontend**: Can upload image without errors
- [ ] **Console**: See success messages when uploading
- [ ] **Preview**: Stamp image displays in preview modal
- [ ] **Export**: Stamp appears in PDF/Image export
- [ ] **Receiver**: Stamp visible when receiver views proforma

---

## 🚀 How It Works (Complete Flow)

```
1. User creates proforma
   ↓
2. Opens preview modal
   ↓
3. Clicks stamp upload button
   ↓
4. Selects image file (PNG, JPG, < 5MB)
   ↓
5. File validated and uploaded to Supabase Storage
   ↓
6. Storage returns public URL
   ↓
7. URL saved to database (stamp_url column)
   ↓
8. Image displays in preview modal
   ↓
9. Stamp included in PDF/Image export
   ↓
10. Receiver sees stamp when viewing proforma
```

---

## 📊 Expected Behavior

### After Uploading Stamp:

✅ Toast message: "✅ Stamp uploaded successfully"

✅ Console shows:
- `Stamp public URL: https://...`
- `Stamp saved successfully for proforma: ...`

✅ Preview modal shows stamp image in amber section

✅ Stamp appears in exported PDF/Image

✅ Stamp visible to receiver viewing proforma

---

## 🆘 Still Not Working?

1. **Check the Setup Steps Above** - Make sure all 3 steps completed
2. **Open Browser DevTools** (F12) → Console tab
3. **Try uploading a stamp** and watch console output
4. **Copy the error messages** and share them

**Key Debug Messages to Look For:**
- ✅ `"Stamp public URL: ..."` 
- ✅ `"Stamp saved successfully"` 
- ❌ `"Error uploading stamp:"`
- ❌ `"Error loading stamp from URL:"`
- ❌ `"Bucket not found"`

---

**Last Updated**: May 1, 2026
**Feature Status**: Fully Implemented (requires setup)

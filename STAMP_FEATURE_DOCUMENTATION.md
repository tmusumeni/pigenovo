# Stamp Upload Feature - Setup Guide

## Overview
Added stamp/signature upload functionality to Proforma and Invoice documents. Users can upload a custom stamp that will be displayed on the right side of the QR code in preview and export formats.

## Features Added

### 1. Database Changes
- Added `stamp_url` field to `proformas` table
- Added `stamp_uploaded_at` field to `proformas` table  
- Added `stamp_url` field to `invoices` table
- Added `stamp_uploaded_at` field to `invoices` table

**Migration File**: `database_migration_37_add_stamp_field.sql`

Run this migration in Supabase SQL Editor:
```sql
ALTER TABLE proformas ADD COLUMN IF NOT EXISTS stamp_url text;
ALTER TABLE proformas ADD COLUMN IF NOT EXISTS stamp_uploaded_at timestamp with time zone;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stamp_url text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stamp_uploaded_at timestamp with time zone;
```

### 2. Frontend Changes

#### Proformas Component (src/components/Proformas.tsx)
- Added `stamp_url` and `stamp_uploaded_at` to Proforma interface
- Added state management for stamp file, preview, and upload status
- Added `handleStampFileSelect()` function to validate and preview stamp files
- Added `uploadStamp()` function to upload stamp to Supabase storage
- Added stamp upload UI in the form with:
  - Drag-and-drop support
  - File validation (image only, max 5MB)
  - Preview display
  - Remove option
- Updated `generateProformaDocument()` to include stamp in the document layout
- Modified top-bar layout to show: Logo | QR Code | Stamp | Sender Info

#### Invoices Component (src/components/Invoices.tsx)
- Same changes as Proformas component applied to invoices

### 3. Storage Setup Required

You need to create a Supabase Storage bucket:

1. Go to your Supabase project dashboard
2. Navigate to **Storage** section
3. Create a new bucket named: **`proforma-stamps`**
4. Configure RLS Policy for the bucket:
   - Allow authenticated users to upload files to their own folder path: `stamps/{user_id}/*`
   - Allow public read access to files for document preview/export

**RLS Policy Example**:
```sql
-- Allow users to upload to their own stamps folder
CREATE POLICY "Users can upload stamps"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'proforma-stamps' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access
CREATE POLICY "Public can view stamps"
ON storage.objects FOR SELECT
USING (bucket_id = 'proforma-stamps');
```

### 4. Document Layout Changes

The stamp now appears in the top section of the document:

```
┌─────────────────────────────────────┐
│  LOGO  │  QR CODE  │  STAMP  │  SENDER INFO  │
└─────────────────────────────────────┘
```

Where:
- **Stamp** displays the uploaded company stamp/signature
- **Sender Info** shows:
  - Sender name
  - Company name
  - Phone number
  - Email
  - TIN number

### 5. File Validation

Stamp uploads are validated for:
- **File Type**: Must be an image (PNG, JPG, GIF, etc.)
- **File Size**: Maximum 5MB
- **User Feedback**: Toast notifications for upload success/failure

### 6. Stamp Upload Flow

1. User creates/edits a proforma or invoice
2. In the form, user can upload a stamp image
3. Stamp is stored in `proforma-stamps` storage bucket
4. Path format: `stamps/{user_id}/{proforma_id}/{timestamp}.{ext}`
5. Public URL is saved in `stamp_url` field
6. When document is generated/exported, stamp is included

### 7. Display Behavior

- **If stamp exists**: Displays the stamp image on the right of QR code
- **If no stamp**: Only shows sender information without empty space

### 8. Migration Steps

1. **Run the database migration**:
   ```bash
   # Execute database_migration_37_add_stamp_field.sql in Supabase SQL Editor
   ```

2. **Create Supabase Storage bucket**:
   - Name: `proforma-stamps`
   - Enable public access for files

3. **Deploy the updated components**:
   - Proformas.tsx with stamp functionality
   - Invoices.tsx with stamp functionality

4. **Test the feature**:
   - Create a new proforma/invoice
   - Upload a stamp image
   - Preview and export the document
   - Verify stamp appears in the document

## Usage Instructions for Users

### Uploading a Stamp

1. When creating or editing a proforma/invoice, scroll to the **"Upload Stamp/Signature"** section
2. Click the upload area or drag-and-drop an image file
3. A preview will appear below the upload area
4. Click "Remove Preview" if you want to replace it
5. Save the proforma/invoice (stamp will be uploaded automatically)

### Stamp in Documents

- When you preview or export a proforma/invoice, the stamp will appear:
  - On the right side of the QR code
  - Above or alongside the sender information
  - In both PDF and image export formats

## Troubleshooting

### Stamp Not Appearing
- Verify Supabase storage bucket is created and public
- Check RLS policies on the storage bucket
- Ensure stamp file is valid image format
- Check browser console for upload errors

### Upload Fails
- Verify file is an image (PNG, JPG, GIF)
- Ensure file size is under 5MB
- Check Supabase project is active and storage is enabled
- Check user is authenticated

## Future Enhancements

- Drag-to-reposition stamp in document
- Stamp size/opacity adjustment
- Multiple stamps support
- Stamp templates library
- Watermark functionality

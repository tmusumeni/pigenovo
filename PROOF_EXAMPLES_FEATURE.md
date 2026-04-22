# Proof of Earn - WhatsApp Task Enhancement

## New Feature: Admin-Provided Proof Examples

This feature allows admins to provide visual proof examples and instructions when creating WhatsApp earn tasks. Users will see these examples and understand exactly what kind of proof they need to submit.

## What Changed

### Database Schema (`supabase_schema.sql`)
- Added `proof_image_url` column to `earn_tasks` table
- Added `proof_link` column to `earn_tasks` table

### Admin Panel (`src/components/AdminPanel.tsx`)
New fields in "Add Earn Task" form for WhatsApp platform:
- **Upload Proof Image**: Admin can upload an example screenshot showing what successful proof looks like
- **Proof Link or Instructions**: Admin can add a URL or text instructions for users

These fields only appear when "WhatsApp" is selected as the platform.

Features:
- Image preview before upload
- File is stored in the `proofs` storage bucket
- Link/instructions text is saved to database

### Watch & Earn Component (`src/components/WatchEarn.tsx`)
Users now see a "Proof Example" card when viewing WhatsApp tasks that have:
- Example image showing what proof looks like
- Instructions or links provided by the admin
- Clear visual distinction (blue highlight box)

## How to Use

### For Admins:

1. Go to **Admin Panel** → **Tasks** → **Add Earn Task**
2. Fill in basic task details (title, URL, requirements, reward)
3. Select **"WhatsApp"** as the platform
4. Two new optional fields appear:
   - **Upload Proof Image**: Click and select an example screenshot
   - **Proof Link or Instructions**: Enter a link or instruction text
5. Click "Create Task"

Example scenarios:
- **Image Only**: Upload a screenshot showing a successful WhatsApp group join
- **Link Only**: Provide instructions like "Join group and take screenshot of member count"
- **Both**: Show an image AND provide detailed instructions

### For Users:

1. Go to **Watch & Earn**
2. Click on a WhatsApp task
3. See the **Proof Example** section with:
   - Admin-provided screenshot (if uploaded)
   - Instructions or tips (if provided)
4. Follow the example and submit your proof (screenshot or link)

## Database Migration (Existing Installations)

If you already have the database set up, run the migration script:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click "New Query"
3. Copy contents of `database_migration_proof_examples.sql`
4. Click "Run"
5. Done! New fields are now available

## File Structure

```
├── supabase_schema.sql                    # Updated schema with new columns
├── database_migration_proof_examples.sql  # Migration for existing databases
├── src/components/AdminPanel.tsx          # Added proof upload UI
└── src/components/WatchEarn.tsx          # Added proof example display
```

## Storage Considerations

- Proof images are stored in the `proofs` storage bucket
- Storage bucket must have proper RLS policies enabled (see STORAGE_RLS_FIX.md)
- Images are public URLs after upload for display to all users
- Max file size depends on your Supabase plan

## Future Enhancements

- Multiple proof examples per task
- Admin edit/delete proof examples
- Task templates with predefined proof examples
- Proof example preview in task list

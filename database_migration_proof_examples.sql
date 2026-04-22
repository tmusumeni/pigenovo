/* 
  Migration Script: Add Proof Examples to Earn Tasks
  Run this in your Supabase SQL Editor if you already have the database schema
*/

-- Add new columns to earn_tasks table to store proof examples for WhatsApp tasks
ALTER TABLE earn_tasks 
ADD COLUMN IF NOT EXISTS proof_image_url text,
ADD COLUMN IF NOT EXISTS proof_link text;

-- Comment explaining the new fields
COMMENT ON COLUMN earn_tasks.proof_image_url IS 'For WhatsApp tasks: example proof image uploaded by admin';
COMMENT ON COLUMN earn_tasks.proof_link IS 'For WhatsApp tasks: example proof link or instructions';

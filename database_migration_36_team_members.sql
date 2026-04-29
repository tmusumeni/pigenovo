-- Migration 36: Create Team Members/About Section Table
-- Purpose: Store team member information (CEO, HR, Managers) for display on left sidebar

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(100) NOT NULL, -- CEO, HR, Manager, etc.
  description TEXT,
  profile_image_url TEXT,
  order_position INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_team_members_order ON team_members(order_position);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(is_active);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active team members
CREATE POLICY "Team members are viewable by everyone"
  ON team_members
  FOR SELECT
  USING (is_active = true);

-- Policy: Only admins can insert/update/delete
CREATE POLICY "Only admins can manage team members"
  ON team_members
  FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Add comments
COMMENT ON TABLE team_members IS 'Stores information about team members displayed in About section';
COMMENT ON COLUMN team_members.name IS 'Full name of team member';
COMMENT ON COLUMN team_members.title IS 'Position title (CEO, HR, Manager, etc.)';
COMMENT ON COLUMN team_members.description IS 'Bio or description of the team member';
COMMENT ON COLUMN team_members.profile_image_url IS 'URL to profile image hosted on Supabase or external CDN';
COMMENT ON COLUMN team_members.order_position IS 'Display order in About section (0 = first)';

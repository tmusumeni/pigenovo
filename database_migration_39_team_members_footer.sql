-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS join_team_settings CASCADE;
DROP TABLE IF EXISTS footer_content CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;

-- Create team_members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  avatar TEXT, -- URL to profile picture
  bio TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  position_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create footer_content table
CREATE TABLE footer_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key VARCHAR(100) NOT NULL UNIQUE,
  section_title VARCHAR(255) NOT NULL,
  content TEXT,
  link_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create join_team_settings table for "Join Our Team" section
CREATE TABLE join_team_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL DEFAULT 'Join Our Team',
  description TEXT,
  button_text VARCHAR(100) DEFAULT 'View Open Positions',
  button_link VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_team_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow public read
CREATE POLICY "Allow public read team_members" ON team_members
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow public read footer_content" ON footer_content
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow public read join_team_settings" ON join_team_settings
  FOR SELECT USING (is_active = true);

-- Admin-only policies for management
CREATE POLICY "Allow admin manage team_members" ON team_members
  FOR ALL USING (auth.jwt() ->> 'email' = 'tmusumeni@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'tmusumeni@gmail.com');

CREATE POLICY "Allow admin manage footer_content" ON footer_content
  FOR ALL USING (auth.jwt() ->> 'email' = 'tmusumeni@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'tmusumeni@gmail.com');

CREATE POLICY "Allow admin manage join_team_settings" ON join_team_settings
  FOR ALL USING (auth.jwt() ->> 'email' = 'tmusumeni@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'tmusumeni@gmail.com');

-- Insert default team members
INSERT INTO team_members (name, role, email, avatar, bio, position_order)
VALUES
  ('Themba Musumeni', 'Lead Developer & Founder', 'themba@pigenovo.st', NULL, 'Full-stack developer with expertise in React, TypeScript, and blockchain integration', 1),
  ('Alex Johnson', 'Product Manager', 'alex@pigenovo.st', NULL, 'Passionate about user experience and building products that traders love', 2),
  ('Sarah Chen', 'Smart Contract Engineer', 'sarah@pigenovo.st', NULL, 'Blockchain specialist ensuring secure and efficient smart contract deployment', 3),
  ('Marcus Williams', 'DevOps & Infrastructure', 'marcus@pigenovo.st', NULL, 'Ensuring platform reliability, security, and scalability for millions of users', 4)
ON CONFLICT DO NOTHING;

-- Insert default footer content
INSERT INTO footer_content (section_key, section_title, content, link_url, display_order)
VALUES
  ('footer_about_title', 'About', 'About PigEvoST', NULL, 0),
  ('footer_about', 'About PigEvoST', 'Empowering traders and investors with advanced tools for financial success and wealth creation.', NULL, 1),
  ('footer_link_docs', 'Documentation', 'Documentation', 'https://example.com/docs', 2),
  ('footer_link_api', 'API Reference', 'API Reference', 'https://example.com/api', 3),
  ('footer_resource_privacy', 'Privacy Policy', 'Privacy Policy', 'https://example.com/privacy', 4),
  ('footer_resource_terms', 'Terms of Service', 'Terms of Service', 'https://example.com/terms', 5),
  ('footer_help', 'Help', 'Need assistance? Contact support or browse docs.', 'https://example.com/support', 6),
  ('footer_contact_email', 'Email', 'support@pigenovo.st', NULL, 7),
  ('footer_contact_phone', 'Phone', '+1 (234) 567-8900', NULL, 8),
  ('footer_copyright', 'Copyright', 'PigEvoST. All rights reserved.', NULL, 9)
ON CONFLICT DO NOTHING;

-- Insert default join team settings
INSERT INTO join_team_settings (title, description, button_text, button_link)
VALUES
  ('Join Our Team', 'We are always looking for talented developers, designers, and product specialists to join our mission.', 'View Open Positions', '#')
ON CONFLICT DO NOTHING;

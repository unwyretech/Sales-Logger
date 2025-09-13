/*
  # Authentication and Campaign Structure Migration

  1. New Tables
    - `user_profiles` - Extended user profile information with roles and approval status
    - `campaigns` - Top-level campaigns (replacing teams concept)
    - `campaign_teams` - Teams within campaigns
    - `agent_notes` - Notes attached to agent profiles
    - `user_permissions` - Role-based permissions for campaigns

  2. Security
    - Enable RLS on all new tables
    - Add policies for role-based access control
    - Create admin approval workflow

  3. Changes
    - Update existing tables to support campaign structure
    - Add role-based permission system
*/

-- Create user profiles table for extended user information
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'standard' CHECK (role IN ('super_admin', 'admin', 'standard')),
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create campaigns table (top-level organization)
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  color text DEFAULT '#3b82f6',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create campaign teams table (teams within campaigns)
CREATE TABLE IF NOT EXISTS campaign_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#10b981',
  manager_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, name)
);

-- Create agent notes table
CREATE TABLE IF NOT EXISTS agent_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user permissions table for campaign access
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  can_view boolean DEFAULT true,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, campaign_id)
);

-- Update agents table to reference campaign teams
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'campaign_team_id'
  ) THEN
    ALTER TABLE agents ADD COLUMN campaign_team_id uuid REFERENCES campaign_teams(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update call_data table if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_data' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE call_data ADD COLUMN campaign_id uuid REFERENCES campaigns(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
      AND up.is_approved = true
    )
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
      AND up.is_approved = true
    )
  );

-- Campaigns policies
CREATE POLICY "Users can view permitted campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN user_profiles prof ON prof.user_id = up.user_id
      WHERE up.user_id = auth.uid()
      AND up.campaign_id = campaigns.id
      AND up.can_view = true
      AND prof.is_approved = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role = 'super_admin'
      AND up.is_approved = true
    )
  );

CREATE POLICY "Admins can manage campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
      AND up.is_approved = true
    )
  );

-- Campaign teams policies
CREATE POLICY "Users can view teams in permitted campaigns"
  ON campaign_teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN user_profiles prof ON prof.user_id = up.user_id
      WHERE up.user_id = auth.uid()
      AND up.campaign_id = campaign_teams.campaign_id
      AND up.can_view = true
      AND prof.is_approved = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role = 'super_admin'
      AND up.is_approved = true
    )
  );

CREATE POLICY "Admins can manage campaign teams"
  ON campaign_teams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
      AND up.is_approved = true
    )
  );

-- Agent notes policies
CREATE POLICY "Users can view notes for permitted agents"
  ON agent_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      JOIN campaign_teams ct ON ct.id = a.campaign_team_id
      JOIN user_permissions up ON up.campaign_id = ct.campaign_id
      JOIN user_profiles prof ON prof.user_id = up.user_id
      WHERE up.user_id = auth.uid()
      AND a.id = agent_notes.agent_id
      AND up.can_view = true
      AND prof.is_approved = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role = 'super_admin'
      AND up.is_approved = true
    )
  );

CREATE POLICY "Users can create notes for permitted agents"
  ON agent_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      JOIN campaign_teams ct ON ct.id = a.campaign_team_id
      JOIN user_permissions up ON up.campaign_id = ct.campaign_id
      JOIN user_profiles prof ON prof.user_id = up.user_id
      WHERE up.user_id = auth.uid()
      AND a.id = agent_notes.agent_id
      AND up.can_edit = true
      AND prof.is_approved = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
      AND up.is_approved = true
    )
  );

-- User permissions policies
CREATE POLICY "Admins can manage user permissions"
  ON user_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
      AND up.is_approved = true
    )
  );

-- Create super admin user function
CREATE OR REPLACE FUNCTION create_super_admin()
RETURNS void AS $$
BEGIN
  -- This will be called after the super admin signs up
  INSERT INTO user_profiles (user_id, email, full_name, role, is_approved)
  SELECT 
    id, 
    email, 
    'Super Admin',
    'super_admin',
    true
  FROM auth.users 
  WHERE email = 'tyler@dibrokers.co.za'
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'super_admin',
    is_approved = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (user_id, email, full_name, role, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.email = 'tyler@dibrokers.co.za' THEN 'super_admin'
      ELSE 'standard'
    END,
    CASE 
      WHEN NEW.email = 'tyler@dibrokers.co.za' THEN true
      ELSE false
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_teams_updated_at
  BEFORE UPDATE ON campaign_teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_notes_updated_at
  BEFORE UPDATE ON agent_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
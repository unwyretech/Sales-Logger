/*
  # Fix Row Level Security Policies

  1. Security Updates
    - Update RLS policies to allow authenticated users to insert data
    - Separate policies for different operations (SELECT, INSERT, UPDATE, DELETE)
    - Ensure proper permissions for team and agent management

  2. Policy Changes
    - Allow authenticated users to read all teams and agents
    - Allow authenticated users to insert new teams and agents
    - Allow authenticated users to update and delete teams and agents
    - Allow authenticated users to manage call data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage teams" ON teams;
DROP POLICY IF EXISTS "Users can manage agents" ON agents;
DROP POLICY IF EXISTS "Users can manage call data" ON call_data;

-- Teams policies
CREATE POLICY "Authenticated users can read teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert teams"
  ON teams
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update teams"
  ON teams
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete teams"
  ON teams
  FOR DELETE
  TO authenticated
  USING (true);

-- Agents policies
CREATE POLICY "Authenticated users can read agents"
  ON agents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert agents"
  ON agents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update agents"
  ON agents
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete agents"
  ON agents
  FOR DELETE
  TO authenticated
  USING (true);

-- Call data policies
CREATE POLICY "Authenticated users can read call data"
  ON call_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert call data"
  ON call_data
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update call data"
  ON call_data
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete call data"
  ON call_data
  FOR DELETE
  TO authenticated
  USING (true);
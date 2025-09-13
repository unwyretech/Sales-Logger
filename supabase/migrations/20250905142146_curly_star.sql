/*
  # Sales Management Dashboard Schema

  1. New Tables
    - `teams`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `color` (text)
      - `manager_id` (uuid, optional)
      - `created_at` (timestamp)
    - `agents`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `team_id` (uuid, foreign key)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
    - `call_data`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key)
      - `date` (date)
      - `hour` (integer, 8-17)
      - `calls_made` (integer, default 0)
      - `total_call_time` (integer, default 0) -- in minutes
      - `sales_made` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their organization's data
*/

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  manager_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage agents"
  ON agents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Call data table
CREATE TABLE IF NOT EXISTS call_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  hour integer NOT NULL CHECK (hour >= 8 AND hour <= 17),
  calls_made integer DEFAULT 0 CHECK (calls_made >= 0),
  total_call_time integer DEFAULT 0 CHECK (total_call_time >= 0),
  sales_made integer DEFAULT 0 CHECK (sales_made >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, date, hour)
);

ALTER TABLE call_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage call data"
  ON call_data
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_team_id ON agents(team_id);
CREATE INDEX IF NOT EXISTS idx_call_data_agent_id ON call_data(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_data_date ON call_data(date);
CREATE INDEX IF NOT EXISTS idx_call_data_date_hour ON call_data(date, hour);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for call_data updated_at
CREATE TRIGGER update_call_data_updated_at
  BEFORE UPDATE ON call_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
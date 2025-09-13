/*
  # Disable Row Level Security for Development

  This migration temporarily disables RLS on all tables to allow the sales dashboard
  to function without authentication complications during development.

  1. Security Changes
    - Disable RLS on teams table
    - Disable RLS on agents table  
    - Disable RLS on call_data table
    - Remove existing policies

  Note: In production, you should re-enable RLS with proper authentication.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can insert teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can update teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can delete teams" ON teams;

DROP POLICY IF EXISTS "Authenticated users can read agents" ON agents;
DROP POLICY IF EXISTS "Authenticated users can insert agents" ON agents;
DROP POLICY IF EXISTS "Authenticated users can update agents" ON agents;
DROP POLICY IF EXISTS "Authenticated users can delete agents" ON agents;

DROP POLICY IF EXISTS "Authenticated users can read call data" ON call_data;
DROP POLICY IF EXISTS "Authenticated users can insert call data" ON call_data;
DROP POLICY IF EXISTS "Authenticated users can update call data" ON call_data;
DROP POLICY IF EXISTS "Authenticated users can delete call data" ON call_data;

-- Disable RLS on all tables
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE call_data DISABLE ROW LEVEL SECURITY;
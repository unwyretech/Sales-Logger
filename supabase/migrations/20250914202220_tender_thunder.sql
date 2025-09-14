/*
  # Fix User Permissions Foreign Key Relationship

  1. Changes
    - Add unique constraint on user_profiles.user_id
    - Update user_permissions to reference user_profiles instead of auth.users
    - This enables proper Supabase joins between the tables

  2. Security
    - Maintains existing RLS policies
    - Preserves data integrity
*/

-- Add unique constraint to user_profiles.user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'user_profiles' 
    AND constraint_name = 'user_profiles_user_id_key'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Drop existing foreign key constraint on user_permissions.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'user_permissions' 
    AND constraint_name = 'user_permissions_user_id_fkey'
  ) THEN
    ALTER TABLE user_permissions DROP CONSTRAINT user_permissions_user_id_fkey;
  END IF;
END $$;

-- Add new foreign key constraint referencing user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'user_permissions' 
    AND constraint_name = 'user_permissions_user_id_fkey'
  ) THEN
    ALTER TABLE user_permissions 
    ADD CONSTRAINT user_permissions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;
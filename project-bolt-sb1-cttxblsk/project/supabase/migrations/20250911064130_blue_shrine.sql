/*
  # Fix user signup trigger

  1. Updates
    - Fix the handle_new_user function to properly handle metadata
    - Add error handling for missing data
    - Ensure the trigger works correctly with Supabase Auth

  2. Security
    - Maintains existing RLS policies
    - Keeps security definer for proper permissions
*/

-- Drop existing trigger and function to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, full_name, role, is_approved)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'standard',
    CASE 
      WHEN NEW.email = 'tyler@dibrokers.co.za' THEN true
      ELSE false
    END
  );
  
  -- If this is the super admin, update their role
  IF NEW.email = 'tyler@dibrokers.co.za' THEN
    UPDATE public.user_profiles 
    SET role = 'super_admin', is_approved = true 
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE LOG 'Error creating user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
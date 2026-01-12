-- Add push_token column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token);

-- Add comment
COMMENT ON COLUMN profiles.push_token IS 'OneSignal Player ID for push notifications';

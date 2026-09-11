-- Add session_cookies JSONB column to hotel_channels
ALTER TABLE hotel_channels ADD COLUMN IF NOT EXISTS session_cookies JSONB;

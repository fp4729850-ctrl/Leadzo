-- hotel_rooms table
CREATE TABLE hotel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  type TEXT NOT NULL,
  price_per_night NUMERIC NOT NULL DEFAULT 0,
  master_export_ical TEXT,
  ical_links JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- hotel_channels table
CREATE TABLE hotel_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  name TEXT NOT NULL,
  connect_mode TEXT NOT NULL DEFAULT 'ical',
  email TEXT,
  password TEXT,
  ical_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  last_sync TEXT DEFAULT 'Not connected',
  icon_color TEXT,
  badge_bg TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- hotel_bookings table
CREATE TABLE hotel_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES hotel_rooms(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  phone TEXT,
  source TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed',
  ical_uid TEXT, -- unique ID from iCal to prevent duplicate imports
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own hotel_rooms" ON hotel_rooms
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own hotel_channels" ON hotel_channels
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own hotel_bookings" ON hotel_bookings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

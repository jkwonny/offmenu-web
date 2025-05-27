-- Step 1: Create ENUM for pricing type
CREATE TYPE pricing_type AS ENUM ('hourly', 'flat', 'minimum_spend');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  profile_picture TEXT, -- URL to profile picture
  about TEXT, -- User bio/about
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'venue_owner', 'admin')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  spaces_host BOOLEAN DEFAULT FALSE,
  offmenu_host BOOLEAN DEFAULT FALSE,
);

-- Step 2: Create main venues table with updated structure
CREATE TABLE venues (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  street_number TEXT,
  street_name TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  instagram_handle TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  category TEXT, -- e.g. 'restaurant', 'bar', 'rooftop'
  rental_type TEXT[], -- ['full', 'private_room', 'outside', 'semi_private']
  max_guests INTEGER,
  max_seated_guests INTEGER,
  max_standing_guests INTEGER,
  collaboration_type TEXT,
  tags TEXT[], -- e.g. ['rooftop', 'cozy', 'photo-friendly']
  services TEXT[], -- e.g. ['food', 'drink', 'event_planning']
  avg_rating NUMERIC(2,1),
  review_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved',

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Step 3: Create venue_images table to store images for each venue
CREATE TABLE venue_images (
  id BIGSERIAL PRIMARY KEY,
  venue_id BIGINT REFERENCES venues(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text,
  event_type text NOT NULL,

  selected_date date NOT NULL,
  selected_time time NOT NULL,

  expected_capacity_min integer,
  expected_capacity_max integer,

  assets_needed text[],
  is_active boolean DEFAULT true,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  owner_id UUID REFERENCES users(id)
);

-- Create event_images table to store images for each event
CREATE TABLE event_images (
  id BIGSERIAL PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT now()
);

-- Chat functionality
CREATE TABLE booking_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id BIGINT REFERENCES venues(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  venue_name TEXT,
  event_date DATE,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  requirements TEXT,
  special_requests TEXT,
  instagram_handle TEXT,
  website TEXT,
  guest_count TEXT,
  collaboration_types TEXT[],
  room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now()
);


CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES booking_requests(id),
  venue_id BIGINT REFERENCES venues(id),
  venue_name TEXT,
  event_date DATE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requirements TEXT,
  special_requests TEXT,
  instagram_handle TEXT,
  website TEXT,
  guest_count TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable row-level security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for chat_messages
CREATE POLICY "Users can view messages in their rooms" ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      LEFT JOIN booking_requests req ON cr.request_id = req.id
      WHERE 
        chat_messages.room_id = cr.id AND
        (
          -- New structure: direct sender/recipient on chat_rooms
          (cr.sender_id = auth.uid() OR cr.recipient_id = auth.uid()) OR
          -- Old structure: sender/recipient via booking_requests
          (req.sender_id = auth.uid() OR req.recipient_id = auth.uid())
        )
    )
  );

CREATE POLICY "Users can insert messages in their rooms" ON chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      LEFT JOIN booking_requests req ON cr.request_id = req.id
      WHERE 
        chat_messages.room_id = cr.id AND
        (
          -- New structure: direct sender/recipient on chat_rooms
          (cr.sender_id = auth.uid() OR cr.recipient_id = auth.uid()) OR
          -- Old structure: sender/recipient via booking_requests
          (req.sender_id = auth.uid() OR req.recipient_id = auth.uid())
        ) AND
        chat_messages.sender_id = auth.uid()
    )
  );

-- Enable Realtime for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Create table for storing Google Calendar tokens
CREATE TABLE google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  calendar_id TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Add index for faster lookups by user_id
CREATE INDEX idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);

-- Enable Row Level Security
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Users can view their own tokens" ON google_calendar_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens" ON google_calendar_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" ON google_calendar_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens" ON google_calendar_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Give service role access to the table
GRANT ALL ON google_calendar_tokens TO service_role;

-- Create enum for availability sources
CREATE TYPE availability_source AS ENUM ('manual', 'google', 'ical');

-- Create table for venue availability
CREATE TABLE venue_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id BIGINT REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- iCal RRULE format
  google_event_id TEXT, -- For events synced from Google
  external_id TEXT, -- For other external calendars
  source availability_source NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_venue_availability_venue_id ON venue_availability(venue_id);
CREATE INDEX idx_venue_availability_start_time ON venue_availability(start_time);
CREATE INDEX idx_venue_availability_end_time ON venue_availability(end_time);
CREATE INDEX idx_venue_availability_google_event_id ON venue_availability(google_event_id);

-- Enable Row Level Security
ALTER TABLE venue_availability ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Venue owners can view their venue availabilities" ON venue_availability
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM venues
      WHERE venues.id = venue_availability.venue_id
      AND venues.owner_id = auth.uid()
    )
  );

-- Add a policy for public read access to availability data
CREATE POLICY "Public can view venue availability" ON venue_availability
  FOR SELECT
  USING (true);

CREATE POLICY "Venue owners can insert availabilities for their venues" ON venue_availability
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM venues
      WHERE venues.id = venue_availability.venue_id
      AND venues.owner_id = auth.uid()
    )
  );

CREATE POLICY "Venue owners can update availabilities for their venues" ON venue_availability
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM venues
      WHERE venues.id = venue_availability.venue_id
      AND venues.owner_id = auth.uid()
    )
  );

CREATE POLICY "Venue owners can delete availabilities for their venues" ON venue_availability
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM venues
      WHERE venues.id = venue_availability.venue_id
      AND venues.owner_id = auth.uid()
    )
  );

-- Grant access to service role
GRANT ALL ON venue_availability TO service_role;

-- Create table for storing Google Calendar webhook information
CREATE TABLE google_calendar_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  venue_id BIGINT REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  calendar_id TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  resource_id TEXT NOT NULL,
  expiration TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX idx_google_calendar_webhooks_user_id ON google_calendar_webhooks(user_id);
CREATE INDEX idx_google_calendar_webhooks_venue_id ON google_calendar_webhooks(venue_id);
CREATE INDEX idx_google_calendar_webhooks_channel_id ON google_calendar_webhooks(channel_id);
CREATE INDEX idx_google_calendar_webhooks_expiration ON google_calendar_webhooks(expiration);

-- Enable Row Level Security
ALTER TABLE google_calendar_webhooks ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Users can view their own webhooks" ON google_calendar_webhooks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhooks" ON google_calendar_webhooks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhooks" ON google_calendar_webhooks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhooks" ON google_calendar_webhooks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant access to service role
GRANT ALL ON google_calendar_webhooks TO service_role;

-- Add RLS policies for chat_rooms
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their chat rooms" ON chat_rooms
  FOR SELECT
  USING (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid() OR
    -- Legacy support: check via booking_requests
    EXISTS (
      SELECT 1 FROM booking_requests req 
      WHERE req.id = chat_rooms.request_id 
      AND (req.sender_id = auth.uid() OR req.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can create chat rooms" ON chat_rooms
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Add RLS policies for booking_requests
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their booking requests" ON booking_requests
  FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can create booking requests" ON booking_requests
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipients can update booking request status" ON booking_requests
  FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid()); 
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
  collaboration_schedule JSONB, -- New: flexible collaboration scheduling with pricing
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

  ADD COLUMN street_number TEXT,
  ADD COLUMN street_name TEXT,
  ADD COLUMN neighborhood TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN state TEXT,
  ADD COLUMN postal_code TEXT,
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION;

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  owner_id UUID REFERENCES users(id)
);

-- Add an index for location-based queries
CREATE INDEX idx_events_location ON events (latitude, longitude);

-- Add an index for city/state queries
CREATE INDEX idx_events_city_state ON events (city, state); 

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


  -- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create venue_business_hours table
CREATE TABLE IF NOT EXISTS venue_business_hours (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    venue_id BIGINT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    days_of_week INTEGER[] NOT NULL,  -- Array of days (0=Sunday, 1=Monday, etc.)
    start_time TEXT NOT NULL,         -- Format: 'HH:MM'
    end_time TEXT NOT NULL,           -- Format: 'HH:MM'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE venue_business_hours ENABLE ROW LEVEL SECURITY;

-- Venue owners can read and write their venue's business hours
CREATE POLICY "Venue owners can manage their venue business hours" 
ON venue_business_hours
USING (
    venue_id IN (
        SELECT id FROM venues WHERE owner_id = auth.uid()
    )
);

-- Allow public read access to venue business hours
CREATE POLICY "Anyone can read venue business hours" 
ON venue_business_hours
FOR SELECT
USING (true);

-- Add updated_at trigger
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON venue_business_hours
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

-- Add indexes
CREATE INDEX idx_venue_business_hours_venue_id ON venue_business_hours (venue_id); 



-- Add new fields to events table for venue request tracking
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS has_venue_requests BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS request_status TEXT CHECK (request_status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS event_status TEXT DEFAULT 'private_pending',
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 1;

-- Update any existing events schema issues
ALTER TABLE events ALTER COLUMN selected_time DROP NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_has_venue_requests ON events (has_venue_requests);
CREATE INDEX IF NOT EXISTS idx_events_request_status ON events (request_status);
CREATE INDEX IF NOT EXISTS idx_events_event_status ON events (event_status);




-- Create the venue_booking_requests table (the "event_venue_requests" from PRD)
CREATE TABLE IF NOT EXISTS venue_booking_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    venue_id BIGINT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    venue_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_event_id ON venue_booking_requests (event_id);
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_venue_id ON venue_booking_requests (venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_status ON venue_booking_requests (status);
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_requester_id ON venue_booking_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_venue_booking_requests_venue_owner_id ON venue_booking_requests (venue_owner_id);

-- Add updated_at trigger (drop first if exists, then create)
DROP TRIGGER IF EXISTS venue_booking_requests_updated_at ON venue_booking_requests;
CREATE TRIGGER venue_booking_requests_updated_at
    BEFORE UPDATE ON venue_booking_requests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();


-- Enable RLS
ALTER TABLE venue_booking_requests ENABLE ROW LEVEL SECURITY;

-- Users can view requests they created or received
CREATE POLICY "Users can view their venue booking requests" 
ON venue_booking_requests
FOR SELECT
USING (
    requester_id = auth.uid() OR 
    venue_owner_id = auth.uid()
);

-- Users can create requests for events they own
CREATE POLICY "Users can create venue booking requests" 
ON venue_booking_requests
FOR INSERT
WITH CHECK (
    requester_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = venue_booking_requests.event_id 
        AND events.user_id = auth.uid()
    )
);

-- Venue owners can update status of requests for their venues
CREATE POLICY "Venue owners can update request status" 
ON venue_booking_requests
FOR UPDATE
USING (venue_owner_id = auth.uid())
WITH CHECK (venue_owner_id = auth.uid());

-- Event creators can update their own requests
CREATE POLICY "Event creators can update their requests" 
ON venue_booking_requests
FOR UPDATE
USING (requester_id = auth.uid())
WITH CHECK (requester_id = auth.uid());


-- Add new columns to chat_rooms to support venue booking requests
ALTER TABLE chat_rooms 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS event_creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS booking_request_id UUID REFERENCES venue_booking_requests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_event_id ON chat_rooms (event_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_booking_request_id ON chat_rooms (booking_request_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_event_creator_id ON chat_rooms (event_creator_id);


-- Update chat_messages to use the correct foreign key reference
-- First, add the new column
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE;

-- Update existing records to use the new column name
UPDATE chat_messages 
SET chat_room_id = room_id 
WHERE chat_room_id IS NULL AND room_id IS NOT NULL;

-- Update the RLS policy to use the new column name
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON chat_messages;

CREATE POLICY "Users can view messages in their rooms" ON chat_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM chat_rooms cr
        LEFT JOIN booking_requests req ON cr.request_id = req.id
        LEFT JOIN venue_booking_requests vbr ON cr.booking_request_id = vbr.id
        WHERE 
            (chat_messages.chat_room_id = cr.id OR chat_messages.room_id = cr.id) AND
            (
                -- New structure: direct sender/recipient on chat_rooms
                (cr.sender_id = auth.uid() OR cr.recipient_id = auth.uid()) OR
                -- New booking structure: via venue_booking_requests
                (vbr.requester_id = auth.uid() OR vbr.venue_owner_id = auth.uid()) OR
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
        LEFT JOIN venue_booking_requests vbr ON cr.booking_request_id = vbr.id
        WHERE 
            (chat_messages.chat_room_id = cr.id OR chat_messages.room_id = cr.id) AND
            (
                -- New structure: direct sender/recipient on chat_rooms
                (cr.sender_id = auth.uid() OR cr.recipient_id = auth.uid()) OR
                -- New booking structure: via venue_booking_requests
                (vbr.requester_id = auth.uid() OR vbr.venue_owner_id = auth.uid()) OR
                -- Old structure: sender/recipient via booking_requests
                (req.sender_id = auth.uid() OR req.recipient_id = auth.uid())
            ) AND
            chat_messages.sender_id = auth.uid()
    )
);



-- Function to automatically update event has_venue_requests flag
CREATE OR REPLACE FUNCTION update_event_venue_requests_flag()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the event to indicate it has venue requests
    UPDATE events 
    SET has_venue_requests = TRUE,
        updated_at = NOW()
    WHERE id = NEW.event_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set has_venue_requests flag
DROP TRIGGER IF EXISTS trigger_update_event_venue_requests ON venue_booking_requests;
CREATE TRIGGER trigger_update_event_venue_requests
    AFTER INSERT ON venue_booking_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_event_venue_requests_flag();



-- Grant access to service role for new tables
GRANT ALL ON venue_booking_requests TO service_role;
GRANT ALL ON venue_booking_requests TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
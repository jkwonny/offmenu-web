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
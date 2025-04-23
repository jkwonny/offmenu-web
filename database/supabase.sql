-- Step 1: Create ENUM for pricing type
CREATE TYPE pricing_type AS ENUM ('hourly', 'flat', 'minimum_spend');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'venue_owner', 'admin')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Step 2: Create main venues table with updated structure
CREATE TABLE venues (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  instagram_handle TEXT,
  city TEXT,
  state TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  category TEXT, -- e.g. 'restaurant', 'bar', 'rooftop'
  rental_type TEXT[], -- ['full', 'private_room', 'outside', 'semi_private']

  alcohol_served BOOLEAN DEFAULT FALSE,
  byob_allowed BOOLEAN DEFAULT FALSE,
  byob_pricing_type TEXT, -- 'per_person', 'per_bottle', 'flat_fee'
  byob_price NUMERIC(10,2),

  outside_cake_allowed BOOLEAN DEFAULT FALSE,
  cake_fee_type TEXT, -- 'per_person', 'per_cake', 'flat_fee'
  cake_fee_amount NUMERIC(10,2),

  cleaning_fee NUMERIC(10,2),
  setup_fee NUMERIC(10,2),
  overtime_fee_per_hour NUMERIC(10,2),

  max_guests INTEGER,
  max_seated_guests INTEGER,
  max_standing_guests INTEGER,

  pricing_type pricing_type,
  price NUMERIC(10,2),
  min_hours INTEGER,

  rules TEXT,
  tags TEXT[], -- e.g. ['rooftop', 'cozy', 'photo-friendly']

  avg_rating NUMERIC(2,1),
  review_count INTEGER DEFAULT 0,

  featured BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text,
  event_type text NOT NULL,
  
  start_date date NOT NULL,
  end_date date, -- optional

  expected_capacity_min integer,
  expected_capacity_max integer,

  assets_needed text[],
  is_active boolean DEFAULT true,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  owner_id UUID REFERENCES users(id)
);


-- Chat functionality
CREATE TABLE chat_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  venue_id BIGINT REFERENCES venues(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);


CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES chat_requests(id),
  event_id UUID REFERENCES events(id),
  venue_id BIGINT REFERENCES venues(id),
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
      JOIN chat_requests req ON cr.request_id = req.id
      WHERE 
        chat_messages.room_id = cr.id AND
        (req.sender_id = auth.uid() OR req.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their rooms" ON chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      JOIN chat_requests req ON cr.request_id = req.id
      WHERE 
        chat_messages.room_id = cr.id AND
        (req.sender_id = auth.uid() OR req.recipient_id = auth.uid()) AND
        chat_messages.sender_id = auth.uid()
    )
  );

-- Enable Realtime for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;


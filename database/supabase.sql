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
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
-- New schema to separate chat functionality from booking requests

-- 1. Rename chat_requests to booking_requests (represents space booking requests)
ALTER TABLE chat_requests RENAME TO booking_requests;

-- Add room_id to link booking requests to chat rooms
ALTER TABLE booking_requests 
  ADD COLUMN room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL;

-- 2. Modify chat_rooms to be independent of booking approval
-- Remove the dependency on request_id being required
ALTER TABLE chat_rooms 
  ALTER COLUMN request_id DROP NOT NULL,
  ADD COLUMN sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN requirements TEXT,
  ADD COLUMN special_requests TEXT,
  ADD COLUMN instagram_handle TEXT,
  ADD COLUMN website TEXT,
  ADD COLUMN guest_count TEXT;

-- 3. Update RLS policies for chat_messages to work with new structure
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON chat_messages;

-- New policies that work with direct sender/recipient relationship
-- These policies will work with both old structure (via request_id) and new structure (via sender_id/recipient_id)
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

-- 4. Add RLS policies for chat_rooms
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

-- 5. Add RLS policies for booking_requests
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
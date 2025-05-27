# New Chat and Booking Flow

## Overview
The new system separates **chat functionality** from **booking approval**, allowing immediate communication while maintaining a separate booking request approval process.

## Key Changes

### 1. **Immediate Chat Room Creation**
- Chat rooms are created immediately when someone contacts a venue owner
- No approval needed to start chatting
- Both parties can communicate right away

### 2. **Separate Booking Requests**
- `chat_requests` table renamed to `booking_requests`
- Booking requests are for space approval only
- Chat rooms exist independently of booking status

### 3. **Database Schema Changes**

#### New `chat_rooms` structure:
```sql
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES booking_requests(id), -- Optional now
  venue_id BIGINT REFERENCES venues(id),
  venue_name TEXT,
  event_date DATE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NEW
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NEW
  popup_name TEXT, -- NEW
  requirements TEXT, -- NEW
  special_requests TEXT, -- NEW
  instagram_handle TEXT, -- NEW
  website TEXT, -- NEW
  guest_count TEXT, -- NEW
  collaboration_types TEXT[], -- NEW
  created_at TIMESTAMP DEFAULT now()
);
```

#### Updated `booking_requests` (formerly `chat_requests`):
```sql
CREATE TABLE booking_requests (
  -- All existing fields plus:
  room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL -- NEW
);
```

## New Flow

### When User Clicks "Contact":

1. **API Call**: `/api/chat/create-room-and-request`
2. **Creates**:
   - Chat room immediately (with all form data)
   - Booking request with status 'pending'
   - Initial message in chat room
3. **Redirects**: User goes directly to chat room (`/chat/{room_id}`)

### Benefits:

1. **Immediate Communication**: Users can chat right away
2. **Better UX**: No waiting for approval to discuss details
3. **Separate Concerns**: Chat ≠ Booking approval
4. **Venue Owner Control**: Can still approve/reject space bookings
5. **Negotiation Friendly**: Parties can discuss terms before approval

### Booking Approval:

- Venue owners can approve/reject booking requests via `/api/booking/approve`
- Chat continues regardless of booking status
- Booking status can be displayed in chat UI

## Migration Steps:

1. Run `database/schema_changes.sql`
2. Update frontend to use new API endpoints
3. Update chat room fetching logic
4. Add booking request management UI

## API Endpoints:

- **Create**: `POST /api/chat/create-room-and-request`
- **Approve Booking**: `POST /api/booking/approve`
- **Update Booking**: `PUT /api/booking/approve`
- **Send Message**: `POST /api/chat/sendMessage` (unchanged)

This new flow provides a much better user experience while maintaining the venue owner's control over space bookings. 
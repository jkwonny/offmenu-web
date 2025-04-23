import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role to bypass RLS policies (only for server operations)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { request_id } = await request.json();

    // Validate required field
    if (!request_id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Start a transaction
    const { data: chatRequest, error: fetchError } = await supabaseAdmin
      .from('chat_requests')
      .select('event_id, venue_id, status')
      .eq('id', request_id)
      .single();

    if (fetchError) {
      console.error('Error fetching chat request:', fetchError);
      return NextResponse.json(
        { error: 'Chat request not found' },
        { status: 404 }
      );
    }

    // Check if the request is already approved
    if (chatRequest.status === 'approved') {
      return NextResponse.json(
        { error: 'Chat request already approved' },
        { status: 400 }
      );
    }

    // Update request status to 'approved'
    const { error: updateError } = await supabaseAdmin
      .from('chat_requests')
      .update({ status: 'approved' })
      .eq('id', request_id);

    if (updateError) {
      console.error('Error updating chat request:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve chat request' },
        { status: 500 }
      );
    }

    // Create a new chat room
    const { data: chatRoom, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .insert({
        request_id,
        event_id: chatRequest.event_id,
        venue_id: chatRequest.venue_id
      })
      .select('id')
      .single();

    if (roomError) {
      console.error('Error creating chat room:', roomError);
      return NextResponse.json(
        { error: 'Failed to create chat room' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      room_id: chatRoom.id
    });

  } catch (error) {
    console.error('Unexpected error in chat approval API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 
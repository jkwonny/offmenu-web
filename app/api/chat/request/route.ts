import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role to bypass RLS policies (only for server operations)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { event_id, venue_id, sender_id, recipient_id, message } = await request.json();

    console.log('event_id', event_id);
    console.log('venue_id', venue_id);
    console.log('sender_id', sender_id);
    console.log('recipient_id', recipient_id);
    console.log('message', message);

        // Validate required fields
    if (!event_id || !venue_id || !sender_id || !recipient_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert new chat request with status 'pending'
    const { data, error } = await supabaseAdmin
      .from('chat_requests')
      .insert({
        event_id,
        venue_id,
        sender_id,
        recipient_id,
        message,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating chat request:', error);
      return NextResponse.json(
        { error: 'Failed to create chat request' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      request_id: data.id,
      status: 'pending' 
    });

  } catch (error) {
    console.error('Unexpected error in chat request API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role to bypass RLS policies (only for server operations)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { booking_request_id } = await request.json();

    // Validate required field
    if (!booking_request_id) {
      return NextResponse.json(
        { error: 'Booking request ID is required' },
        { status: 400 }
      );
    }

    // Fetch the booking request
    const { data: bookingRequest, error: fetchError } = await supabaseAdmin
      .from('booking_requests')
      .select('id, status, room_id')
      .eq('id', booking_request_id)
      .single();

    if (fetchError) {
      console.error('Error fetching booking request:', fetchError);
      return NextResponse.json(
        { error: 'Booking request not found' },
        { status: 404 }
      );
    }

    // Check if the request is already approved
    if (bookingRequest.status === 'approved') {
      return NextResponse.json(
        { error: 'Booking request already approved' },
        { status: 400 }
      );
    }

    // Update request status to 'approved'
    const { error: updateError } = await supabaseAdmin
      .from('booking_requests')
      .update({ status: 'approved' })
      .eq('id', booking_request_id);

    if (updateError) {
      console.error('Error updating booking request:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve booking request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      booking_request_id,
      room_id: bookingRequest.room_id
    });

  } catch (error) {
    console.error('Unexpected error in booking approval API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { booking_request_id, status } = await request.json();

    // Validate required fields
    if (!booking_request_id || !status) {
      return NextResponse.json(
        { error: 'Booking request ID and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be either "approved" or "rejected"' },
        { status: 400 }
      );
    }

    // Update request status
    const { data, error: updateError } = await supabaseAdmin
      .from('booking_requests')
      .update({ status })
      .eq('id', booking_request_id)
      .select('id, room_id')
      .single();

    if (updateError) {
      console.error('Error updating booking request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      booking_request_id,
      status,
      room_id: data.room_id
    });

  } catch (error) {
    console.error('Unexpected error in booking update API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 
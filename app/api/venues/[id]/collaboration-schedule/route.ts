import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const venueId = id;

    const { data: venue, error } = await supabase
      .from('venues')
      .select('collaboration_schedule')
      .eq('id', venueId)
      .single();

    if (error) {
      console.error('Error fetching collaboration schedule:', error);
      return NextResponse.json(
        { error: 'Failed to fetch collaboration schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      venue_id: venueId,
      schedule: venue.collaboration_schedule || {
        default_weekly: {},
        date_overrides: {}
      }
    });
  } catch (error) {
    console.error('Error in collaboration schedule GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const venueId = id;
    const { schedule } = await request.json();

    // Validate schedule structure
    if (!schedule || typeof schedule !== 'object') {
      return NextResponse.json(
        { error: 'Invalid schedule format' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('venues')
      .update({ 
        collaboration_schedule: schedule,
        updated_at: new Date().toISOString()
      })
      .eq('id', venueId)
      .select('collaboration_schedule');

    if (error) {
      console.error('Error updating collaboration schedule:', error);
      return NextResponse.json(
        { error: 'Failed to update collaboration schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      venue_id: venueId,
      schedule: data[0].collaboration_schedule
    });
  } catch (error) {
    console.error('Error in collaboration schedule PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
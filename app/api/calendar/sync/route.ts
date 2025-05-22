import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncGoogleCalendarEvents } from '../../../lib/googleCalendarSync';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the current session to extract user information
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Parse request body to get venue ID and lookAheadDays
    const body = await request.json();
    const { venueId, lookAheadDays = 90 } = body;
    
    if (!venueId) {
      return NextResponse.json(
        { error: 'Venue ID is required' },
        { status: 400 }
      );
    }
    
    // Verify the user owns this venue
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id')
      .eq('id', venueId)
      .eq('owner_id', userId)
      .single();
    
    if (venueError || !venue) {
      return NextResponse.json(
        { error: 'Venue not found or you do not have permission to access it' },
        { status: 403 }
      );
    }
    
    // Sync Google Calendar events
    const syncResult = await syncGoogleCalendarEvents(userId, venueId, lookAheadDays);
    
    if (!syncResult.success) {
      return NextResponse.json(
        { error: syncResult.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: syncResult.message,
      count: syncResult.count
    });
    
  } catch (error) {
    console.error('Error syncing calendar:', error);
    return NextResponse.json(
      { error: 'Failed to sync calendar' },
      { status: 500 }
    );
  }
} 
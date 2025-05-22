import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Get request parameters
    const url = new URL(request.url);
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');
    const startTimeStr = url.searchParams.get('startTime'); 
    const endTimeStr = url.searchParams.get('endTime');
    
    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Create start and end datetime objects
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // If time is provided, set the hours
    if (startTimeStr) {
      const [hours, minutes] = startTimeStr.split(':').map(Number);
      startDate.setHours(hours, minutes, 0, 0);
    } else {
      startDate.setHours(0, 0, 0, 0); // Start of day
    }
    
    if (endTimeStr) {
      const [hours, minutes] = endTimeStr.split(':').map(Number);
      endDate.setHours(hours, minutes, 0, 0);
    } else {
      endDate.setHours(23, 59, 59, 999); // End of day
    }
    
    // First get all venues
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id')
      .eq('status', 'approved');
    
    if (venuesError) {
      console.error('Error fetching venues:', venuesError);
      return NextResponse.json(
        { error: 'Failed to fetch venues' },
        { status: 500 }
      );
    }
    
    if (!venues || venues.length === 0) {
      return NextResponse.json({ 
        availableVenueIds: [],
        unavailableVenueIds: []
      });
    }
    
    // Get all the venue IDs
    const venueIds = venues.map(venue => venue.id);
    
    // Get all venues with conflicting availability entries
    // A venue is unavailable if it has any entries during the requested period
    const { data: unavailableVenues, error: availabilityError } = await supabase
      .from('venue_availability')
      .select('venue_id')
      .in('venue_id', venueIds)
      .or(`start_time.lte.${endDate.toISOString()},end_time.gte.${startDate.toISOString()}`);
    
    if (availabilityError) {
      console.error('Error fetching venue availability:', availabilityError);
      return NextResponse.json(
        { error: 'Failed to check venue availability' },
        { status: 500 }
      );
    }
    
    // Create a set of unavailable venue IDs for efficient lookup
    const unavailableVenueIds = unavailableVenues.map((record: { venue_id: number | string }) => record.venue_id);
    
    // Filter available venue IDs (those not in the unavailable set)
    const availableVenueIds = venueIds.filter(id => !unavailableVenueIds.includes(id));
    
    return NextResponse.json({
      availableVenueIds,
      unavailableVenueIds
    });
  } catch (error) {
    console.error('Error checking venue availability:', error);
    return NextResponse.json(
      { error: 'Failed to check venue availability' },
      { status: 500 }
    );
  }
} 
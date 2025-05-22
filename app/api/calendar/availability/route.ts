import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get request parameters
    const url = new URL(request.url);
    const venueId = url.searchParams.get('venueId');
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');
    
    if (!venueId) {
      return NextResponse.json(
        { error: 'Venue ID is required' },
        { status: 400 }
      );
    }
    
    // Set default date range if not provided (current month)
    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    
    if (!startDateStr) {
      startDate.setDate(1); // First day of current month
      startDate.setHours(0, 0, 0, 0);
    }
    
    if (!endDateStr) {
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of current month
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Query availability within the date range
    const { data: availabilities, error } = await supabase
      .from('venue_availability')
      .select('*')
      .eq('venue_id', venueId)
      .gte('start_time', startDate.toISOString())
      .lte('end_time', endDate.toISOString())
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error('Error fetching venue availability:', error);
      return NextResponse.json(
        { error: 'Failed to fetch venue availability' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: availabilities
    });
  } catch (error) {
    console.error('Error getting venue availability:', error);
    return NextResponse.json(
      { error: 'Failed to get venue availability' },
      { status: 500 }
    );
  }
} 
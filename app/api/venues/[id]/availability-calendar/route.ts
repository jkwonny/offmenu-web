import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CollaborationType {
  type: string;
  amount: number;
  description?: string;
}

interface CalendarDay {
  date: string;
  status: 'blocked' | 'available';
  collaboration_types: CollaborationType[];
  source: 'blocked_time' | 'collaboration_rule';
  blocked_reason?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const venueId = id;
    const url = new URL(request.url);
    const startDateStr = url.searchParams.get('start_date');
    const endDateStr = url.searchParams.get('end_date');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Fetch venue collaboration schedule
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('collaboration_schedule')
      .eq('id', venueId)
      .single();

    if (venueError) {
      console.error('Error fetching venue:', venueError);
      return NextResponse.json(
        { error: 'Failed to fetch venue' },
        { status: 500 }
      );
    }

    // Fetch blocked times in the date range
    const { data: blockedTimes, error: blockedError } = await supabase
      .from('venue_availability')
      .select('*')
      .eq('venue_id', venueId)
      .gte('start_time', startDate.toISOString())
      .lte('end_time', endDate.toISOString());

    if (blockedError) {
      console.error('Error fetching blocked times:', blockedError);
      return NextResponse.json(
        { error: 'Failed to fetch blocked times' },
        { status: 500 }
      );
    }

    // Generate calendar data
    const calendarData: CalendarDay[] = [];
    const schedule = venue.collaboration_schedule || { default_weekly: {}, date_overrides: {} };
    
    // Create a set of blocked dates for quick lookup
    const blockedDates = new Set();
    blockedTimes?.forEach(blocked => {
      const startDate = new Date(blocked.start_time);
      const endDate = new Date(blocked.end_time);
      
      // Add all dates in the blocked range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        blockedDates.add(d.toISOString().split('T')[0]);
      }
    });

    // Iterate through each day in the range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Check if this date is blocked
      if (blockedDates.has(dateStr)) {
        calendarData.push({
          date: dateStr,
          status: 'blocked',
          collaboration_types: [],
          source: 'blocked_time',
          blocked_reason: 'Unavailable time set by venue owner'
        });
        continue;
      }

      // Check for date-specific overrides first
      let collaborationTypes: CollaborationType[] = [];
      
      if (schedule.date_overrides && schedule.date_overrides[dateStr]) {
        collaborationTypes = schedule.date_overrides[dateStr];
      } else if (schedule.default_weekly && schedule.default_weekly[dayOfWeek.toString()]) {
        // Use weekly default for this day of week
        collaborationTypes = schedule.default_weekly[dayOfWeek.toString()];
      }

      calendarData.push({
        date: dateStr,
        status: 'available',
        collaboration_types: collaborationTypes || [],
        source: 'collaboration_rule'
      });
    }

    return NextResponse.json({
      success: true,
      venue_id: venueId,
      start_date: startDateStr,
      end_date: endDateStr,
      calendar_data: calendarData
    });

  } catch (error) {
    console.error('Error in availability calendar GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
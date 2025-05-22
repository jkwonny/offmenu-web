import { getGoogleTokens } from './googleCalendar';
import { supabase } from './supabase';

const GOOGLE_CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3';

/**
 * Interface for Google Calendar event
 */
interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  recurrence?: string[];
}

/**
 * Interface for venue availability entry
 */
interface VenueAvailability {
  id?: string;
  venue_id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  recurring: boolean;
  recurrence_rule: string | null;
  google_event_id: string;
  external_id: null;
  source: 'google';
}

/**
 * Fetches events from Google Calendar for a specific venue
 * @param userId The user's ID
 * @param venueId The venue ID to sync with
 * @param lookAheadDays How many days ahead to fetch events for
 */
export async function syncGoogleCalendarEvents(
  userId: string,
  venueId: number,
  lookAheadDays = 90
): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    // Get Google tokens for the user
    const tokens = await getGoogleTokens(userId);
    
    if (!tokens || !tokens.access_token) {
      return { success: false, message: 'Google Calendar not connected or token is invalid' };
    }
    
    if (!tokens.calendar_id) {
      return { success: false, message: 'No primary calendar ID found' };
    }
    
    // Calculate time range for events
    const timeMin = new Date().toISOString();
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + lookAheadDays);
    
    // Fetch events from Google Calendar
    const eventsUrl = new URL(`${GOOGLE_CALENDAR_API_URL}/calendars/${encodeURIComponent(tokens.calendar_id)}/events`);
    eventsUrl.searchParams.append('timeMin', timeMin);
    eventsUrl.searchParams.append('timeMax', timeMax.toISOString());
    eventsUrl.searchParams.append('singleEvents', 'true'); // Expand recurring events
    eventsUrl.searchParams.append('maxResults', '2500'); // Maximum allowed by Google
    
    const response = await fetch(eventsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error fetching Google Calendar events:', errorData);
      return { success: false, message: `Failed to fetch events: ${errorData.error?.message || 'Unknown error'}` };
    }
    
    const eventData = await response.json();
    
    if (!eventData.items || !Array.isArray(eventData.items)) {
      return { success: false, message: 'No events found or invalid response format' };
    }
    
    // Process events and prepare for database insertion
    const events = eventData.items as GoogleCalendarEvent[];
    const availabilityEntries: VenueAvailability[] = [];
    
    for (const event of events) {
      // Skip events without proper time information
      if ((!event.start?.dateTime && !event.start?.date) || (!event.end?.dateTime && !event.end?.date)) {
        continue;
      }
      
      // Determine if it's an all-day event
      const isAllDay = Boolean(event.start.date && !event.start.dateTime);
      
      // Parse start and end times
      let startTime: string, endTime: string;
      
      if (isAllDay) {
        // For all-day events, set time to beginning and end of day
        const startDate = new Date(event.start.date!);
        const endDate = new Date(event.end.date!);
        // Subtract one day from end date since Google's all-day events end on the next day
        endDate.setDate(endDate.getDate() - 1);
        
        startTime = startDate.toISOString();
        endTime = new Date(endDate.setHours(23, 59, 59, 999)).toISOString();
      } else {
        startTime = new Date(event.start.dateTime!).toISOString();
        endTime = new Date(event.end.dateTime!).toISOString();
      }
      
      // Check if event has recurrence
      const hasRecurrence = Boolean(event.recurrence && event.recurrence.length > 0);
      const recurrenceRule = hasRecurrence ? event.recurrence!.find(r => r.startsWith('RRULE:')) : null;
      
      // Create availability entry
      availabilityEntries.push({
        venue_id: venueId,
        title: event.summary || 'Untitled Event',
        description: event.description || null,
        start_time: startTime,
        end_time: endTime,
        all_day: isAllDay,
        recurring: hasRecurrence,
        recurrence_rule: recurrenceRule ? recurrenceRule.substring(6) : null, // Remove 'RRULE:' prefix
        google_event_id: event.id,
        external_id: null,
        source: 'google'
      });
    }
    
    if (availabilityEntries.length === 0) {
      return { success: true, message: 'No events to sync', count: 0 };
    }
    
    // Get existing Google-sourced events for this venue to avoid duplicates
    const { data: existingEvents, error: fetchError } = await supabase
      .from('venue_availability')
      .select('google_event_id')
      .eq('venue_id', venueId)
      .eq('source', 'google');
    
    if (fetchError) {
      console.error('Error fetching existing events:', fetchError);
      return { success: false, message: 'Failed to check existing events' };
    }
    
    // Create a set of existing Google event IDs for fast lookup
    const existingEventIds = new Set(existingEvents?.map(e => e.google_event_id) || []);
    
    // Filter out events that already exist
    const newEvents = availabilityEntries.filter(e => !existingEventIds.has(e.google_event_id));
    
    if (newEvents.length === 0) {
      return { success: true, message: 'All events are already synced', count: 0 };
    }
    
    // Insert new events
    const { error: insertError } = await supabase
      .from('venue_availability')
      .insert(newEvents);
    
    if (insertError) {
      console.error('Error inserting events:', insertError);
      return { success: false, message: 'Failed to insert events' };
    }
    
    return { 
      success: true, 
      message: `Successfully synced ${newEvents.length} events`,
      count: newEvents.length
    };
  } catch (error) {
    console.error('Error syncing Google Calendar events:', error);
    return { 
      success: false, 
      message: `Error syncing events: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
} 
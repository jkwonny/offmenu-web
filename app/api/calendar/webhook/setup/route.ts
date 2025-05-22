import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGoogleTokens } from '../../../../lib/googleCalendar';
import { v4 as uuidv4 } from 'uuid';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

// Google Calendar API 
const WATCH_ENDPOINT = 'https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/watch';

// Store webhook channels to handle renewals and expirations
const WEBHOOK_TABLE = 'google_calendar_webhooks';

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
    
    // Get request body
    const body = await request.json();
    const { venueId } = body;
    
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
    
    // Get Google tokens for the user
    const tokens = await getGoogleTokens(userId);
    
    if (!tokens || !tokens.access_token) {
      return NextResponse.json(
        { error: 'Google Calendar not connected or token is invalid' },
        { status: 400 }
      );
    }
    
    if (!tokens.calendar_id) {
      return NextResponse.json(
        { error: 'No primary calendar ID found' },
        { status: 400 }
      );
    }
    
    // Create a unique channel ID for this webhook
    const channelId = uuidv4();
    
    // Calculate expiration (Google maximum is 7 days)
    const expirationTime = new Date();
    expirationTime.setDate(expirationTime.getDate() + 7); // 7 days from now
    
    // Setup webhook for calendar changes
    const watchUrl = WATCH_ENDPOINT.replace('{calendarId}', encodeURIComponent(tokens.calendar_id));
    const response = await fetch(watchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: `${siteUrl}/api/calendar/webhook/notifications`,
        expiration: expirationTime.getTime().toString(),
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error setting up Google Calendar webhook:', errorData);
      return NextResponse.json(
        { error: `Failed to setup webhook: ${errorData.error?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
    
    const webhookData = await response.json();
    
    // Store webhook information in the database
    // First, check if there's an existing webhook for this venue/user/calendar
    const { data: existingWebhook } = await supabase
      .from(WEBHOOK_TABLE)
      .select('id')
      .eq('venue_id', venueId)
      .eq('user_id', userId)
      .eq('calendar_id', tokens.calendar_id)
      .single();
    
    // If webhook exists, update it, otherwise insert a new one
    const webhookRecord = {
      channel_id: webhookData.id,
      resource_id: webhookData.resourceId,
      calendar_id: tokens.calendar_id,
      user_id: userId,
      venue_id: venueId,
      expiration: new Date(parseInt(webhookData.expiration)).toISOString(),
    };
    
    let dbOperation;
    if (existingWebhook) {
      dbOperation = supabase
        .from(WEBHOOK_TABLE)
        .update(webhookRecord)
        .eq('id', existingWebhook.id);
    } else {
      dbOperation = supabase
        .from(WEBHOOK_TABLE)
        .insert(webhookRecord);
    }
    
    const { error: dbError } = await dbOperation;
    
    if (dbError) {
      console.error('Error storing webhook information:', dbError);
      return NextResponse.json(
        { error: 'Failed to store webhook information' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Webhook setup successfully',
      expiresAt: webhookData.expiration,
    });
  } catch (error) {
    console.error('Error setting up webhook:', error);
    return NextResponse.json(
      { error: 'Failed to setup webhook' },
      { status: 500 }
    );
  }
} 
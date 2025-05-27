import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncGoogleCalendarEvents } from '../../../../lib/googleCalendarSync';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Store webhook channels to handle renewals and expirations
const WEBHOOK_TABLE = 'google_calendar_webhooks';

/**
 * Handles push notifications from Google Calendar.
 * Google sends a POST request to this endpoint when events change in a watched calendar.
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase admin client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get headers from the notification
    const channelId = request.headers.get('X-Goog-Channel-ID');
    const resourceState = request.headers.get('X-Goog-Resource-State');
    const messageNumber = request.headers.get('X-Goog-Message-Number');
    
    console.log(`Received Google Calendar notification: Channel: ${channelId}, State: ${resourceState}, Message: ${messageNumber}`);
    
    if (!channelId) {
      console.error('Missing channel ID in webhook notification');
      return NextResponse.json(
        { error: 'Missing channel ID' },
        { status: 400 }
      );
    }
    
    // Find the webhook configuration in the database
    const { data: webhook, error: webhookError } = await supabase
      .from(WEBHOOK_TABLE)
      .select('*')
      .eq('channel_id', channelId)
      .single();
    
    if (webhookError || !webhook) {
      console.error('Webhook not found in database:', webhookError);
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }
    
    // Handle different notification types
    switch (resourceState) {
      case 'sync':
        // Initial sync notification, no action needed
        console.log('Initial sync notification received');
        break;
        
      case 'exists':
        // A change has occurred, sync calendar events
        
        // Before syncing, clear existing Google events for this venue
        // This ensures deleted events are properly removed
        const { error: deleteError } = await supabase
          .from('venue_availability')
          .delete()
          .eq('venue_id', webhook.venue_id)
          .eq('source', 'google');
        
        if (deleteError) {
          console.error('Error clearing existing events:', deleteError);
        }
        
        // Re-sync events from Google Calendar
        const syncResult = await syncGoogleCalendarEvents(
          webhook.user_id,
          webhook.venue_id,
          90 // Default to 90 days ahead
        );
        
        if (!syncResult.success) {
          console.error('Error syncing events after notification:', syncResult.message);
          return NextResponse.json(
            { error: 'Failed to sync events' },
            { status: 500 }
          );
        }
        
        console.log(`Successfully synced ${syncResult.count} events after notification`);
        break;
        
      case 'not_exists':
        // Resource was deleted, no action needed
        console.log('Resource deleted notification received');
        break;
        
      default:
        console.log(`Unknown resource state: ${resourceState}`);
    }
    
    // Respond with 200 status to acknowledge receipt
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error handling Google Calendar webhook notification:', error);
    return NextResponse.json(
      { error: 'Failed to process notification' },
      { status: 500 }
    );
  }
} 
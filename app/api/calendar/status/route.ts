import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasConnectedGoogleCalendar } from '../../../lib/googleCalendar';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
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
    
    // Check if the user has connected Google Calendar
    const isConnected = await hasConnectedGoogleCalendar(userId);
    
    return NextResponse.json({
      connected: isConnected
    });
  } catch (error) {
    console.error('Error checking Google Calendar status:', error);
    return NextResponse.json(
      { error: 'Failed to check Google Calendar status' },
      { status: 500 }
    );
  }
} 
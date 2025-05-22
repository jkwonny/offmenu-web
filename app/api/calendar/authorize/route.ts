import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/calendar/callback`;
const clientId = process.env.GOOGLE_CLIENT_ID!;

// Google OAuth endpoints
const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

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
    
    // State parameter will contain the user ID for verification in the callback
    const state = session.user.id;
    
    // Generate the authorization URL
    const googleAuthUrl = new URL(authUrl);
    googleAuthUrl.searchParams.append('client_id', clientId);
    googleAuthUrl.searchParams.append('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.append('response_type', 'code');
    googleAuthUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/calendar');
    googleAuthUrl.searchParams.append('access_type', 'offline');
    googleAuthUrl.searchParams.append('prompt', 'consent'); // Force to show consent screen to get refresh token
    googleAuthUrl.searchParams.append('state', state);
    
    // Redirect to Google's OAuth consent screen
    return NextResponse.redirect(googleAuthUrl.toString());
  } catch (error) {
    console.error('Error initiating Google OAuth flow:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google OAuth flow' },
      { status: 500 }
    );
  }
} 
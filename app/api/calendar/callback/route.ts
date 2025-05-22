import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/calendar/callback`;
const clientId = process.env.GOOGLE_CLIENT_ID!;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

// Google OAuth endpoints
const tokenUrl = 'https://oauth2.googleapis.com/token';
const calendarListUrl = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';

interface CalendarItem {
  id: string;
  primary?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state'); // This contains the user ID
    const error = requestUrl.searchParams.get('error');
    
    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/manage?error=google_auth`);
    }
    
    // Validate required parameters
    if (!code || !state) {
      console.error('Missing code or state parameter');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/manage?error=invalid_request`);
    }
    
    // Exchange the code for tokens
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Error exchanging auth code for tokens:', tokenData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/manage?error=token_exchange`);
    }
    
    // Get user's primary calendar ID
    const calendarResponse = await fetch(calendarListUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    
    const calendarData = await calendarResponse.json();
    
    // Find primary calendar
    let primaryCalendarId = null;
    if (calendarResponse.ok && calendarData.items) {
      const primaryCalendar = calendarData.items.find((cal: CalendarItem) => cal.primary === true);
      if (primaryCalendar) {
        primaryCalendarId = primaryCalendar.id;
      }
    }
    
    // Calculate token expiry time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
    
    // Store the tokens in Supabase
    const { error: dbError } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        user_id: state,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        calendar_id: primaryCalendarId,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .match({ user_id: state });
    
    if (dbError) {
      console.error('Error storing tokens in database:', dbError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/manage?error=database`);
    }
    
    // Redirect to success page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/manage?calendar=connected`);
  } catch (error) {
    console.error('Error handling Google OAuth callback:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/manage?error=server`);
  }
} 
import { supabase } from './supabase';

// Get environment variables
const clientId = process.env.GOOGLE_CLIENT_ID!;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
const tokenUrl = 'https://oauth2.googleapis.com/token';

type GoogleTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  calendar_id: string | null;
};

/**
 * Gets Google Calendar tokens for a user, refreshing if necessary
 */
export async function getGoogleTokens(userId: string): Promise<GoogleTokens | null> {
  try {
    // Fetch current tokens from database
    const { data: tokenData, error } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !tokenData) {
      console.error('Error fetching Google tokens:', error);
      return null;
    }
    
    // Check if token is expired or about to expire (within 5 minutes)
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    // If token is still valid, return it
    if (expiresAt > fiveMinutesFromNow) {
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        calendar_id: tokenData.calendar_id,
      };
    }
    
    // Otherwise, refresh the token
    const refreshedTokens = await refreshGoogleToken(tokenData.refresh_token, userId);
    return refreshedTokens;
  } catch (error) {
    console.error('Error in getGoogleTokens:', error);
    return null;
  }
}

/**
 * Refreshes an expired Google token
 */
export async function refreshGoogleToken(
  refreshToken: string,
  userId: string
): Promise<GoogleTokens | null> {
  try {
    // Request new access token using refresh token
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error refreshing token:', data);
      return null;
    }
    
    // Calculate new expiry time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);
    
    // Update tokens in database
    const { data: updatedToken, error } = await supabase
      .from('google_calendar_tokens')
      .update({
        access_token: data.access_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating refreshed token in database:', error);
      return null;
    }
    
    return {
      access_token: updatedToken.access_token,
      refresh_token: updatedToken.refresh_token,
      expires_at: updatedToken.expires_at,
      calendar_id: updatedToken.calendar_id,
    };
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return null;
  }
}

/**
 * Checks if a user has connected their Google Calendar
 */
export async function hasConnectedGoogleCalendar(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('google_calendar_tokens')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking Google Calendar connection:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error in hasConnectedGoogleCalendar:', error);
    return false;
  }
} 
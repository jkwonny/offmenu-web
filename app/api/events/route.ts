import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

// Helper function to check Supabase connection
async function checkSupabaseConnection() {
  try {
    // A simple query to check connection
    const { error } = await supabase.from('events').select('id').limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return { ok: false, error: error.message };
    }
    
    return { ok: true };
  } catch (err) {
    console.error('Failed to connect to Supabase:', err);
    return { 
      ok: false, 
      error: err instanceof Error ? err.message : 'Unknown connection error' 
    };
  }
}

export async function POST(request: Request) {
  try {
    // First check if Supabase is accessible
    const connectionCheck = await checkSupabaseConnection();
    if (!connectionCheck.ok) {
      return NextResponse.json({ 
        error: 'Failed to connect to database', 
        details: connectionCheck.error 
      }, { status: 503 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.title|| !body.expected_capacity_min || !body.expected_capacity_max) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure event_type is set with a default if missing
    const eventType = body.event_type || 'Other';
    
    // Insert the event
    const { data, error } = await supabase
      .from('events')
      .insert({
        user_id: body.user_id,
        title: body.title,
        description: body.description,
        selected_date: body.selected_date,
        selected_time: body.selected_time,
        expected_capacity_min: body.expected_capacity_min,
        expected_capacity_max: body.expected_capacity_max,
        assets_needed: body.assets_needed || [],
        event_type: eventType,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insertion error:', error);
      return NextResponse.json({ error: 'Failed to create event', details: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    console.error('API Error:', error);
    let errorMessage = 'An unexpected error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ error: 'Failed to process request', details: errorMessage }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // First check if Supabase is accessible
    const connectionCheck = await checkSupabaseConnection();
    if (!connectionCheck.ok) {
      return NextResponse.json({ 
        error: 'Failed to connect to database', 
        details: connectionCheck.error 
      }, { status: 503 });
    }
    
    // Get URL params to check if we want to include inquiries
    const { searchParams } = new URL(request.url);
    const includeInquiries = searchParams.get('includeInquiries') === 'true';
    
    // Start building the query
    let query = supabase
      .from('events')
      .select('*, event_images(*)')
      .eq('is_active', true);
    
    // Filter out inquiries unless specifically requested
    if (!includeInquiries) {
      query = query.not('event_type', 'eq', 'Inquiry');
    }
    
    const { data, error } = await query.order('selected_date', { ascending: true });

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch events', details: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error('API Error:', error);
    let errorMessage = 'An unexpected error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ error: 'Failed to fetch events', details: errorMessage }, { status: 500 });
  }
} 
import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/app/lib/supabase';

async function checkSupabaseConnection() {
  try {
    // A simple query to check connection
    const { error } = await supabase.from('venues').select('id').limit(1);
    
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

export async function PATCH(
  request: NextRequest,
  { params } : { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // First check if Supabase is accessible
    const connectionCheck = await checkSupabaseConnection();
    if (!connectionCheck.ok) {
      return NextResponse.json({
        error: 'Failed to connect to database',
        details: connectionCheck.error
      }, { status: 503 });
    }

    // Get the status from request body
    const { status } = await request.json();
    
    // Validate status
    if (!status || !['pending', 'approved', 'declined'].includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status value. Must be "pending", "approved", or "declined"' 
      }, { status: 400 });
    }

    // Update venue status in database
    const { data, error } = await supabase
      .from('venues')
      .update({ status })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ 
        error: 'Failed to update venue status', 
        details: error.message 
      }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    return NextResponse.json(data[0], { status: 200 });
  } catch (error: unknown) {
    console.error('API Error:', error);
    let errorMessage = 'An unexpected error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ 
      error: 'Failed to update venue status', 
      details: errorMessage 
    }, { status: 500 });
  }
} 
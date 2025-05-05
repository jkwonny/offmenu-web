import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role to bypass RLS policies
const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseServiceKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { message, review, userId, username } = await request.json();

    // Validate inputs
    if (!review || review < 1 || review > 5) {
      return NextResponse.json({ error: 'Invalid rating value' }, { status: 400 });
    }

    // Insert feedback into the database using admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('feedback_messages')
      .insert({
        message: message || null,
        review,
        user_id: userId || null,
        username: username || null,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error inserting feedback:', error);
      return NextResponse.json(
        { error: 'Failed to save feedback', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      id: data.id
    });
  } catch (error) {
    console.error('Unexpected error in feedback API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Failed to process feedback', details: errorMessage },
      { status: 500 }
    );
  }
} 
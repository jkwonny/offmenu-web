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

export async function GET(
  request: NextRequest,
  { params } : { params: Promise<{ id: string }> }
) {
  const { id } = await params;



  try {
    const connectionCheck = await checkSupabaseConnection();
    if (!connectionCheck.ok) {
      return NextResponse.json({
        error: 'Failed to connect to database',
        details: connectionCheck.error
      }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('venues')
      .select(`
        *,
        venue_images(image_url, sort_order)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch venue', details: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const venue = {
      ...data,
      venue_images: data.venue_images || [],
      id: data.id.toString(),
      latitude: parseFloat(data.latitude) || 0,
      longitude: parseFloat(data.longitude) || 0,
      price: data.price ? parseFloat(data.price) : undefined,
      min_hours: data.min_hours ? parseInt(data.min_hours) : undefined,
      max_guests: data.max_guests ? parseInt(data.max_guests) : 0,
      rental_type: data.rental_type || [],
      tags: data.tags || [],
    };

    return NextResponse.json(venue, { status: 200 });
  } catch (error: unknown) {
    console.error('API Error:', error);
    let errorMessage = 'An unexpected error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ error: 'Failed to fetch venue', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  let updateData;

  try {
    updateData = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  // Basic validation
  if (!updateData || Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
  }
  if (updateData.name !== undefined && !updateData.name.trim()) {
    return NextResponse.json({ error: 'Venue name cannot be empty' }, { status: 400 });
  }

  // TODO: Add more comprehensive validation based on your schema and requirements
  // For example, check data types, ranges for numeric values, etc.

  // Ensure `id`, `owner_id`, `created_at`, `updated_at` are not in the update payload from client
  // Or if they are, they are ignored by Supabase or handled appropriately.
  // Typically, these are managed by the database or backend logic.
  delete updateData.id; // Should not update the ID itself
  delete updateData.owner_id; // Owner should generally not be changed this way
  delete updateData.created_at;
  delete updateData.updated_at;
  delete updateData.venue_images; // Image relations are handled by separate API calls
  delete updateData.image_urls; // This is a frontend construct for initial data

  // Convert specific fields if necessary, e.g., string to number for Supabase
  if (updateData.max_guests && typeof updateData.max_guests === 'string') {
    updateData.max_guests = parseInt(updateData.max_guests, 10);
    if (isNaN(updateData.max_guests)) {
        return NextResponse.json({ error: 'Invalid number for max_guests' }, { status: 400 });
    }
  }
  if (updateData.latitude && typeof updateData.latitude === 'string') {
    updateData.latitude = parseFloat(updateData.latitude);
     if (isNaN(updateData.latitude)) {
        return NextResponse.json({ error: 'Invalid number for latitude' }, { status: 400 });
    }
  }
  if (updateData.longitude && typeof updateData.longitude === 'string') {
    updateData.longitude = parseFloat(updateData.longitude);
    if (isNaN(updateData.longitude)) {
        return NextResponse.json({ error: 'Invalid number for longitude' }, { status: 400 });
    }
  }
  // If tags are sent as a string from the form, but DB expects an array
  if (updateData.tags && typeof updateData.tags === 'string') {
    updateData.tags = updateData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);
  }
  // rental_type should already be an array from the form/client
  if (updateData.rental_type && !Array.isArray(updateData.rental_type)) {
    // Handle error or try to convert if it makes sense for your setup
    return NextResponse.json({ error: 'rental_type must be an array' }, { status: 400 });
  }


  try {
    const connectionCheck = await checkSupabaseConnection();
    if (!connectionCheck.ok) {
      return NextResponse.json({
        error: 'Failed to connect to database',
        details: connectionCheck.error
      }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('venues')
      .update(updateData)
      .eq('id', id)
      .select()
      .single(); // Use .single() if you expect one record to be updated and returned

    if (error) {
      console.error('Supabase update error:', error);
      if (error.code === 'PGRST204') { // PostgREST code for no rows found
        return NextResponse.json({ error: 'Venue not found or no changes made' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to update venue', details: error.message }, { status: 500 });
    }

    if (!data) {
        // This case might be covered by error.code PGRST204 if .single() is used and no row is found
        return NextResponse.json({ error: 'Venue not found after update attempt' }, { status: 404 });
    }

    // Return the updated venue data
    // You might want to refetch it with relations like in GET if client expects full data
    return NextResponse.json(data, { status: 200 });

  } catch (error: unknown) {
    console.error('API Error in PUT [id]:', error);
    let errorMessage = 'An unexpected error occurred during update';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ error: 'Failed to process update request', details: errorMessage }, { status: 500 });
  }
}

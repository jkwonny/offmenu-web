import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; // Corrected path to supabase

export async function GET(
    request: Request,
    { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    try {
        const params = await paramsPromise;
        const { id } = params;

        if (!id) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        // Fetch the event by ID
        const { data, error } = await supabase
            .from('events')
            .select('*, event_images(*)') // Assuming you want to fetch related images
            .eq('id', id)
            .single();

        if (error) {
            console.error('Supabase fetch error:', error);
            if (error.code === 'PGRST116') { // PGRST116: "Searched for a single row, but found no rows" or "Searched for a single row, but found multiple rows"
                 return NextResponse.json({ error: 'Event not found' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Failed to fetch event', details: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
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
        return NextResponse.json({ error: 'Failed to process request', details: errorMessage }, { status: 500 });
    }
} 
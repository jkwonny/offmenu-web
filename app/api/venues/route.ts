import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

// Helper function to check Supabase connection
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

        const venueData = await request.json();

        // Validate required fields based on SQL schema
        if (!venueData.name) {
            return NextResponse.json({ error: 'Venue name is required' }, { status: 400 });
        }

        // Process rental_type if it's a comma-separated string
        if (venueData.rental_type && typeof venueData.rental_type === 'string') {
            // Convert comma-separated string to array for TEXT[] field
            venueData.rental_type = venueData.rental_type.split(',').filter((type: string) => type.trim() !== '');
        }

        // Process tags if it's a string or comma-separated string
        if (venueData.tags && typeof venueData.tags === 'string' && !Array.isArray(venueData.tags)) {
            venueData.tags = venueData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag !== '');
        }

        // Insert data into Supabase
        const { data, error } = await supabase
            .from('venues')
            .insert([venueData])
            .select();

        if (error) {
            console.error('Supabase insertion error:', error);
            return NextResponse.json({ error: 'Failed to create venue', details: error.message }, { status: 500 });
        }

        // Successfully created
        return NextResponse.json(data[0], { status: 201 });

    } catch (error: unknown) { // Catch error as unknown
        console.error('API Error:', error);
        let errorMessage = 'An unexpected error occurred';
        // Type guard to check if it's an Error object
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: 'Failed to process request', details: errorMessage }, { status: 500 });
    }
}

// Add GET method to fetch venues
export async function GET() {
    try {
        // First check if Supabase is accessible
        const connectionCheck = await checkSupabaseConnection();
        if (!connectionCheck.ok) {
            return NextResponse.json({ 
                error: 'Failed to connect to database', 
                details: connectionCheck.error 
            }, { status: 503 });
        }

        const { data, error } = await supabase
            .from('venues')
            .select('*');

        if (error) {
            console.error('Supabase fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch venues', details: error.message }, { status: 500 });
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
        return NextResponse.json({ error: 'Failed to fetch venues', details: errorMessage }, { status: 500 });
    }
} 
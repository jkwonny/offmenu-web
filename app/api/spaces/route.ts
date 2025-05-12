import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

// Helper function to check Supabase connection
async function checkSupabaseConnection() {
    try {
        // A simple query to check connection
        const { error } = await supabase.from('spaces').select('id').limit(1);
        
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

export async function POST(request: NextRequest) {
    try {
        // First check if Supabase is accessible
        const connectionCheck = await checkSupabaseConnection();
        if (!connectionCheck.ok) {
            return NextResponse.json({ 
                error: 'Failed to connect to database', 
                details: connectionCheck.error 
            }, { status: 503 });
        }

        const spaceData = await request.json();

        // Validate required fields based on SQL schema
        if (!spaceData.name) {
            return NextResponse.json({ error: 'Space name is required' }, { status: 400 });
        }

        // Process rental_type if it's a comma-separated string
        if (spaceData.rental_type && typeof spaceData.rental_type === 'string') {
            // Convert comma-separated string to array for TEXT[] field
            spaceData.rental_type = spaceData.rental_type.split(',').filter((type: string) => type.trim() !== '');
        }

        // Process tags if it's a string or comma-separated string
        if (spaceData.tags && typeof spaceData.tags === 'string' && !Array.isArray(spaceData.tags)) {
            spaceData.tags = spaceData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag !== '');
        }

        // Process availability and amenities
        if (spaceData.availability && typeof spaceData.availability === 'string') {
            spaceData.availability = spaceData.availability.split(',').filter((item: string) => item.trim() !== '');
        }
        
        if (spaceData.amenities && typeof spaceData.amenities === 'string') {
            spaceData.amenities = spaceData.amenities.split(',').filter((item: string) => item.trim() !== '');
        }

        // Insert data into Supabase
        const { data, error } = await supabase
            .from('spaces')
            .insert([spaceData])
            .select();

        if (error) {
            console.error('Supabase insertion error:', error);
            return NextResponse.json({ error: 'Failed to create space', details: error.message }, { status: 500 });
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

// Add GET method to fetch spaces
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
            .from('spaces')
            .select('*');

        if (error) {
            console.error('Supabase fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch spaces', details: error.message }, { status: 500 });
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
        return NextResponse.json({ error: 'Failed to fetch spaces', details: errorMessage }, { status: 500 });
    }
} 
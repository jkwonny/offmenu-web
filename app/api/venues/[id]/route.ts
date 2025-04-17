import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { checkSupabaseConnection } from '../route';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
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
            .select(`
                *,
                venue_images(image_url, sort_order)
            `)
            .eq('id', params.id)
            .single();

        if (error) {
            console.error('Supabase fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch venue', details: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
        }

        // Transform the data to match our Venue interface
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
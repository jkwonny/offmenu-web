import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const {
            address,
            street_number,
            street_name,
            neighborhood,
            city,
            state,
            postal_code,
            latitude,
            longitude
        } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        if (!address) {
            return NextResponse.json({ error: 'Address is required' }, { status: 400 });
        }

        // Update the event address
        const { data, error } = await supabase
            .from('events')
            .update({
                address,
                street_number,
                street_name,
                neighborhood,
                city,
                state,
                postal_code,
                latitude,
                longitude,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Supabase update error:', error);
            return NextResponse.json({ error: 'Failed to update event address', details: error.message }, { status: 500 });
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
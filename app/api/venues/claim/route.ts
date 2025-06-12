import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

const ADMIN_USER_ID = 'd03d1efd-7b00-4828-ac89-4f3f55b830d4';

export async function POST(request: NextRequest) {
    try {
        const { venueId } = await request.json();
        
        // Get the authenticated user
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if venue exists and is claimable by this user
        const { data: venue, error: venueError } = await supabase
            .from('venues')
            .select('*')
            .eq('id', venueId)
            .eq('contact_email', user.email)
            .eq('owner_id', ADMIN_USER_ID)
            .single();

        if (venueError || !venue) {
            return NextResponse.json({ 
                error: 'Venue not found or not claimable by this user' 
            }, { status: 404 });
        }

        // Transfer ownership
        const { error: updateError } = await supabase
            .from('venues')
            .update({
                owner_id: user.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', venueId);

        if (updateError) {
            console.error('Error claiming venue:', updateError);
            return NextResponse.json({ 
                error: 'Failed to claim venue' 
            }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Venue claimed successfully' 
        });

    } catch (error) {
        console.error('Error in venue claim endpoint:', error);
        return NextResponse.json({ 
            error: 'Internal server error' 
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        // Get the authenticated user
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get claimable venues for this user
        const { data: venues, error: venuesError } = await supabase
            .from('venues')
            .select(`
                id,
                name,
                address,
                city,
                contact_email,
                venue_images(id, image_url, sort_order)
            `)
            .eq('contact_email', user.email)
            .eq('owner_id', ADMIN_USER_ID);

        if (venuesError) {
            console.error('Error fetching claimable venues:', venuesError);
            return NextResponse.json({ 
                error: 'Failed to fetch claimable venues' 
            }, { status: 500 });
        }

        return NextResponse.json({ venues: venues || [] });

    } catch (error) {
        console.error('Error in claimable venues endpoint:', error);
        return NextResponse.json({ 
            error: 'Internal server error' 
        }, { status: 500 });
    }
} 
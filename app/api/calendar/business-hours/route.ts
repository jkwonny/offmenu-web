import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Get environment variables for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client to bypass RLS
const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

interface BusinessHour {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
}

interface VenueBusinessHour {
    venue_id: number;
    days_of_week: number[];
    start_time: string;
    end_time: string;
}

// Helper function to check Supabase connection
async function checkSupabaseConnection() {
    try {
        // A simple query to check connection
        const { error } = await supabase.from('venue_business_hours').select('venue_id').limit(1);
        
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

export async function GET(request: NextRequest) {
    try {
        // First check if Supabase is accessible
        const connectionCheck = await checkSupabaseConnection();
        if (!connectionCheck.ok) {
            return NextResponse.json({ 
                error: 'Failed to connect to database', 
                details: connectionCheck.error 
            }, { status: 503 });
        }


        // Get venueId from query params
        const searchParams = request.nextUrl.searchParams;
        const venueId = searchParams.get('venueId');

        if (!venueId) {
            return NextResponse.json({ error: 'Venue ID is required' }, { status: 400 });
        }

        // Fetch business hours from database
        const { data, error } = await supabase
            .from('venue_business_hours')
            .select('*')
            .eq('venue_id', venueId);

        if (error) {
            console.error('Error fetching business hours:', error);
            return NextResponse.json({ error: 'Failed to fetch business hours' }, { status: 500 });
        }

        // Format business hours for client
        const businessHours: BusinessHour[] = data.map((hour: VenueBusinessHour) => ({
            daysOfWeek: hour.days_of_week,
            startTime: hour.start_time,
            endTime: hour.end_time
        }));

        return NextResponse.json({ data: businessHours });
    } catch (error) {
        console.error('Error in business hours GET:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Check if admin client is accessible
        if (!supabaseAdmin) {
            return NextResponse.json({ 
                error: 'Failed to initialize admin database connection'
            }, { status: 503 });
        }

        // Parse request body
        const body = await request.json();
        const { venueId, businessHours } = body;

        if (!venueId || !businessHours) {
            return NextResponse.json({ error: 'Venue ID and business hours are required' }, { status: 400 });
        }

        // Start a transaction to delete old hours and insert new ones
        const { error: deleteError } = await supabaseAdmin
            .from('venue_business_hours')
            .delete()
            .eq('venue_id', venueId);

        if (deleteError) {
            console.error('Error deleting existing business hours:', deleteError);
            return NextResponse.json({ error: 'Failed to update business hours' }, { status: 500 });
        }

        // Insert new business hours
        if (businessHours.length > 0) {
            const hoursToInsert = businessHours.map((hour: BusinessHour) => ({
                venue_id: venueId,
                days_of_week: hour.daysOfWeek,
                start_time: hour.startTime,
                end_time: hour.endTime
            }));

            const { error: insertError } = await supabaseAdmin
                .from('venue_business_hours')
                .insert(hoursToInsert);

            if (insertError) {
                console.error('Error inserting business hours:', insertError);
                return NextResponse.json({ error: 'Failed to save business hours' }, { status: 500 });
            }
        }

        return NextResponse.json({ message: 'Business hours updated successfully' });
    } catch (error) {
        console.error('Error in business hours POST:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 
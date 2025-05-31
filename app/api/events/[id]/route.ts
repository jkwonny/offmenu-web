import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { createClient } from '@supabase/supabase-js';

async function checkSupabaseConnection() {
    try {
        // A simple query to check connection
        const { error } = await supabase.from('events').select('id').limit(1);
        
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

// Get environment variables for admin client (for storage operations)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service role to bypass RLS policies for storage operations
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

// Interface for event image
interface EventImage {
    id: number;
    event_id: string;
    image_url: string;
    sort_order: number;
    created_at: string;
}

// Interface for event with images
interface EventWithImages {
    id: string;
    title: string;
    description?: string;
    event_type: string;
    selected_date: string;
    selected_time?: string;
    expected_capacity_min?: number;
    expected_capacity_max?: number;
    assets_needed?: string[];
    is_active: boolean;
    user_id: string;
    owner_id?: string;
    created_at: string;
    updated_at: string;
    event_images?: EventImage[];
}

// Helper function to extract file path from Supabase storage URL
const getPathFromUrl = (url: string): string | null => {
    try {
        const parsedUrl = new URL(url);
        const pathSegments = parsedUrl.pathname.split('/');
        const bucketNameIndex = pathSegments.findIndex(segment => segment === 'event-photos');
        if (bucketNameIndex !== -1 && bucketNameIndex < pathSegments.length - 1) {
            return pathSegments.slice(bucketNameIndex).join('/');
        }
        return null;
    } catch (error) {
        console.error('Error parsing URL to get path:', error);
        return null;
    }
};

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

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
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

        if (!id) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        // First, fetch the event to check if it exists and get associated images
        const { data: eventData, error: fetchError } = await supabase
            .from('events')
            .select('*, event_images(*)')
            .eq('id', id)
            .single();

        if (fetchError) {
            console.error('Supabase fetch error:', fetchError);
            if (fetchError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Event not found' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Failed to fetch event', details: fetchError.message }, { status: 500 });
        }

        if (!eventData) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Type the eventData properly
        const typedEventData = eventData as EventWithImages;

        // Delete associated images from storage first (using admin client for storage operations)
        const imageUrls = typedEventData.event_images?.map((img: EventImage) => img.image_url) || [];
        const failedImageDeletions: string[] = [];

        if (imageUrls.length > 0) {
            for (const imageUrl of imageUrls) {
                const filePath = getPathFromUrl(imageUrl);
                if (filePath) {
                    const { error: storageError } = await supabaseAdmin.storage
                        .from('event-photos')
                        .remove([filePath]);

                    if (storageError) {
                        console.error('Failed to delete image from storage:', filePath, storageError);
                        failedImageDeletions.push(imageUrl);
                    }
                }
            }
        }

        // Delete the event (this will cascade delete event_images due to foreign key constraint)
        const { error: deleteError } = await supabase
            .from('events')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Supabase delete error:', deleteError);
            return NextResponse.json({ 
                error: 'Failed to delete event', 
                details: deleteError.message 
            }, { status: 500 });
        }

        // Return success response, noting any image deletion failures
        const response: {
            success: boolean;
            message: string;
            warning?: string;
            failedImageDeletions?: string[];
        } = { 
            success: true, 
            message: 'Event deleted successfully' 
        };

        if (failedImageDeletions.length > 0) {
            response.warning = `Event deleted but some images could not be removed from storage: ${failedImageDeletions.length} files`;
            response.failedImageDeletions = failedImageDeletions;
        }

        return NextResponse.json(response, { status: 200 });

    } catch (error: unknown) {
        console.error('API Error:', error);
        let errorMessage = 'An unexpected error occurred';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: 'Failed to delete event', details: errorMessage }, { status: 500 });
    }
} 
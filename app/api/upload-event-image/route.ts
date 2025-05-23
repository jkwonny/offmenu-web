import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const eventId = formData.get('eventId') as string; // Changed from venueId
        const sortOrder = formData.get('sortOrder') as string;
        
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        
        if (!eventId) {
            return NextResponse.json({ error: 'No event ID provided' }, { status: 400 }); // Changed from venueId
        }
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json({ 
                error: 'Invalid file type. Only JPG, PNG, and WebP images are allowed' 
            }, { status: 400 });
        }
        
        // Validate file size (5MB limit, same as venues)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json({ 
                error: 'File too large. Maximum size is 5MB' 
            }, { status: 400 });
        }
        
        // Generate a unique filename
        const uniqueId = uuidv4();
        // Store in 'event-photos' bucket, similar to 'venue-images'
        const fileName = `event-photos/${eventId}/${uniqueId}-${file.name.replace(/\s+/g, '_')}`; 
        
        // Get file bytes
        const fileBuffer = await file.arrayBuffer();
        
        // Upload file to Supabase
        const { data, error } = await supabaseAdmin.storage
            .from('event-photos') // Changed from 'venue-images'
            .upload(fileName, fileBuffer, {
                contentType: file.type,
                upsert: true,
            });
            
        if (error) {
            if (error.message.includes('bucket') || error.message.includes('row-level security policy')) {
                console.error('Storage bucket error:', error);
                return NextResponse.json({ 
                    error: 'Storage bucket error. Please contact support.' 
                }, { status: 500 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get the public URL for the uploaded file
        const { data: publicUrlData } = supabaseAdmin.storage
            .from('event-photos') // Changed from 'venue-images'
            .getPublicUrl(data.path);

        const publicUrl = publicUrlData.publicUrl;

        // Insert the image record into the event_images table
        const { error: insertError } = await supabaseAdmin
            .from('event_images') // Changed from 'venue_images'
            .insert({
                event_id: eventId, // Changed from venue_id
                image_url: publicUrl,
                sort_order: parseInt(sortOrder) || 1
            });

        if (insertError) {
            console.error('Failed to insert image record:', insertError);
            // If the image was uploaded but DB record failed, attempt to delete the uploaded image
            // This is a best-effort cleanup
            await supabaseAdmin.storage.from('event-photos').remove([fileName]);
            return NextResponse.json({ 
                error: 'Image uploaded but failed to save reference in database. Uploaded file has been removed.',
                details: insertError.message
            }, { status: 500 });
        }

        // Return the public URL
        return NextResponse.json({ 
            success: true,
            path: data.path,
            url: publicUrl
        });
        
    } catch (error: unknown) {
        console.error('Upload error:', error);
        let errorMessage = 'An unexpected error occurred';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
} 
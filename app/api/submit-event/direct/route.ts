import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EventFormData } from '../../../submit-event/components/EventDetailsStep';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    try {
        // Create a service role Supabase client (bypasses RLS)
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Parse multipart form data instead of JSON to handle files
        const formData = await request.formData();
        
        // Extract form fields
        const eventDataString = formData.get('eventData') as string;
        const userId = formData.get('userId') as string;
        
        if (!eventDataString || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const eventData: EventFormData = JSON.parse(eventDataString);

        // Extract image files
        const imageFiles: File[] = [];
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('image_') && value instanceof File) {
                imageFiles.push(value);
            }
        }

        // Validate minimum 1 image requirement
        if (imageFiles.length < 1) {
            return NextResponse.json(
                { error: `At least 1 image is required for event creation. Received ${imageFiles.length} image${imageFiles.length === 1 ? '' : 's'}.` },
                { status: 400 }
            );
        }

        // Validate required fields
        if (!eventData.title || !eventData.selected_date || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Verify the user exists
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json(
                { error: 'Invalid user ID' },
                { status: 400 }
            );
        }

        // Create the event without an address (will be "Address TBD.")
        const { data: event, error: eventError } = await supabase
            .from('events')
            .insert({
                title: eventData.title,
                event_type: eventData.event_type,
                description: eventData.description,
                selected_date: eventData.selected_date,
                selected_time: eventData.selected_time || null,
                expected_capacity_min: eventData.expected_capacity_min,
                expected_capacity_max: eventData.expected_capacity_max,
                duration: eventData.duration,
                assets_needed: eventData.assets_needed,
                event_status: eventData.event_status,
                website: eventData.website,
                instagram_handle: eventData.instagram_handle,
                user_id: userId,
                owner_id: userId,
                is_active: true,
                address: 'Address TBD.',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (eventError) {
            console.error('Event creation error:', eventError);
            return NextResponse.json(
                { error: 'Failed to create event', details: eventError.message },
                { status: 500 }
            );
        }

        // Handle event images if provided - upload them properly
        if (imageFiles.length > 0) {
            try {
                for (let i = 0; i < imageFiles.length; i++) {
                    const file = imageFiles[i];
                    
                    // Generate a unique filename
                    const uniqueId = crypto.randomUUID();
                    const fileName = `event-photos/${event.id}/${uniqueId}-${file.name.replace(/\s+/g, '_')}`;
                    
                    // Get file bytes
                    const fileBuffer = await file.arrayBuffer();
                    
                    // Upload file to Supabase Storage
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('event-photos')
                        .upload(fileName, fileBuffer, {
                            contentType: file.type,
                            upsert: true,
                        });
                        
                    if (uploadError) {
                        console.error('Image upload error:', uploadError);
                        continue; // Skip this image but continue with others
                    }

                    // Get the public URL for the uploaded file
                    const { data: publicUrlData } = supabase.storage
                        .from('event-photos')
                        .getPublicUrl(uploadData.path);

                    // Insert the image record into the event_images table
                    const { error: imageRecordError } = await supabase
                        .from('event_images')
                        .insert({
                            event_id: event.id,
                            image_url: publicUrlData.publicUrl,
                            sort_order: i + 1
                        });

                    if (imageRecordError) {
                        console.error('Event image record error:', imageRecordError);
                        // Continue with other images even if one fails
                    }
                }
            } catch (imageError) {
                console.error('Image processing error:', imageError);
                // Don't fail the entire request for image errors
            }
        }

        // Return success response
        return NextResponse.json({
            success: true,
            event: {
                id: event.id,
                title: event.title,
                status: event.event_status
            },
            message: `Event created successfully!`
        });

    } catch (error) {
        console.error('Direct event creation API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EventFormData } from '../../../submit-event/components/EventDetailsStep';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface Venue {
    id: string;
    name: string;
    owner_id: string;
}

interface BookingRequest {
    id: string;
    event_id: string;
    venue_id: string;
    venue_owner_id: string;
    requester_id: string;
    message: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface ChatRoom {
    id: string;
    event_id: string;
    venue_id: string;
    venue_owner_id: string;
    event_creator_id: string;
    booking_request_id: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export async function POST(request: NextRequest) {
    try {
        // Create a service role Supabase client (bypasses RLS)
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Parse multipart form data instead of JSON to handle files
        const formData = await request.formData();
        
        // Extract form fields
        const eventDataString = formData.get('eventData') as string;
        const venueIdsString = formData.get('venueIds') as string;
        const message = formData.get('message') as string;
        const userId = formData.get('userId') as string;
        
        if (!eventDataString || !venueIdsString || !message || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const eventData: EventFormData = JSON.parse(eventDataString);
        const venueIds: string[] = JSON.parse(venueIdsString);

        // Extract image files
        const imageFiles: File[] = [];
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('image_') && value instanceof File) {
                imageFiles.push(value);
            }
        }

        // Validate required fields
        if (!eventData.title || !eventData.selected_date || !venueIds.length || !message || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate minimum 3 images requirement
        if (imageFiles.length < 3) {
            return NextResponse.json(
                { error: `At least 3 images are required for event creation. Received ${imageFiles.length} image${imageFiles.length === 1 ? '' : 's'}.` },
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

        // Start transaction by creating the event first
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

        // Fetch venue owner information
        const { data: venues, error: venuesError } = await supabase
            .from('venues')
            .select('id, name, owner_id')
            .in('id', venueIds);

        if (venuesError) {
            console.error('Venues fetch error:', venuesError);
            return NextResponse.json(
                { error: 'Failed to fetch venue information' },
                { status: 500 }
            );
        }

        if (!venues || venues.length === 0) {
            return NextResponse.json(
                { error: 'No valid venues found' },
                { status: 400 }
            );
        }

        // Create venue booking requests
        const bookingRequests = venues.map((venue: Venue) => ({
            event_id: event.id,
            venue_id: venue.id,
            venue_owner_id: venue.owner_id,
            requester_id: userId,
            message: message,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));

        const { data: bookings, error: bookingsError } = await supabase
            .from('venue_booking_requests')
            .insert(bookingRequests)
            .select();

        if (bookingsError) {
            console.error('Booking requests error:', bookingsError);
            return NextResponse.json(
                { error: 'Failed to create booking requests', details: bookingsError.message },
                { status: 500 }
            );
        }

        // Create chat rooms for each venue booking
        const chatRoomInserts = bookings.map((booking: BookingRequest) => {
            // Find the corresponding venue for this booking
            const venue = venues.find((v: Venue) => v.id === booking.venue_id);
            
            return {
                event_id: event.id,
                venue_id: booking.venue_id,
                venue_name: venue?.name,
                event_creator_id: userId,
                booking_request_id: booking.id,
                sender_id: userId, // Event creator is the sender
                recipient_id: booking.venue_owner_id, // Venue owner is the recipient
                event_date: eventData.selected_date,
                selected_date: eventData.selected_date,
                selected_time: eventData.selected_time,
                popup_name: eventData.title, // Map title to popup_name
                collaboration_types: [eventData.event_type], // Map event_type to collaboration_types array
                website: eventData.website,
                instagram_handle: eventData.instagram_handle,
                services: eventData.assets_needed, // Map assets_needed to services
                guest_count: eventData.expected_capacity_max ? `${eventData.expected_capacity_min || 0}-${eventData.expected_capacity_max}` : (eventData.expected_capacity_min?.toString() || 'TBD'),
                requirements: eventData.description || 'Event details to be discussed',
                status: 'active'
            };
        });

        const { data: chatRooms, error: chatRoomsError } = await supabase
            .from('chat_rooms')
            .insert(chatRoomInserts)
            .select();

        if (chatRoomsError) {
            console.error('Chat rooms error:', chatRoomsError);
            return NextResponse.json(
                { error: 'Failed to create chat rooms', details: chatRoomsError.message },
                { status: 500 }
            );
        }

        // Send initial messages to each chat room
        if (chatRooms && chatRooms.length > 0) {
            const initialMessages = chatRooms.map((chatRoom: ChatRoom) => ({
                room_id: chatRoom.id,
                sender_id: userId,
                content: message,
                created_at: new Date().toISOString()
            }));

            const { error: messagesError } = await supabase
                .from('chat_messages')
                .insert(initialMessages);

            if (messagesError) {
                console.error('Initial messages error:', messagesError);
                return NextResponse.json(
                    { error: 'Failed to send initial messages', details: messagesError.message },
                    { status: 500 }
                );
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
            bookingRequests: bookings.map((booking: BookingRequest) => ({
                id: booking.id,
                venue_id: booking.venue_id,
                status: booking.status
            })),
            chatRooms: chatRooms?.map((room: ChatRoom) => ({
                id: room.id,
                venue_id: room.venue_id
            })) || [],
            message: `Event created successfully with ${bookings.length} venue requests sent!`
        });

    } catch (error) {
        console.error('Bulk message API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 
import { supabase } from '../supabase';

export interface VenueBookingRequest {
    id: string;
    event_id: string;
    venue_id: string;
    venue_owner_id: string;
    requester_id: string;
    message: string;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
    updated_at: string;
    venue?: {
        id: string;
        name: string;
        address?: string;
        neighborhood?: string;
        image_url?: string;
        venue_images?: Array<{
            image_url: string;
            sort_order?: number;
        }>;
        capacity?: number;
        owner_id: string;
    };
    chat_room?: {
        id: string;
        status: string;
    };
}

export interface VenueRequestsResponse {
    success: boolean;
    requests: VenueBookingRequest[];
    error?: string;
}

/**
 * Fetch venue requests by event ID with venue details and chat room info
 */
export async function fetchVenueRequestsByEventId(eventId: string): Promise<VenueRequestsResponse> {
    try {
        const { data, error } = await supabase
            .from('venue_booking_requests')
            .select(`
                *,
                venue:venues!venue_booking_requests_venue_id_fkey (
                    id,
                    name,
                    address,
                    neighborhood,
                    venue_images (
                        image_url,
                        sort_order
                    ),
                    max_guests,
                    owner_id
                ),
                chat_room:chat_rooms!chat_rooms_booking_request_id_fkey (
                    id,
                    status
                )
            `)
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching venue requests:', error);
            return {
                success: false,
                requests: [],
                error: error.message
            };
        }

        return {
            success: true,
            requests: data || []
        };
    } catch (error) {
        console.error('Unexpected error fetching venue requests:', error);
        return {
            success: false,
            requests: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Update venue request status
 */
export async function updateVenueRequestStatus(
    requestId: string, 
    status: 'accepted' | 'declined'
): Promise<{ success: boolean; error?: string }> {
    try {
        const updateData: {
            status: 'accepted' | 'declined';
            updated_at: string;
        } = {
            status,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('venue_booking_requests')
            .update(updateData)
            .eq('id', requestId);

        if (error) {
            console.error('Error updating venue request status:', error);
            return {
                success: false,
                error: error.message
            };
        }

        return { success: true };
    } catch (error) {
        console.error('Unexpected error updating venue request:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Accept venue offer and update event address
 */
export async function acceptVenueOffer(
    eventId: string,
    requestId: string,
    venueId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // First, get the venue details
        const { data: venue, error: venueError } = await supabase
            .from('venues')
            .select('address, neighborhood, city, state, postal_code, latitude, longitude')
            .eq('id', venueId)
            .single();

        if (venueError) {
            return {
                success: false,
                error: 'Failed to fetch venue details'
            };
        }

        // Start a transaction-like approach
        // 1. Update the booking request to accepted
        const { error: requestError } = await supabase
            .from('venue_booking_requests')
            .update({
                status: 'accepted',
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);

        if (requestError) {
            return {
                success: false,
                error: 'Failed to update booking request'
            };
        }

        // 2. Update event with venue address and mark as confirmed
        const { error: eventError } = await supabase
            .from('events')
            .update({
                address: venue.address,
                neighborhood: venue.neighborhood,
                city: venue.city,
                state: venue.state,
                postal_code: venue.postal_code,
                latitude: venue.latitude,
                longitude: venue.longitude,
                event_status: 'public_approved', // or whatever status indicates confirmed
                updated_at: new Date().toISOString()
            })
            .eq('id', eventId);

        if (eventError) {
            // Rollback the request status if event update fails
            await supabase
                .from('venue_booking_requests')
                .update({
                    status: 'pending',
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId);

            return {
                success: false,
                error: 'Failed to update event details'
            };
        }

        // 3. Decline all other pending requests for this event
        await supabase
            .from('venue_booking_requests')
            .update({
                status: 'declined',
                updated_at: new Date().toISOString()
            })
            .eq('event_id', eventId)
            .neq('id', requestId)
            .eq('status', 'pending');

        return { success: true };
    } catch (error) {
        console.error('Unexpected error accepting venue offer:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Get chat room ID for a venue request
 */
export async function getChatRoomForRequest(requestId: string): Promise<{ chatRoomId?: string; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('booking_request_id', requestId)
            .single();

        if (error) {
            return { error: error.message };
        }

        return { chatRoomId: data?.id };
    } catch (error) {
        return { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        };
    }
} 
import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useMemo } from 'react';
import { fetchProfilePictureUrl } from '../queries/user';

// Fetch chat rooms where the user is the sender
async function fetchSenderRooms(userId: string) {
    if (!userId) return null;
    
    const { data, error } = await supabase
        .from('chat_rooms')
        .select(`   
                id, 
                created_at, 
                venue_id, 
                venue_name,
                event_date,
                sender_id,
                recipient_id,
                popup_name,
                requirements,
                instagram_handle,
                website,
                guest_count,
                collaboration_types,
                request_id,
                venue:venues(name),
                services,
                sender:users!sender_id(
                    id,
                    name,
                    profile_picture
                ),
                recipient:users!recipient_id(
                    id,
                    name,
                    profile_picture
                ),
                booking_request:booking_requests!room_id(
                    id,
                    created_at,
                    message,
                    status,
                    venue_id,
                    venue_name,
                    event_date,
                    sender_id,
                    recipient_id,
                    selected_date,
                    selected_time,
                    guest_count,
                    requirements,
                    instagram_handle,
                    website,
                    collaboration_types,
                    sender:users!sender_id(name, profile_picture),
                    recipient:users!recipient_id(name, profile_picture)
                )
            `)
        .eq('sender_id', userId);
    if (error) throw error;
    return data;
}

// Fetch chat rooms where the user is the recipient
async function fetchRecipientRooms(userId: string) {
    if (!userId) return null;
    
    const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
            id, 
            created_at, 
            venue_id,
            venue_name,
            event_date,
            sender_id,
            recipient_id,
            popup_name,
            requirements,
            instagram_handle,
            website,
            guest_count,
            collaboration_types,
            request_id,
            venue:venues(name),
            services,
            sender:users!sender_id(
                id,
                name,
                profile_picture
            ),
            recipient:users!recipient_id(
                id,
                name,
                profile_picture
            ),
            booking_request:booking_requests!room_id(
                id,
                created_at,
                message,
                status,
                venue_id,
                venue_name,
                event_date,
                sender_id,
                recipient_id,
                selected_date,
                selected_time,
                guest_count,
                requirements,
                instagram_handle,
                website,
                collaboration_types,
                sender:users!sender_id(name, profile_picture),
                recipient:users!recipient_id(name, profile_picture)
            )
        `)
        .eq('recipient_id', userId);
        
    if (error) throw error;
    return data;
}

// Note: Booking request functions removed since we now focus only on chat rooms

// Fetch the latest message for a chat room
async function fetchLatestMessage(roomId: string) {
    if (!roomId) return null;
    
    const { data, error } = await supabase
        .from('chat_messages')
        .select(`
            content, 
            created_at,
            sender:users!sender_id(name, profile_picture)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(1);
        
    if (error) throw error;
    
    if (data && data.length > 0) {
        const message = data[0];
        return {
            content: message.content,
            created_at: message.created_at,
            sender: {
                name: (() => {
                    const sender = message.sender;
                    if (!sender) return 'Unknown';

                    // Use type assertion
                    const senderData = Array.isArray(sender)
                        ? (sender as { name?: string }[])[0]
                        : sender as { name?: string };

                    return senderData?.name || 'Unknown';
                })(),
                profile_picture: (() => {
                    const sender = message.sender;
                    if (!sender) return null;

                    // Use type assertion
                    const senderData = Array.isArray(sender)
                        ? (sender as { profile_picture?: string }[])[0]
                        : sender as { profile_picture?: string };

                    return senderData?.profile_picture || null;
                })()
            }
        };
    }
    
    return null;
}

// Fetch venue images for a specific venue
async function fetchVenueImages(venueId: number) {
    if (!venueId) return null;
    
    const { data, error } = await supabase
        .from('venues')
        .select(`
            id,
            name,
            venue_images(image_url, sort_order)
        `)
        .eq('id', venueId)
        .single();
        
    if (error) throw error;
    
    if (data && data.venue_images && Array.isArray(data.venue_images) && data.venue_images.length > 0) {
        // Get the primary image (lowest sort_order)
        const sortedImages = data.venue_images.sort((a: { sort_order?: number }, b: { sort_order?: number }) => 
            (a.sort_order ?? 999) - (b.sort_order ?? 999)
        );
        return {
            venue_name: data.name,
            venue_image: sortedImages[0]?.image_url || null
        };
    }
    
    return null;
}

export function useChatRooms(userId: string | undefined) {
    // Fetch sender and recipient rooms
    const senderRoomsQuery = useQuery({
        queryKey: ['chatRooms', 'sender', userId],
        queryFn: () => fetchSenderRooms(userId as string),
        enabled: !!userId,
    });

    const recipientRoomsQuery = useQuery({
        queryKey: ['chatRooms', 'recipient', userId],
        queryFn: () => fetchRecipientRooms(userId as string),
        enabled: !!userId,
    });

    // Note: We no longer fetch booking requests separately since chat rooms are created immediately

    // Combine rooms only (since rooms are created immediately now)
    const combinedItems = useMemo(() => {
        const rooms = [
            ...(senderRoomsQuery.data || []),
            ...(recipientRoomsQuery.data || [])
        ];
        
        // Deduplicate by ID
        const uniqueItemIds = new Set();
        const uniqueItems = rooms.filter(item => {
            if (uniqueItemIds.has(item.id)) {
                return false;
            }
            uniqueItemIds.add(item.id);
            return true;
        });
        
        return uniqueItems;
    }, [senderRoomsQuery.data, recipientRoomsQuery.data]);

    // Get unique venue IDs to fetch venue images for
    const uniqueVenueIds = useMemo(() => {
        const venueIds = new Set<number>();
        combinedItems.forEach(item => {
            if (item.venue_id) venueIds.add(item.venue_id);
        });
        return Array.from(venueIds);
    }, [combinedItems]);

    // Fetch venue images for all unique venues
    const venueImageQueries = useQueries({
        queries: uniqueVenueIds.map(venueId => ({
            queryKey: ['venueImages', venueId],
            queryFn: () => fetchVenueImages(venueId),
            enabled: combinedItems.length > 0,
        })),
    });

    // For each room (not requests), fetch its latest message
    const roomsWithMessagesQueries = useQueries({
        queries: combinedItems
            .filter(item => !item.id.startsWith('request_')) // Only fetch messages for actual rooms
            .map(room => ({
                queryKey: ['latestMessage', room.id],
                queryFn: () => fetchLatestMessage(room.id),
                enabled: combinedItems.length > 0,
            })),
    });

    // Process the items with their latest messages
    const processedItems = useMemo(() => {
        if (combinedItems.length === 0) {
            return [];
        }
        
        // Check if any room message queries are still loading
        const roomMessagesLoading = combinedItems.length > 0 && 
            roomsWithMessagesQueries.some(query => query.isLoading);
        
        // Check if venue queries are still loading
        const venueQueriesLoading = uniqueVenueIds.length > 0 && 
            venueImageQueries.some(query => query.isLoading);
        
        if (roomMessagesLoading || venueQueriesLoading) {
            return [];
        }
        
        // Create a map of venue ID to venue images for quick lookup
        const venueImageMap = new Map<number, { venue_name: string; venue_image: string | null } | null>();
        uniqueVenueIds.forEach((venueId, index) => {
            const venueData = venueImageQueries[index]?.data;
            venueImageMap.set(venueId, venueData || null);
        });
        
        // Process rooms with messages
        const processedRooms = combinedItems.map((room, index) => {
            const latestMessage = roomsWithMessagesQueries[index]?.data;
            
            // Process sender and recipient data
            let senderName = 'Unknown';
            let senderProfilePicture = null;
            let recipientName = 'Unknown';
            let recipientProfilePicture = null;

            if (room.sender && Array.isArray(room.sender) && room.sender.length > 0) {
                senderName = room.sender[0]?.name || 'Unknown';
                senderProfilePicture = room.sender[0]?.profile_picture || null;
            } else if (room.sender && typeof room.sender === 'object') {
                senderName = (room.sender as { name?: string }).name || 'Unknown';
                senderProfilePicture = (room.sender as { profile_picture?: string }).profile_picture || null;
            }

            if (room.recipient && Array.isArray(room.recipient) && room.recipient.length > 0) {
                recipientName = room.recipient[0]?.name || 'Unknown';
                recipientProfilePicture = room.recipient[0]?.profile_picture || null;
            } else if (room.recipient && typeof room.recipient === 'object') {
                recipientName = (room.recipient as { name?: string }).name || 'Unknown';
                recipientProfilePicture = (room.recipient as { profile_picture?: string }).profile_picture || null;
            }

            // Get venue image for this specific room's venue
            const venueData = venueImageMap.get(room.venue_id);
            
            // Process booking request if it exists
            let processedBookingRequest = null;
            if (room.booking_request && Array.isArray(room.booking_request) && room.booking_request.length > 0) {
                const req = room.booking_request[0];
                let reqSenderName = 'Unknown';
                let reqRecipientName = 'Unknown';
                let reqSenderProfilePicture = null;
                let reqRecipientProfilePicture = null;

                if (req.sender && Array.isArray(req.sender) && req.sender.length > 0) {
                    reqSenderName = req.sender[0]?.name || 'Unknown';
                    reqSenderProfilePicture = req.sender[0]?.profile_picture || null;
                } else if (req.sender && typeof req.sender === 'object') {
                    reqSenderName = (req.sender as { name?: string }).name || 'Unknown';
                    reqSenderProfilePicture = (req.sender as { profile_picture?: string }).profile_picture || null;
                }

                if (req.recipient && Array.isArray(req.recipient) && req.recipient.length > 0) {
                    reqRecipientName = req.recipient[0]?.name || 'Unknown';
                    reqRecipientProfilePicture = req.recipient[0]?.profile_picture || null;
                } else if (req.recipient && typeof req.recipient === 'object') {
                    reqRecipientName = (req.recipient as { name?: string }).name || 'Unknown';
                    reqRecipientProfilePicture = (req.recipient as { profile_picture?: string }).profile_picture || null;
                }

                processedBookingRequest = {
                    id: req.id,
                    created_at: req.created_at,
                    message: req.message,
                    status: req.status,
                    venue_id: req.venue_id,
                    venue_name: req.venue_name || 'Unknown Venue',
                    event_date: req.event_date || '',
                    sender_id: req.sender_id,
                    recipient_id: req.recipient_id,
                    sender_name: reqSenderName,
                    sender_profile_picture: reqSenderProfilePicture,
                    selected_date: req.selected_date,
                    selected_time: req.selected_time,
                    recipient_name: reqRecipientName,
                    recipient_profile_picture: reqRecipientProfilePicture,
                    guest_count: req.guest_count,
                    requirements: req.requirements,
                    instagram_handle: req.instagram_handle,
                    website: req.website,
                    collaboration_types: req.collaboration_types
                };
            }
            
            return {
                id: room.id,
                created_at: room.created_at,
                venue_id: room.venue_id,
                venue_name: room.venue_name,
                venue: {
                    name: room.venue && Array.isArray(room.venue) && room.venue[0]?.name 
                        ? room.venue[0].name 
                        : 'Unknown Venue'
                },
                latest_message: latestMessage,
                isRequest: false,
                status: 'approved', // Chat rooms are always approved since they exist
                request_id: room.request_id,
                sender_id: room.sender_id,
                recipient_id: room.recipient_id,
                sender_name: senderName,
                sender_profile_picture: senderProfilePicture,
                recipient_name: recipientName,
                recipient_profile_picture: recipientProfilePicture,
                // For the venue-specific image (used in left container)
                venue_image: venueData?.venue_image || null,
                popup_name: room.popup_name,
                requirements: room.requirements,
                instagram_handle: room.instagram_handle,
                website: room.website,
                guest_count: room.guest_count,
                collaboration_types: room.collaboration_types,
                services: room.services,
                booking_request: processedBookingRequest
            };
        });
        
        // Sort by latest activity
        return processedRooms.sort((a, b) => {
            const aTime = a.latest_message
                ? new Date(a.latest_message.created_at).getTime()
                : new Date(a.created_at).getTime();
            const bTime = b.latest_message
                ? new Date(b.latest_message.created_at).getTime()
                : new Date(b.created_at).getTime();
            return bTime - aTime;
        });
    }, [combinedItems, roomsWithMessagesQueries, venueImageQueries, uniqueVenueIds]);

    return {
        rooms: processedItems,
        isLoading: 
            senderRoomsQuery.isLoading || 
            recipientRoomsQuery.isLoading ||
            (combinedItems.length > 0 && 
             roomsWithMessagesQueries.some(query => query.isLoading)) ||
            (uniqueVenueIds.length > 0 && 
             venueImageQueries.some(query => query.isLoading)),
        error: 
            senderRoomsQuery.error || 
            recipientRoomsQuery.error ||
            roomsWithMessagesQueries.find(query => query.error)?.error ||
            venueImageQueries.find(query => query.error)?.error,
        refetch: async () => {
            // Refetch both sender and recipient rooms
            await Promise.all([
                senderRoomsQuery.refetch(),
                recipientRoomsQuery.refetch()
            ]);
            // Refetch all message queries
            await Promise.all(
                roomsWithMessagesQueries.map(query => query.refetch())
            );
            // Refetch all venue queries
            await Promise.all(
                venueImageQueries.map(query => query.refetch())
            );
        }
    };
} 
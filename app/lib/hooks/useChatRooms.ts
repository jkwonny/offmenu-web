import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useMemo } from 'react';

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
                special_requests,
                instagram_handle,
                website,
                guest_count,
                collaboration_types,
                request_id,
                venue:venues(name),
                services
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
            special_requests,
            instagram_handle,
            website,
            guest_count,
            collaboration_types,
            request_id,
            venue:venues(name),
            services
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
            sender:users!sender_id(name)
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
                })()
            }
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
        
        if (roomMessagesLoading) {
            return [];
        }
        
        // Process rooms with messages
        const processedRooms = combinedItems.map((room, index) => {
            const latestMessage = roomsWithMessagesQueries[index]?.data;
            
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
                popup_name: room.popup_name,
                requirements: room.requirements,
                special_requests: room.special_requests,
                instagram_handle: room.instagram_handle,
                website: room.website,
                guest_count: room.guest_count,
                collaboration_types: room.collaboration_types,
                services: room.services
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
    }, [combinedItems, roomsWithMessagesQueries]);

    return {
        rooms: processedItems,
        isLoading: 
            senderRoomsQuery.isLoading || 
            recipientRoomsQuery.isLoading ||
            (combinedItems.length > 0 && 
             roomsWithMessagesQueries.some(query => query.isLoading)),
        error: 
            senderRoomsQuery.error || 
            recipientRoomsQuery.error ||
            roomsWithMessagesQueries.find(query => query.error)?.error
    };
} 
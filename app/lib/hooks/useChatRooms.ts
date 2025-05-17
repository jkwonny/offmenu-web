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
                request_id,
                venue:venues(name),
                chat_request:chat_requests!inner(sender_id, recipient_id, status)
            `)
        .eq('chat_request.sender_id', userId);
        
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
            request_id,
            venue:venues(name),
            chat_request:chat_requests!inner(sender_id, recipient_id, status)
        `)
        .eq('chat_request.recipient_id', userId);
        
    if (error) throw error;
    return data;
}

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

    // If both queries are successful, combine the rooms
    const combinedRooms = useMemo(() => {
        if (!senderRoomsQuery.data && !recipientRoomsQuery.data) return [];
        
        // Combine sender and recipient rooms
        const combined = [
            ...(senderRoomsQuery.data || []),
            ...(recipientRoomsQuery.data || [])
        ];
        
        // Deduplicate rooms by ID
        const uniqueRoomIds = new Set();
        const uniqueRooms = combined.filter(room => {
            if (uniqueRoomIds.has(room.id)) {
                return false;
            }
            uniqueRoomIds.add(room.id);
            return true;
        });
        
        return uniqueRooms;
    }, [senderRoomsQuery.data, recipientRoomsQuery.data]);

    // For each room, fetch its latest message
    const roomsWithMessagesQueries = useQueries({
        queries: combinedRooms.map(room => ({
            queryKey: ['latestMessage', room.id],
            queryFn: () => fetchLatestMessage(room.id),
            enabled: combinedRooms.length > 0,
        })),
    });

    // Process the rooms with their latest messages
    const processedRooms = useMemo(() => {
        if (combinedRooms.length === 0 || 
            roomsWithMessagesQueries.some(query => query.isLoading)) {
            return [];
        }
        
        return combinedRooms.map((room, index) => {
            const latestMessage = roomsWithMessagesQueries[index].data;
            
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
                latest_message: latestMessage
            };
        }).sort((a, b) => {
            const aTime = a.latest_message
                ? new Date(a.latest_message.created_at).getTime()
                : new Date(a.created_at).getTime();
            const bTime = b.latest_message
                ? new Date(b.latest_message.created_at).getTime()
                : new Date(b.created_at).getTime();
            return bTime - aTime;
        });
    }, [combinedRooms, roomsWithMessagesQueries]);

    return {
        rooms: processedRooms,
        isLoading: 
            senderRoomsQuery.isLoading || 
            recipientRoomsQuery.isLoading || 
            (combinedRooms.length > 0 && roomsWithMessagesQueries.some(query => query.isLoading)),
        error: 
            senderRoomsQuery.error || 
            recipientRoomsQuery.error || 
            roomsWithMessagesQueries.find(query => query.error)?.error
    };
} 
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { Venue } from '@/app/types/venue';

// Types for the API responses
interface SupabaseRequestResponse {
    id: string;
    created_at: string;
    message: string;
    status: string;
    venue_id: number;
    venue_name?: string;
    event_date?: string;
    sender_id: string;
    recipient_id: string;
    sender: unknown;
    recipient: unknown;
    room_id?: string;
    selected_date?: Date;
    selected_time?: Date;
    guest_count?: string;
    requirements?: string;
    special_requests?: string;
    instagram_handle?: string;
    website?: string;
    collaboration_types?: string[];
}

export interface BookingRequest {
    id: string;
    created_at: string;
    message: string;
    status: string;
    venue_id: number;
    venue_name: string;
    event_date: string;
    sender_id: string;
    recipient_id: string;
    selected_date?: Date;
    selected_time?: Date;
    sender_name: string;
    recipient_name: string;
    room_id?: string;
    guest_count?: string;
    requirements?: string;
    special_requests?: string;
    instagram_handle?: string;
    website?: string;
    collaboration_types?: string[];
}

// Fetch current authenticated user
export const fetchCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
};

// Fetch venues owned by a user
export const fetchUserVenues = async (userId: string) => {
    if (!userId) return [];
    
    const { data, error } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', userId);
    
    if (error) throw error;
    return data || [];
};

// Fetch booking requests for user's venues
export const fetchBookingRequests = async (venueIds: number[]) => {
    if (venueIds.length === 0) return [];
    
    const { data, error } = await supabase
        .from('booking_requests')
        .select(`
            id,
            created_at,
            message,
            status,
            venue_id,
            venue_name,
            event_date,
            sender_id,
            recipient_id,
            room_id,
            selected_date,
            selected_time,
            guest_count,
            requirements,
            special_requests,
            instagram_handle,
            website,
            collaboration_types,
            sender:users!sender_id(name),
            recipient:users!recipient_id(name)
        `)
        .in('venue_id', venueIds);
    
    if (error) throw error;
    
    // Process the response to extract names safely
    const formattedRequests = ((data || []) as unknown as SupabaseRequestResponse[]).map((req) => {
        let senderName = 'Unknown';
        let recipientName = 'Unknown';

        if (req.sender) {
            const sender = req.sender as { name?: string };
            senderName = typeof sender.name === 'string' ? sender.name : 'Unknown';
        }

        if (req.recipient) {
            const recipient = req.recipient as { name?: string };
            recipientName = typeof recipient.name === 'string' ? recipient.name : 'Unknown';
        }

        return {
            id: req.id,
            created_at: req.created_at,
            message: req.message,
            status: req.status,
            venue_id: req.venue_id,
            venue_name: req.venue_name || 'Unknown Venue',
            event_date: req.event_date || '',
            sender_id: req.sender_id,
            recipient_id: req.recipient_id,
            sender_name: senderName,
            selected_date: req.selected_date,
            selected_time: req.selected_time,
            recipient_name: recipientName,
            room_id: req.room_id,
            guest_count: req.guest_count,
            requirements: req.requirements,
            special_requests: req.special_requests,
            instagram_handle: req.instagram_handle,
            website: req.website,
            collaboration_types: req.collaboration_types
        };
    });
    
    return formattedRequests;
};

// Fetch chat messages for a specific room
export const fetchChatMessages = async (roomId: string) => {
    if (!roomId) return [];
    
    const { data, error } = await supabase
        .from('chat_messages')
        .select(`
            id,
            content,
            created_at,
            sender_id,
            sender:users!sender_id(name)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // Process messages
    const processedMessages = data?.map(msg => ({
        id: msg.id,
        content: msg.content,
        created_at: msg.created_at,
        sender_id: msg.sender_id,
        sender_name: msg.sender && typeof msg.sender === 'object'
            ? (Array.isArray(msg.sender)
                ? (msg.sender[0] as { name?: string })?.name || 'Unknown'
                : (msg.sender as { name?: string })?.name || 'Unknown')
            : 'Unknown'
    })) || [];
    
    return processedMessages;
};

// Fetch venue details with images
export const fetchVenueDetails = async (venueId: number) => {
    if (!venueId) return null;
    
    const { data, error } = await supabase
        .from('venues')
        .select(`
            *,
            venue_images(image_url, sort_order)
        `)
        .eq('id', venueId)
        .single();
    
    if (error) throw error;
    
    // Process venue data to include venue_images properly
    const processedVenueData = {
        ...data,
        venue_images: data.venue_images || []
    };
    
    return processedVenueData as Venue;
};

// React Query Hooks

/**
 * Hook to get the current authenticated user
 */
export function useCurrentUser() {
    return useQuery({
        queryKey: ['currentUser'],
        queryFn: fetchCurrentUser,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}

/**
 * Hook to get venues owned by a user
 */
export function useUserVenues(userId: string | undefined) {
    return useQuery({
        queryKey: ['userVenues', userId],
        queryFn: () => fetchUserVenues(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}

/**
 * Hook to get booking requests for user's venues
 */
export function useBookingRequests(venueIds: number[]) {
    return useQuery({
        queryKey: ['bookingRequests', venueIds],
        queryFn: () => fetchBookingRequests(venueIds),
        enabled: venueIds.length > 0,
        staleTime: 1 * 60 * 1000, // 1 minute (more frequent updates for requests)
        gcTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook to get chat messages for a specific room
 */
export function useChatMessages(roomId: string | undefined) {
    return useQuery({
        queryKey: ['chatMessages', roomId],
        queryFn: () => fetchChatMessages(roomId!),
        enabled: !!roomId,
        staleTime: 30 * 1000, // 30 seconds (frequent updates for real-time feel)
        gcTime: 2 * 60 * 1000, // 2 minutes
    });
}

/**
 * Hook to get venue details with images
 */
export function useVenueDetails(venueId: number | undefined) {
    return useQuery({
        queryKey: ['venueDetails', venueId],
        queryFn: () => fetchVenueDetails(venueId!),
        enabled: !!venueId,
        staleTime: 10 * 60 * 1000, // 10 minutes (venue details don't change often)
        gcTime: 30 * 60 * 1000, // 30 minutes
    });
} 
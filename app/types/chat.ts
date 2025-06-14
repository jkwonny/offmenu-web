export interface ChatRoom {
    id: string;
    created_at: string;
    venue_id: number;
    venue_name?: string;
    event_date?: string;
    sender_id: string;
    recipient_id: string;
    sender_name?: string;
    recipient_name?: string;
    sender_profile_picture?: string | null;
    recipient_profile_picture?: string | null;
    venue_images?: {
        image_url: string;
        sort_order: number;
    }[];
    popup_name?: string;
    requirements?: string;
    instagram_handle?: string;
    website?: string;
    guest_count?: string;
    collaboration_types?: string[];
    venue: {
        name: string;
    };
    latest_message?: {
        content: string;
        created_at: string;
        sender: {
            name: string;
            profile_picture?: string | null;
        };
    };
    // Legacy fields for backward compatibility
    request_id?: string;
    isRequest?: boolean;
    status?: string;
    services?: string[];
    booking_request?: {
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
        sender_profile_picture?: string | null;
        recipient_profile_picture?: string | null;
        guest_count?: string;
        requirements?: string;
        instagram_handle?: string;
        website?: string;
        collaboration_types?: string[];
    };

}

export interface ChatMessage {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    sender_name: string;

}

export interface ChatRequest {
    id: string;
    created_at: string;
    message: string;
    status: string;
    venue_id: number;
    venue_name: string;
    event_date: string;
    sender_id: string;
    recipient_id: string;
    sender_name: string;
    recipient_name: string;
    room_id?: string;
}
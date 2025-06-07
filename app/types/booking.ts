export interface BookingRequest {
    id: string;
    created_at: string;
    message: string;
    status: 'pending' | 'approved' | 'rejected';
    venue_id: number;
    venue_name: string;
    event_date: string;
    sender_id: string;
    recipient_id: string;
    sender_name: string;
    recipient_name: string;
    room_id?: string;
    popup_name?: string;
    selected_date?: string;
    selected_time?: string;
    requirements?: string;
    instagram_handle?: string;
    website?: string;
    guest_count?: string;
    collaboration_types?: string[];
} 
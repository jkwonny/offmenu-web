export interface ChatRoom {
    id: string;
    created_at: string;
    venue_id: number;
    venue_name?: string;
    event_date?: string;
    request_id?: string;
    venue: {
        name: string;
    };
    latest_message?: {
        content: string;
        created_at: string;
        sender: {
            name: string;
        };
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
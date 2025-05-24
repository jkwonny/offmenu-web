export interface EventImage {
    image_url: string;
    created_at: string;
    event_id: string;
    id: number;
    sort_order: number;
}

export interface Event {
    id: string;
    title: string;
    event_type: string;
    selected_date: string;
    selected_time?: string;
    description?: string;
    assets_needed?: string[];
    expected_capacity_min?: number;
    expected_capacity_max?: number;
    image_url: EventImage[];
    event_images?: EventImage[];
    address: string;
    pricing_type: string;
    price?: number;
    user_id?: string;
    owner_id?: string;
    status?: string;
    duration?: number;
}

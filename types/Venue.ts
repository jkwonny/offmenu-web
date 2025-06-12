export interface Venue {
    id: string;
    name: string;
    category: string;
    image_url: string;
    city: string;
    address?: string;
    state?: string;
    alcohol_served?: boolean;
    outside_cake_allowed?: boolean;
    website?: string;
    instagram_handle?: string;
    max_guests?: number;
    description?: string;
    capacity?: number;
    tags?: string[];
    avg_rating?: number;
    review_count?: number;
    rental_type?: string[];
    venue_images?: {
        id: string;
        image_url: string;
        sort_order: number;
    }[];
    amenities?: string[];
    food_and_drink_options?: string[];
    capacity_details?: string;
    venue_size?: string;
    venue_layout?: string;
    venue_features?: string[];
    longitude: number;
    latitude: number;
    neighborhood?: string;
    owner_id: string;
    contact_email?: string;
    status?: 'pending' | 'approved' | 'declined';
    collaboration_type?: string;
    services?: string[];
}

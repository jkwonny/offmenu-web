export interface VenueFormData {
  name: string;
  description: string;
  address: string;
  street_number: string;
  street_name: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: string;
  longitude: string;
  category: string;
  rental_type: string[];
  pricing_type: string;
  price: string;
  min_hours: string;
  website: string;
  instagram_handle: string;
  alcohol_served: boolean;
  byob_allowed: boolean;
  byob_pricing_type: string;
  byob_price: string;
  outside_cake_allowed: boolean;
  cake_fee_type: string;
  cake_fee_amount: string;
  cleaning_fee: string;
  setup_fee: string;
  overtime_fee_per_hour: string;
  max_guests: string;
  max_seated_guests: string;
  max_standing_guests: string;
  tags: string;
} 

export interface VenueImage {
  image_url: string;
  sort_order?: number;
}

export interface Venue {
  id: number;
  name: string;
  address?: string;
  description?: string;
  neighborhood?: string;
  image_url?: string;
  venue_images?: VenueImage[];
}
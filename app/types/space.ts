export interface SpaceFormData {
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
  collaboration_type: string[];
  website: string;
  instagram_handle: string;
  max_guests: string;
  max_standing_guests: number;
  max_sitting_guests: number;
  tags: string;
  services: string[];
  contact_email?: string;
} 
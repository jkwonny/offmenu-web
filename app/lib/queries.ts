import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';

// Venue type matching the existing one used in components
export interface Venue {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  image_url: string;
  city: string;
  address?: string;
  state?: string;
  price?: number;
  pricing_type?: string;
  min_hours?: number;
  avg_rating?: number;
  review_count?: number;
  description: string;
  capacity: number;
  tags: string[];
}

// Function to fetch venues from Supabase
async function fetchVenues() {
  console.log('Making Supabase request');
  const { data, error } = await supabase
    .from('venues')
    .select(`
      *,
      venue_images(image_url, sort_order)
    `);

  if (error) {
    console.error('Supabase error:', error);
    throw error;
  }

  console.log('Received venue data:', data);

  if (data) {
    // Transform data to match our Venue interface
    return data.map(venue => {
      // Find the image with the lowest sort_order (primary image)
      const primaryImage = venue.venue_images && venue.venue_images.length > 0
        ? venue.venue_images.sort((a: { sort_order: number }, b: { sort_order: number }) =>
          a.sort_order - b.sort_order)[0]
        : null;

      return {
        id: venue.id.toString(),
        name: venue.name,
        latitude: parseFloat(venue.latitude) || 0,
        longitude: parseFloat(venue.longitude) || 0,
        category: venue.category || 'Venue',
        image_url: primaryImage ? primaryImage.image_url : '/venue-placeholder.jpg',
        city: venue.city,
        address: venue.address,
        state: venue.state,
        price: venue.price ? parseFloat(venue.price) : undefined,
        pricing_type: venue.pricing_type,
        min_hours: venue.min_hours ? parseInt(venue.min_hours) : undefined,
        description: venue.description || '',
        capacity: venue.max_guests ? parseInt(venue.max_guests) : 0,
        tags: venue.rental_type || [],
      };
    });
  }

  return [];
}

// Hook to use the venue data with React Query
export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: fetchVenues,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0
  });
}

// Hook to get a single venue by ID
export function useVenue(venueId: string) {
  return useQuery({
    queryKey: ['venue', venueId],
    queryFn: async () => {
      const venues = await fetchVenues();
      return venues.find(venue => venue.id === venueId) || null;
    },
    enabled: !!venueId,
  });
} 
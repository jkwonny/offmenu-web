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
  avg_rating?: number;
  review_count?: number;
  description: string;
  capacity: number;
  tags: string[];
  venue_images: string[];
  owner_id?: string;
  neighborhood?: string;
  collaboration_type?: string[];
  status?: string;
}

export interface VenueFilters {
  capacity?: number;
  neighborhood?: string;
  collaboration_type?: string[];
  city?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}

// Optimized function to fetch venues with filters
async function fetchVenues(filters: VenueFilters = {}) {
  let query = supabase
    .from('venues')
    .select(`
      id,
      name,
      latitude,
      longitude,
      category,
      city,
      address,
      state,
      description,
      max_guests,
      tags,
      neighborhood,
      owner_id,
      status,
      collaboration_type,
      venue_images(id, image_url, sort_order)
    `, { count: 'exact' });

  // Apply filters
  if (filters.capacity) {
    query = query.gte('max_guests', filters.capacity);
  }

  if (filters.neighborhood) {
    query = query.eq('neighborhood', filters.neighborhood);
  }

  if (filters.city) {
    query = query.eq('city', filters.city);
  }

  if (filters.collaboration_type && filters.collaboration_type.length > 0) {
    query = query.contains('collaboration_type', filters.collaboration_type);
  }

  if (filters.featured !== undefined) {
    query = query.eq('featured', filters.featured);
  }

  // Only show approved venues by default
  query = query.eq('status', 'approved');

  // Add pagination
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
  }

  // Order by featured first, then by name
  query = query.order('featured', { ascending: false });
  query = query.order('name', { ascending: true });

  const { data, error, count } = await query;

  if (error) {
    console.error('Supabase error:', error);
    throw error;
  }

  if (data) {
    // Transform data to match our Venue interface
    const venues = data.map(venue => {
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
        image_url: primaryImage?.image_url || null,
        city: venue.city,
        address: venue.address,
        state: venue.state,
        description: venue.description || '',
        capacity: venue.max_guests ? parseInt(venue.max_guests) : 0,
        tags: venue.tags || [],
        venue_images: venue.venue_images || [],
        neighborhood: venue.neighborhood || '',
        owner_id: venue.owner_id,
        status: venue.status || 'approved',
        collaboration_type: venue.collaboration_type || '',
      };
    });

    return { venues, totalCount: count || 0 };
  }

  return { venues: [], totalCount: 0 };
}

// Hook to use the venue data with React Query and filters
export function useVenues(filters: VenueFilters = {}) {
  return useQuery({
    queryKey: ['venues', filters],
    queryFn: () => fetchVenues(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    select: (data) => data.venues, // Only return venues array for backward compatibility
  });
}

// New hook for paginated venues with metadata
export function useVenuesPaginated(filters: VenueFilters = {}) {
  return useQuery({
    queryKey: ['venues-paginated', filters],
    queryFn: () => fetchVenues(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook to get a single venue by ID
export function useVenue(venueId: string) {
  return useQuery({
    queryKey: ['venue', venueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select(`
          *,
          venue_images(id, image_url, sort_order)
        `)
        .eq('id', venueId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) return null;

      // Transform to match Venue interface
      const primaryImage = data.venue_images && data.venue_images.length > 0
        ? data.venue_images.sort((a: { sort_order: number }, b: { sort_order: number }) =>
          a.sort_order - b.sort_order)[0]
        : null;

      return {
        id: data.id.toString(),
        name: data.name,
        latitude: parseFloat(data.latitude) || 0,
        longitude: parseFloat(data.longitude) || 0,
        category: data.category || 'Venue',
        image_url: primaryImage?.image_url || null,
        city: data.city,
        address: data.address,
        state: data.state,
        description: data.description || '',
        capacity: data.max_guests ? parseInt(data.max_guests) : 0,
        tags: data.tags || [],
        venue_images: data.venue_images || [],
        neighborhood: data.neighborhood || '',
        owner_id: data.owner_id,
        status: data.status || 'approved',
        collaboration_type: data.collaboration_type || '',
      };
    },
    enabled: !!venueId,
    staleTime: 10 * 60 * 1000, // 10 minutes for individual venues
  });
}

// Function to fetch featured venues from Supabase
async function fetchFeaturedVenues() {
  return fetchVenues({ featured: true, limit: 10 });
}

// Hook to use the featured venue data with React Query
export function useFeaturedVenues() {
  return useQuery({
    queryKey: ['featuredVenues'],
    queryFn: fetchFeaturedVenues,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    select: (data) => data.venues, // Only return venues array
  });
}

// Function to fetch events from Supabase
async function fetchEvents() {
  const response = await fetch('/api/events');
  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }
  const data = await response.json();
  return data.map((event: {
    id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string | null;
    expected_capacity_min: number;
    expected_capacity_max: number;
    assets_needed: string[];
    is_active: boolean;
    user_id: string;
  }) => ({
    ...event,
    start_date: new Date(event.start_date),
    end_date: event.end_date ? new Date(event.end_date) : null,
  }));
}

// Hook to use the events data with React Query
export function useEvents<T = {
  id: string;
  title: string;
  description: string;
  start_date: Date;
  end_date: Date | null;
  expected_capacity_min: number;
  expected_capacity_max: number;
  assets_needed: string[];
  is_active: boolean;
  user_id: string;
}>() {
  return useQuery<T>({
    queryKey: ['events'],
    queryFn: fetchEvents,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
} 
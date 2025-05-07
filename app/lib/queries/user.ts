import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';

/**
 * Fetches a signed URL for a profile picture from Supabase storage
 * @param filePath Path to the profile picture in Supabase storage
 * @returns Signed URL for the profile picture
 */
export const fetchProfilePictureUrl = async (filePath: string | null | undefined): Promise<string | null> => {
  if (!filePath) return null;
  
  try {
    const { data, error } = await supabase
      .storage
      .from('user-profile-pic')
      .createSignedUrl(filePath, 60 * 60); // 1 hour expiration

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in fetchProfilePictureUrl:', error);
    return null;
  }
};

/**
 * React Query hook to fetch and cache a user's profile picture URL
 * @param filePath Path to the profile picture in Supabase storage
 * @returns Query result with the signed URL
 */
export function useProfilePictureUrl(filePath: string | null | undefined) {
  return useQuery({
    queryKey: ['profilePicture', filePath],
    queryFn: () => fetchProfilePictureUrl(filePath),
    enabled: !!filePath, // Only run the query if filePath exists
    staleTime: 55 * 60 * 1000, // Consider stale after 55 minutes (just before the 1 hour signed URL expires)
    gcTime: 60 * 60 * 1000, // Garbage collection time (previously 'cacheTime')
  });
} 
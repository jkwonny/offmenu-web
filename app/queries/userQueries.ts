import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/user';
import { useQuery } from '@tanstack/react-query';

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            // React Query expects an error to be thrown for the onError callback to work
            throw error;
        }

        return data as UserProfile;
    } catch (error) {
        console.error('Error in fetchUserProfile:', error);
        // Ensure an error is thrown for React Query
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred while fetching user profile.');
    }
};

export const useUserProfileQuery = (userId: string | undefined) => {
    return useQuery<UserProfile | null, Error>({
        queryKey: ['userProfile', userId],
        queryFn: () => {
            if (!userId) {
                // Immediately return null or throw an error if userId is not available
                // This depends on how you want to handle the case where userId is undefined.
                // For now, let's return Promise.resolve(null) to match the previous behavior of fetchUserProfile when it might return null.
                return Promise.resolve(null);
            }
            return fetchUserProfile(userId);
        },
        enabled: !!userId, // Only run the query if userId is available
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}; 
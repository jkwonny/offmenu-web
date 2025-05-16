"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

// Define a type for the user profile from the database
type UserProfile = {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    profile_picture?: string | null;
    about?: string;
    role: string;
    spaces_host: boolean;
    created_at?: string;
    updated_at?: string;
};

type UserContextType = {
    user: User | null;
    userProfile: UserProfile | null;
    session: Session | null;
    isLoading: boolean;
    signUp: (email: string, password: string, name?: string, phone?: string) => Promise<{
        success: boolean;
        error: Error | null;
    }>;
    signIn: (email: string, password: string) => Promise<{
        success: boolean;
        error: Error | null;
    }>;
    signOut: () => Promise<void>;
    updateUserProfile: (fields: Partial<Pick<UserProfile, 'name' | 'phone' | 'profile_picture' | 'about'>>) => Promise<{ success: boolean; error: Error | null }>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Function to fetch user profile data
    const fetchUserProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                return null;
            }

            return data as UserProfile;
        } catch (error) {
            console.error('Error in fetchUserProfile:', error);
            return null;
        }
    };

    // Set a safety timeout to prevent infinite loading state
    useEffect(() => {
        if (isLoading) {
            const timeoutId = setTimeout(() => {
                console.warn('Auth loading timeout reached - resetting loading state');
                setIsLoading(false);
            }, 10000); // 10 seconds timeout

            return () => clearTimeout(timeoutId);
        }
    }, [isLoading]);

    // Initialize auth
    useEffect(() => {
        // Set initial loading state
        setIsLoading(true);

        // Check for active session on mount
        const initializeAuth = async () => {
            try {
                // Check if supabase is properly initialized
                if (!supabase) {
                    console.error('Supabase client is not properly initialized');
                    return;
                }

                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Error getting session:', error);
                    return;
                }

                if (data?.session?.user) {
                    setSession(data.session);
                    setUser(data.session.user);

                    const profile = await fetchUserProfile(data.session.user.id);
                    setUserProfile(profile);
                } else {
                    setSession(null);
                    setUser(null);
                    setUserProfile(null);
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                // Clear user states on error
                setSession(null);
                setUser(null);
                setUserProfile(null);
            } finally {
                setIsLoading(false);
            }
        };

        // Initialize auth immediately
        initializeAuth();

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                try {
                    // Set loading to true when auth state changes
                    setIsLoading(true);

                    // Only update if we have good data (avoid wiping during initialization)
                    setSession(newSession);

                    // Don't set user to null during page refreshes
                    if (newSession?.user) {
                        setUser(newSession.user);
                        const profile = await fetchUserProfile(newSession.user.id);
                        setUserProfile(profile);
                    } else if (event === 'SIGNED_OUT') {
                        // Only clear user on explicit sign out
                        setUser(null);
                        setUserProfile(null);
                    }
                } catch (error) {
                    console.error('Error in auth state change:', error);
                    // Clear user states on error to prevent stuck states
                    setUser(null);
                    setUserProfile(null);
                } finally {
                    // Always update loading state when done
                    setIsLoading(false);
                }
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Sign up with email and password
    const signUp = async (email: string, password: string, name?: string, phone?: string) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: 'https://offmenu.space/verification'
                }
            });

            if (!error && data.user) {
                // Create a user entry in the users table with the auth user's ID
                const { error: insertError } = await supabase
                    .from('users')
                    .insert({
                        id: data.user.id,
                        email: email,
                        name: name || null,
                        phone: phone || null,
                        role: 'user',
                        spaces_host: false
                    });

                if (insertError) {
                    console.error('Error creating user in database:', insertError);
                }
            }

            return {
                success: !error,
                error: error,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred'),
            };
        }
    };

    // Sign in with email and password
    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            return {
                success: !error,
                error: error,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred'),
            };
        }
    };

    // Sign out
    const signOut = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Error signing out:', error);
            }
            // Clear user data regardless of error
            setSession(null);
            setUserProfile(null);
            setUser(null);
        } catch (error) {
            console.error('Exception during sign out:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Add updateUserProfile function
    const updateUserProfile = async (fields: Partial<Pick<UserProfile, 'name' | 'phone' | 'profile_picture' | 'about'>>) => {
        if (!user) return { success: false, error: new Error('Not authenticated') };
        try {
            const { error } = await supabase
                .from('users')
                .update({ ...fields, updated_at: new Date().toISOString() })
                .eq('id', user.id);
            if (error) {
                return { success: false, error };
            }
            // Refetch profile after update
            const profile = await fetchUserProfile(user.id);
            setUserProfile(profile);
            return { success: true, error: null };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error : new Error('Unknown error') };
        }
    };

    const value = {
        user,
        userProfile,
        session,
        isLoading,
        signUp,
        signIn,
        signOut,
        updateUserProfile,
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Hook to use the auth context
export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
} 
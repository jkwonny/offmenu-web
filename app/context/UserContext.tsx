"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile, UserContextType } from '../types/user';
import { useUserProfileQuery } from '../queries/userQueries';
import posthog from 'posthog-js';

const UserContext = createContext<UserContextType | undefined>(undefined);

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { data: userProfile, isLoading: isProfileLoading, error: profileError, refetch: refetchUserProfile } = useUserProfileQuery(user?.id);

    if (profileError) {
        console.error('Error from useUserProfileQuery:', profileError);
    }

    // Helper function to identify user with PostHog
    const identifyUserWithPostHog = (user: User, userProfile?: UserProfile | null) => {
        // Only run PostHog operations in production
        if (isProduction && typeof window !== 'undefined' && user && posthog) {
            try {
                // Identify the user with PostHog
                posthog.identify(user.id, {
                    email: user.email,
                    name: userProfile?.name,
                    role: userProfile?.role,
                    offmenu_host: userProfile?.offmenu_host,
                });
            } catch (error) {
                console.error('Error identifying user with PostHog:', error);
            }
        }
    };

    // Identify user when userProfile is loaded/updated
    useEffect(() => {
        if (user && userProfile && !isProfileLoading) {
            identifyUserWithPostHog(user, userProfile);
        }
    }, [user, userProfile, isProfileLoading]);

    useEffect(() => {
        const combinedIsLoading = isLoading || isProfileLoading;
        if (combinedIsLoading) {
            const timeoutId = setTimeout(() => {
                console.warn('Auth/Profile loading timeout reached - resetting loading state');
                setIsLoading(false);
            }, 10000);

            return () => clearTimeout(timeoutId);
        }
    }, [isLoading, isProfileLoading]);

    // Initialize auth
    useEffect(() => {
        setIsLoading(true);
        const initializeAuth = async () => {
            try {
                if (!supabase) {
                    console.error('Supabase client is not properly initialized');
                    setIsLoading(false);
                    return;
                }

                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Error getting session:', error);
                    setIsLoading(false);
                    return;
                }

                if (data?.session?.user) {
                    setSession(data.session);
                    setUser(data.session.user);
                } else {
                    setSession(null);
                    setUser(null);
                    // Reset PostHog identification for anonymous users - only in production
                    if (isProduction && typeof window !== 'undefined' && posthog) {
                        posthog.reset();
                    }
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                setSession(null);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                setIsLoading(true);
                setSession(newSession);

                if (newSession?.user) {
                    setUser(newSession.user);
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    // Reset PostHog identification - only in production
                    if (isProduction && typeof window !== 'undefined' && posthog) {
                        posthog.reset();
                    }
                }
                setIsLoading(false);
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const signUp = async (email: string, password: string, name?: string, phone?: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: 'https://offmenu.space/verification'
                }
            });

            if (!error && data.user) {
                const { error: insertError } = await supabase
                    .from('users')
                    .insert({
                        id: data.user.id,
                        email: email,
                        name: name || null,
                        phone: phone || null,
                        role: 'user',
                        offmenu_host: false
                    });

                if (insertError) {
                    console.error('Error creating user in database:', insertError);
                } else {
                    // Check for and transfer any unclaimed venues with this email
                    await transferUnclaimedVenues(data.user.id, email);
                }
            }
            setIsLoading(false);
            return {
                success: !error,
                error: error,
            };
        } catch (error) {
            setIsLoading(false);
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred'),
            };
        }
    };

    // Helper function to transfer unclaimed venues
    const transferUnclaimedVenues = async (userId: string, email: string) => {
        try {
            
            const { error } = await supabase
                .from('venues')
                .update({
                    owner_id: userId,
                    updated_at: new Date().toISOString()
                })
                .eq('contact_email', email)

            if (error) {
                console.error('Error transferring venues on signup:', error);
            } else {
                console.log('Successfully transferred venues to new user');
            }
        } catch (error) {
            console.error('Error in transferUnclaimedVenues:', error);
        }
    };

    const signIn = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const { error, data } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (!error && data.user) {
                await refetchUserProfile();
                // Check for and transfer any unclaimed venues with this email
                await transferUnclaimedVenues(data.user.id, email);
            }

            setIsLoading(false);
            return {
                success: !error,
                error: error,
            };
        } catch (error) {
            setIsLoading(false);
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
            } else {
                // Reset PostHog identification - only in production
                if (isProduction && typeof window !== 'undefined' && posthog) {
                    posthog.reset();
                }
            }
        } catch (error) {
            console.error('Exception during sign out:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Add resetPassword function
    const resetPassword = async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
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

    // Add updateUserProfile function
    const updateUserProfile = async (fields: Partial<Pick<UserProfile, 'name' | 'phone' | 'profile_picture' | 'about'>>) => {
        if (!user) return { success: false, error: new Error('Not authenticated') };
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ ...fields, updated_at: new Date().toISOString() })
                .eq('id', user.id);
            if (error) {
                setIsLoading(false);
                return { success: false, error };
            }
            await refetchUserProfile();
            setIsLoading(false);
            return { success: true, error: null };
        } catch (error) {
            setIsLoading(false);
            return { success: false, error: error instanceof Error ? error : new Error('Unknown error') };
        }
    };

    const value = {
        user,
        userProfile: userProfile || null,
        session,
        isLoading: isLoading || isProfileLoading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updateUserProfile,
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
} 
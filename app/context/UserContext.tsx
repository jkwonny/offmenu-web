"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile, UserContextType } from '../types/user';
import { useUserProfileQuery } from '../queries/userQueries';

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { data: userProfile, isLoading: isProfileLoading, error: profileError, refetch: refetchUserProfile } = useUserProfileQuery(user?.id);

    if (profileError) {
        console.error('Error from useUserProfileQuery:', profileError);
    }

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
                    // User profile will be fetched by useUserProfileQuery automatically when user.id is set
                } else {
                    setSession(null);
                    setUser(null);
                    // setUserProfile(null); // Managed by useUserProfileQuery
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                setSession(null);
                setUser(null);
                // setUserProfile(null); // Managed by useUserProfileQuery
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
                        spaces_host: false
                    });

                if (insertError) {
                    console.error('Error creating user in database:', insertError);
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

    const signIn = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const { error, data } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (!error && data.user) {
                await refetchUserProfile();
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
            }
        } catch (error) {
            console.error('Exception during sign out:', error);
        } finally {
            setIsLoading(false);
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
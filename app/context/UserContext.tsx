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

    useEffect(() => {
        // Check for active session on mount
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                const profile = await fetchUserProfile(session.user.id);
                setUserProfile(profile);
            }

            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    const profile = await fetchUserProfile(session.user.id);
                    setUserProfile(profile);
                } else {
                    setUserProfile(null);
                }

                setIsLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Sign up with email and password
    const signUp = async (email: string, password: string, name?: string, phone?: string) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
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
        await supabase.auth.signOut();
        setUserProfile(null);
    };

    const value = {
        user,
        userProfile,
        session,
        isLoading,
        signUp,
        signIn,
        signOut,
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
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

type UserContextType = {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signUp: (email: string, password: string) => Promise<{
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
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for active session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setIsLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Sign up with email and password
    const signUp = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signUp({
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
    };

    const value = {
        user,
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
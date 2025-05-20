import { Session } from '@supabase/supabase-js';

export interface User {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    role?: string;
}

export type UserProfile = {
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

export type UserContextType = {
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
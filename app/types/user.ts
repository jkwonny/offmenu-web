export interface User {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    role?: string;
}
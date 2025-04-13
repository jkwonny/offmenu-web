"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

export type BookingType = 'PopUp' | 'Event' | 'Birthday' | 'Corporate';

export interface BookingData {
    type: BookingType | null;
    purpose: string;
    people: number | null;
    pitch: string;
    budget: number | null;
}

interface BookingContextType {
    bookingData: BookingData;
    updateBookingData: (data: Partial<BookingData>) => void;
    resetBookingData: () => void;
}

const initialBookingData: BookingData = {
    type: null,
    purpose: '',
    people: null,
    pitch: '',
    budget: null,
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
    const [bookingData, setBookingData] = useState<BookingData>(initialBookingData);

    const updateBookingData = (data: Partial<BookingData>) => {
        setBookingData(prev => ({ ...prev, ...data }));
    };

    const resetBookingData = () => {
        setBookingData(initialBookingData);
    };

    return (
        <BookingContext.Provider value={{ bookingData, updateBookingData, resetBookingData }}>
            {children}
        </BookingContext.Provider>
    );
}

export function useBooking() {
    const context = useContext(BookingContext);
    if (context === undefined) {
        throw new Error('useBooking must be used within a BookingProvider');
    }
    return context;
} 
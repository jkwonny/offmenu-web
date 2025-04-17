'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type EventType = 'Pop Up' | 'Birthday' | 'Corporate' | 'Wedding' | 'Other';

interface EventDetails {
    type: EventType;
    guestCount: number;
    date: string;
    tags?: string[];
}

interface EventContextType {
    eventDetails: EventDetails;
    setEventDetails: React.Dispatch<React.SetStateAction<EventDetails>>;
}

const defaultEventDetails: EventDetails = {
    type: 'Pop Up',
    guestCount: 50,
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    tags: []
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
    const [eventDetails, setEventDetails] = useState<EventDetails>(defaultEventDetails);

    return (
        <EventContext.Provider value={{ eventDetails, setEventDetails }}>
            {children}
        </EventContext.Provider>
    );
}

export function useEventDetails() {
    const context = useContext(EventContext);
    if (context === undefined) {
        throw new Error('useEventDetails must be used within an EventProvider');
    }
    return context;
} 
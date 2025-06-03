"use client";

import { useState, useCallback } from "react";
import { Venue } from "@/types/Venue";

export interface UseVenueCartReturn {
    selectedVenues: Venue[];
    addVenue: (venue: Venue) => void;
    removeVenue: (venueId: string) => void;
    clearVenues: () => void;
    isVenueSelected: (venueId: string) => boolean;
    venueCount: number;
}

export function useVenueCart(): UseVenueCartReturn {
    const [selectedVenues, setSelectedVenues] = useState<Venue[]>([]);

    const addVenue = useCallback((venue: Venue) => {
        setSelectedVenues(prev => {
            // Check if venue is already selected
            if (prev.some(v => v.id === venue.id)) {
                return prev;
            }
            return [...prev, venue];
        });
    }, []);

    const removeVenue = useCallback((venueId: string) => {
        setSelectedVenues(prev => prev.filter(venue => venue.id !== venueId));
    }, []);

    const clearVenues = useCallback(() => {
        setSelectedVenues([]);
    }, []);

    const isVenueSelected = useCallback((venueId: string) => {
        return selectedVenues.some(venue => venue.id === venueId);
    }, [selectedVenues]);

    return {
        selectedVenues,
        addVenue,
        removeVenue,
        clearVenues,
        isVenueSelected,
        venueCount: selectedVenues.length,
    };
} 
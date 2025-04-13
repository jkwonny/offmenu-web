'use client';

import { useState } from 'react';
import MapboxMap from '../components/MapboxMap';
import { useVenues } from '../lib/queries';
import EventHeader from '../components/EventHeader';
import VenueCarousel from '../components/VenueCarousel';
import FloatingButton from '../components/FloatingButton';
import NavBar from '../components/NavBar';

export default function ExplorePage() {
    const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

    // Use React Query to fetch venues
    const { data: venues = [], isLoading, error } = useVenues();

    const handleExploreMoreClick = () => {
        // This would typically navigate to a more comprehensive venue listing page
        alert('This would take you to an expanded venue listing page');
    };

    return (
        <>
            <NavBar />
            <div className="flex flex-col h-screen w-full relative">
                {/* Sticky header */}
                <EventHeader />

                {/* Main content with map taking full available height */}
                <div className="flex-1 relative">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full bg-[#FFF9F5]">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg m-4">
                            {error instanceof Error ? error.message : 'An error occurred while fetching venues'}
                        </div>
                    ) : (
                        <MapboxMap
                            venues={venues}
                            selectedVenueId={selectedVenueId}
                            onMarkerClick={setSelectedVenueId}
                        />
                    )}

                    {/* Bottom venue carousel overlaid on map */}
                    {!isLoading && !error && venues.length > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 z-10">
                            <VenueCarousel
                                venues={venues}
                                selectedVenueId={selectedVenueId}
                                onVenueClick={setSelectedVenueId}
                            />
                        </div>
                    )}
                </div>

                {/* Floating "Explore More" button */}
                <FloatingButton onClick={handleExploreMoreClick} />
            </div>
        </>
    );
} 
'use client';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import MapboxMap from '../components/MapboxMap';
import { useVenues } from '../lib/queries';
import { useEvents } from '../lib/queries';
// import EventHeader from '../components/EventHeader';
import FloatingButton from '../components/FloatingButton';
import NavBar from '../components/NavBar';
import { useSearchParams, useRouter } from 'next/navigation';

// Define types for venue images
interface VenueImage {
    image_url: string;
    sort_order?: number;
}

// Define types for events
interface Event {
    id: string;
    title: string;
    event_type: string;
    start_date: string;
    end_date?: string;
    description?: string;
    assets_needed?: string[];
    expected_capacity_min?: number;
    expected_capacity_max?: number;
    image_url: string;
    venue_images?: VenueImage[];
    address: string;
    pricing_type: string;
    price?: number;
}

// Helper function to format text
const formatText = (text: string) => {
    return text.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Create a client component for the content that uses useSearchParams
function ExploreContent() {
    const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
    const [currentImageIndices, setCurrentImageIndices] = useState<Record<string, number>>({});
    const searchParams = useSearchParams();
    const router = useRouter();

    // Get the view from URL parameters, default to 'spaces'
    const view = searchParams.get('view') || 'spaces';
    const selectedView = view === 'popups' ? 'popups' : 'spaces';

    // Use React Query to fetch venues and events
    const { data: venues = [], isLoading: venuesLoading, error: venuesError } = useVenues();
    const { data: events = [], isLoading: eventsLoading, error: eventsError } = useEvents<Event[]>();

    const isLoading = selectedView === 'spaces' ? venuesLoading : eventsLoading;
    const error = selectedView === 'spaces' ? venuesError : eventsError;

    const handleExploreMoreClick = () => {
        // This would typically navigate to a more comprehensive venue listing page
        alert('This would take you to an expanded venue listing page');
    };

    const handleVenueClick = (venueId: string) => {
        // Set the selected venue ID
        setSelectedVenueId(venueId);
        // Open the venue detail page in a new tab
        window.open(`/venue/${venueId}`, '_blank');
    };

    const handleMarkerClick = (venueId: string) => {
        // Only update the selected venue ID, without navigating away
        setSelectedVenueId(venueId);
    };

    const handleImageNav = (
        event: React.MouseEvent,
        venueId: string,
        direction: 'prev' | 'next',
        maxIndex: number
    ) => {
        event.stopPropagation(); // Prevent triggering the venue click

        setCurrentImageIndices((prev) => {
            const currentIndex = prev[venueId] || 0;
            if (direction === 'prev' && currentIndex > 0) {
                return { ...prev, [venueId]: currentIndex - 1 };
            } else if (direction === 'next' && currentIndex < maxIndex) {
                return { ...prev, [venueId]: currentIndex + 1 };
            }
            return prev;
        });
    };

    return (
        <div className="flex flex-col h-screen w-full">
            {/* View Toggle */}


            {/* Sticky header */}
            {/* <EventHeader /> */}

            {/* Main content with two-column layout */}
            <div className="flex flex-row flex-1 overflow-hidden">
                {/* Venues list on the left - 60% width */}
                <div className="w-[55%] overflow-y-auto bg-[#FFF9F5] p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ca0013]"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg m-4">
                            {error instanceof Error ? error.message : 'An error occurred while fetching data'}
                        </div>
                    ) : selectedView === 'spaces' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {venues.map((venue) => {
                                const venueImages = venue.venue_images && venue.venue_images.length > 0
                                    ? venue.venue_images
                                    : [{ image_url: venue.image_url }];

                                const normalizedImages = venueImages.map((img: VenueImage | string) =>
                                    typeof img === 'string' ? img : img.image_url
                                );

                                const currentIndex = currentImageIndices[venue.id] || 0;
                                const isFirstImage = currentIndex === 0;
                                const isLastImage = currentIndex === normalizedImages.length - 1;

                                return (
                                    <div
                                        key={venue.id}
                                        className={`cursor-pointer transition-all hover:opacity-90 ${selectedVenueId === venue.id ? 'ring-2 ring-[#ca0013]' : ''}`}
                                        onClick={() => handleVenueClick(venue.id)}
                                    >
                                        <div className="aspect-square w-full overflow-hidden rounded-xl relative group">
                                            <Image
                                                src={normalizedImages[currentIndex]}
                                                alt={venue.name}
                                                className="h-full w-full object-cover transition-all duration-500"
                                                width={400}
                                                height={400}
                                            />

                                            {/* Navigation buttons - only visible on hover */}
                                            {!isFirstImage && (
                                                <button
                                                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white p-1.5 rounded-full opacity-0 group-hover:opacity-80 transition-opacity shadow-md"
                                                    onClick={(e) => handleImageNav(e, venue.id, 'prev', normalizedImages.length - 1)}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                                    </svg>
                                                </button>
                                            )}

                                            {!isLastImage && (
                                                <button
                                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white p-1.5 rounded-full opacity-0 group-hover:opacity-80 transition-opacity shadow-md"
                                                    onClick={(e) => handleImageNav(e, venue.id, 'next', normalizedImages.length - 1)}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                                    </svg>
                                                </button>
                                            )}

                                            {/* Image indicators */}
                                            {normalizedImages.length > 1 && (
                                                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                                                    {normalizedImages.map((_: string, index: number) => (
                                                        <div
                                                            key={index}
                                                            className={`h-1.5 w-1.5 rounded-full ${currentIndex === index ? 'bg-white' : 'bg-white/50'}`}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-2">
                                            <h3 className="font-medium text-base">{venue.name}</h3>
                                            <p className="text-gray-500 text-sm mt-0.5">{venue.address}</p>
                                            {venue.pricing_type === 'no_minimum_spend' ? (
                                                <p className="text-sm mt-1 font-medium">No Minimum Spend</p>
                                            ) : (
                                                <p className="text-sm mt-1 font-medium">
                                                    ${venue.price}
                                                    {venue.pricing_type === 'hourly' && ' / hour'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events.map((event: Event) => (
                                <div
                                    key={event.id}
                                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
                                >
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-2">
                                            <h2 className="text-2xl font-semibold">{event.title}</h2>
                                            <span className="px-3 py-1 bg-[#ca0013] text-white rounded-full text-sm font-medium">
                                                {formatText(event.event_type)}
                                            </span>
                                        </div>
                                        <div className="text-gray-600 mb-4">
                                            {format(event.start_date, 'MMM d, yyyy')}
                                            {event.end_date && ` - ${format(event.end_date, 'MMM d, yyyy')}`}
                                        </div>
                                        <p className="text-gray-700 mb-4 line-clamp-3">
                                            {event.description || 'No description available'}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {event.assets_needed?.map((tag: string, index: number) => (
                                                <span
                                                    key={index}
                                                    className="px-3 py-1 bg-[#ca0013] text-white rounded-full text-sm"
                                                >
                                                    {formatText(tag)}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="text-sm text-gray-600">
                                                {event.expected_capacity_min && event.expected_capacity_max
                                                    ? `${event.expected_capacity_min}-${event.expected_capacity_max} guests`
                                                    : 'Guest count not specified'}
                                            </div>
                                            <button
                                                className="px-4 py-2 bg-[#ca0013] text-white rounded hover:bg-[#ca0013] transition-colors duration-200"
                                                onClick={() => {/* TODO: Implement messaging */ }}
                                            >
                                                Message
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Map on the right - 40% width */}
                <div className="w-[45%] relative">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full bg-[#FFF9F5]">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ca0013]"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg m-4">
                            {error instanceof Error ? error.message : 'An error occurred while fetching data'}
                        </div>
                    ) : (
                        <div className="h-full">
                            <MapboxMap
                                venues={venues}
                                selectedVenueId={selectedVenueId}
                                onMarkerClick={handleMarkerClick}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ExplorePage() {
    return (
        <>
            <NavBar />
            <Suspense fallback={<div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ca0013]"></div>
            </div>}>
                <ExploreContent />
            </Suspense>
        </>
    );
} 
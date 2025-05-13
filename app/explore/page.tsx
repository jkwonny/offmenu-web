'use client';

import { useState, Suspense, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import MapboxMap from '../components/MapboxMap';
import { useVenues } from '../lib/queries';
import { useEvents } from '../lib/queries';
import NavBar from '../components/NavBar';
import { useSearchParams } from 'next/navigation';
import { useUser } from '../context/UserContext';
import { FaRegHandshake } from "react-icons/fa";
import { LuMapPin } from "react-icons/lu";
import DateTimePicker from '../components/DateTimePicker';


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
    selected_date: string;
    selected_time?: string;
    description?: string;
    assets_needed?: string[];
    expected_capacity_min?: number;
    expected_capacity_max?: number;
    image_url: string;
    event_photos?: VenueImage[];
    address: string;
    pricing_type: string;
    price?: number;
    user_id?: string;
    owner_id?: string;
}

// Helper function to format text
const formatText = (text: string) => {
    return text.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Create a client component for the content that uses useSearchParams
function ExploreContent() {
    const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
    const [currentImageIndices, setCurrentImageIndices] = useState<Record<string, number>>({});
    const [capacityFilter, setCapacityFilter] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);
    const [showCapacityMenu, setShowCapacityMenu] = useState(false);
    const searchParams = useSearchParams();
    const { user } = useUser();
    const capacityMenuRef = useRef<HTMLDivElement>(null);

    // Get the view from URL parameters, default to 'spaces'
    const view = searchParams.get('view') || 'spaces';
    const selectedView = view === 'popups' ? 'popups' : 'spaces';

    // Use React Query to fetch venues and events
    const { data: allVenues = [], isLoading: venuesLoading, error: venuesError } = useVenues();
    const { data: allEvents = [], isLoading: eventsLoading, error: eventsError } = useEvents<Event[]>();

    // Filter out venues and events owned by the current user
    const venues = allVenues.filter(venue => venue.owner_id !== user?.id && venue.status === 'approved');

    // Apply capacity filter and date/time filter to venues
    const filteredVenues = venues.filter(venue => {
        // Capacity filter
        if (capacityFilter) {
            const capacity = venue.capacity || 0;

            if (capacityFilter === '75+') {
                if (capacity < 75) return false;
            } else {
                const [min, max] = capacityFilter.split('-').map(Number);
                if (capacity < min || capacity > max) return false;
            }
        }

        // If date and time filters are active, check availability
        // This is a simplified implementation - you'd need to check
        // against actual venue availability data from your database
        if (selectedDate && selectedTime) {
            // Check if the venue has any bookings that conflict with the selected date/time
            // For now, we'll assume all venues are available on all dates/times
            // You would need to implement actual availability checking based on your data model
            return true;
        }

        return true;
    });

    const events = allEvents.filter(event => (event.owner_id !== user?.id && event.user_id !== user?.id));

    const isLoading = selectedView === 'spaces' ? venuesLoading : eventsLoading;
    const error = selectedView === 'spaces' ? venuesError : eventsError;

    const handleVenueClick = (venueId: string) => {
        // Set the selected venue ID
        setSelectedVenueId(venueId);
        // Open the venue detail page in a new tab
        window.open(`/venue/${venueId}`, '_blank');
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

    // Close menus when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (capacityMenuRef.current && !capacityMenuRef.current.contains(event.target as Node)) {
                setShowCapacityMenu(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="flex flex-col w-full">
            {/* Content container - floating on top of the map */}
            <div className="w-full p-6 bg-white rounded-lg shadow-lg max-h-[calc(100vh-120px)] overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ca0013]"></div>
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg m-4">
                        {error instanceof Error ? error.message : 'An error occurred while fetching data'}
                    </div>
                ) : selectedView === 'spaces' ? (
                    <div className="min-h-screen">
                        {/* Venue count and filters */}
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4">{filteredVenues.length} Spaces</h2>

                            <div className="flex h-14 bg-[#F6F6F6] border border-gray-200 rounded-md items-center">
                                {/* Capacity filter */}
                                <div className="w-1/2 h-full relative" ref={capacityMenuRef}>
                                    <button
                                        onClick={() => setShowCapacityMenu(!showCapacityMenu)}
                                        className="w-full h-full flex items-center justify-between rounded-md px-3 focus:outline-none"
                                    >
                                        <span className="text-gray-800">
                                            {capacityFilter ?
                                                (capacityFilter === '75+' ? '75+ guests' : `${capacityFilter} guests`) :
                                                'Capacity'}
                                        </span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={showCapacityMenu ? "rotate-180" : ""}>
                                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>

                                    {showCapacityMenu && (
                                        <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-full overflow-hidden">
                                            <div>
                                                {[
                                                    { value: '', label: 'Any capacity' },
                                                    { value: '1-15', label: '1-15 guests' },
                                                    { value: '16-30', label: '16-30 guests' },
                                                    { value: '31-50', label: '31-50 guests' },
                                                    { value: '51-75', label: '51-75 guests' },
                                                    { value: '75+', label: '75+ guests' }
                                                ].map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => {
                                                            setCapacityFilter(option.value);
                                                            setShowCapacityMenu(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 rounded text-sm 
                                                            ${capacityFilter === option.value ? 'bg-black text-white' : 'hover:bg-black/10'}`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="h-8 w-px bg-gray-200"></div>

                                {/* Date/Time Selector */}
                                <div className="w-1/2 h-full">
                                    <DateTimePicker
                                        selectedDate={selectedDate}
                                        selectedTime={selectedTime}
                                        onDateSelect={setSelectedDate}
                                        onTimeSelect={setSelectedTime}
                                        onConfirm={() => setShowDateTimePicker(false)}
                                        showPicker={showDateTimePicker}
                                        togglePicker={() => setShowDateTimePicker(!showDateTimePicker)}
                                        pickerPosition="right"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredVenues.length > 0 ? (
                                filteredVenues.map((venue) => {
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
                                            className={`cursor-pointer bg-[#F6F8FC] p-2 rounded-lg transition-all hover:opacity-90 ${selectedVenueId === venue.id ? 'ring-2 ring-[#ca0013]' : ''}`}
                                            onClick={() => handleVenueClick(venue.id)}
                                        >
                                            <div className="aspect-square w-full overflow-hidden rounded-xl relative group">
                                                <Image
                                                    src={normalizedImages[currentIndex]}
                                                    alt={venue.name}
                                                    className="h-full w-full object-cover transition-all duration-500"
                                                    width={300}
                                                    height={300}
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
                                            <div className="py-3 px-3">
                                                <h3 className="font-medium text-xl text-base">{venue.name}</h3>
                                                <p className="text-gray-500 text-sm mt-0.5 flex items-center">
                                                    <LuMapPin className="w-4 h-4 mr-1" />
                                                    {venue.address}
                                                </p>
                                                {venue.pricing_type === 'no_minimum_spend' ? (
                                                    <p className="text-sm mt-1 font-medium flex items-center">
                                                        <FaRegHandshake className="w-4 h-4 mr-1" />
                                                        No Minimum Spend
                                                    </p>
                                                ) : (
                                                    <p className="text-sm mt-1 font-medium flex items-center">
                                                        <FaRegHandshake className="w-4 h-4 mr-1" />
                                                        ${venue.price}
                                                        {venue.pricing_type === 'hourly' && ' / hour'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 flex flex-col items-center justify-center py-10 text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">No spaces found</h3>
                                    <p className="text-gray-500">Try adjusting your filters to see more results</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                        {events.map((event: Event) => (
                            <div
                                key={event.id}
                                className="bg-[#F6F8FC] rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h2 className="text-2xl font-semibold">{event.title}</h2>
                                        <span className="px-3 py-1 bg-[#ca0013] text-white rounded-full text-sm font-medium whitespace-nowrap">
                                            {formatText(event.event_type)}
                                        </span>
                                    </div>
                                    <div className="text-gray-600 mb-4">
                                        {format(event.selected_date, 'MMM d, yyyy')}
                                        {event.selected_time && ` at ${event.selected_time}`}
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
        </div>
    );
}

export default function ExplorePage() {
    return (
        <div className="relative h-screen w-screen">
            {/* Map takes up the entire screen */}
            <div className="absolute inset-0">
                <Suspense fallback={<div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ca0013]"></div>
                </div>}>
                    <ExploreMap />
                </Suspense>
            </div>

            {/* Floating navbar with margin on all sides */}
            <div className="absolute top-0 left-0 right-0 m-3">
                <div className="bg-white rounded-lg shadow-lg">
                    <NavBar />
                </div>
            </div>

            {/* Floating content container below navbar */}
            <div className="absolute top-22 left-3 w-full lg:w-1/2 max-w-[1/2]">
                <Suspense fallback={<div className="flex items-center justify-center h-12 w-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ca0013]"></div>
                </div>}>
                    <ExploreContent />
                </Suspense>
            </div>
        </div>
    );
}

// Map component that will receive venue data
function ExploreMap() {
    const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const { user } = useUser();

    // Get the view from URL parameters, default to 'spaces'
    const view = searchParams.get('view') || 'spaces';
    const selectedView = view === 'popups' ? 'popups' : 'spaces';

    // Use React Query to fetch venues
    const { data: allVenues = [], isLoading: venuesLoading } = useVenues();

    // Filter out venues owned by the current user
    const venues = allVenues.filter(venue => venue.owner_id !== user?.id && venue.status === 'approved');

    const handleMarkerClick = useCallback((venueId: string) => {
        setSelectedVenueId(venueId);
    }, []);

    if (venuesLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ca0013]"></div>
            </div>
        );
    }

    // Only show the map if we have venues and we're in spaces view
    return (
        <MapboxMap
            venues={selectedView === 'spaces' ? venues : []}
            selectedVenueId={selectedVenueId}
            onMarkerClick={handleMarkerClick}
        />
    );
} 
'use client';

import { useState, Suspense, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createRoot } from 'react-dom/client';
import { Venue } from '@/types/Venue';
import { useVenues, useEvents } from '../lib/queries';
import NavBar from '../components/NavBar';
import { useSearchParams } from 'next/navigation';
import { useUser } from '../context/UserContext';
import { FaRegHandshake } from "react-icons/fa";
import { LuMapPin } from "react-icons/lu";
import { IoClose } from "react-icons/io5";
import DateTimePicker from '../components/DateTimePicker';
import { collaborationTypeLookUp } from '@/utils/collaborationTypeLookUp';
import Link from 'next/link';

// Define local VenueImage interface to avoid import case issues
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
    event_images?: VenueImage[];
    address: string;
    pricing_type: string;
    price?: number;
    user_id?: string;
    owner_id?: string;
}

// PopupContent component for MapboxMap
interface PopupContentProps {
    venue: Venue;
    priceDisplay: string;
    venueImages?: string[];
    onClose?: () => void;
}

const PopupContent = ({ venue, priceDisplay, venueImages, onClose }: PopupContentProps) => {
    // Handle click on the carousel container
    const handleCarouselClick = (e: React.MouseEvent) => {
        // Check if the click event target is a button or button child element
        // This prevents navigation when clicking carousel controls
        const target = e.target as HTMLElement;
        const isButton = target.tagName === 'BUTTON' ||
            target.closest('button') !== null ||
            target.classList.contains('z-5');

        if (!isButton) {
            window.open(`/spaces/${venue.id}`, '_blank');
        }
    };

    return (
        <div className="p-0 w-[300px] z-[5] bg-[#E9EDF4] p-2 text-black relative">
            <button
                onClick={onClose}
                className="absolute top-3 right-3 z-[5] bg-[#E9EDF4] bg-opacity-70 p-1 rounded-full text-gray-800 hover:bg-opacity-100 transition-all"
                aria-label="Close popup"
            >
                <IoClose size={18} />
            </button>
            <div
                id={`carousel-container-${venue.id}`}
                className="relative w-full h-64 cursor-pointer"
                onClick={handleCarouselClick}
            >
                <Image
                    src={venueImages?.[0] ?? '/images/default-venue-image.jpg'}
                    height={256}
                    width={256}
                    alt={venue.name}
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="p-3">
                <h3 className="font-bold text-xl mb-1 font-heading">
                    {venue.name}
                </h3>
                <p className="text-sm mb-2 flex items-center">
                    <LuMapPin className="mr-1" /> {venue.neighborhood}
                </p>
                <p className="text-sm mb-2 flex items-center">
                    <FaRegHandshake className="mr-1" /> {priceDisplay}
                </p>
                <a
                    href={`/spaces/${venue.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover underline"
                >
                    View Details
                </a>

                {/* Tags section */}
                <div className="flex flex-wrap gap-2 mt-3">
                    {venue.tags && venue.tags.map((tag, index) => (
                        <span
                            key={index}
                            className="px-2 py-0.5 bg-transparent border text-black rounded-full text-xs font-medium capitalize"
                        >
                            {tag.replace(/_/g, ' ')}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Helper function to format text
const formatText = (text: string) => {
    return text.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Helper function to get image URL from VenueImage or string
const getImageUrl = (image: VenueImage | string): string => {
    return typeof image === 'string' ? image : image.image_url;
};

// Create a client component for the content that uses useSearchParams
function ExploreContent({ onVenueHover }: { onVenueHover: (venueId: string | null) => void }) {
    const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
    const [currentImageIndices, setCurrentImageIndices] = useState<Record<string, number>>({});
    const [capacityFilter, setCapacityFilter] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);
    const [showCapacityMenu, setShowCapacityMenu] = useState(false);

    // Mobile swipe states
    const [containerHeight, setContainerHeight] = useState<number>(80); // Start minimized on mobile
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startHeight, setStartHeight] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    const searchParams = useSearchParams();
    const { user } = useUser();
    const capacityMenuRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Check if we're on mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

    // Mobile touch handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!isMobile) return; // Only on mobile

        setIsDragging(true);
        setStartY(e.touches[0].clientY);
        setStartHeight(containerHeight);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || !isMobile) return;

        const currentY = e.touches[0].clientY;
        const deltaY = startY - currentY; // Positive when swiping up
        const newHeight = Math.max(80, Math.min(window.innerHeight - 120, startHeight + deltaY));

        setContainerHeight(newHeight);
    };

    const handleTouchEnd = () => {
        if (!isDragging || !isMobile) return;

        setIsDragging(false);

        // Snap to positions based on final height
        const windowHeight = window.innerHeight;
        const threshold = windowHeight * 0.3;

        if (containerHeight < threshold) {
            // Snap to minimized
            setContainerHeight(80);
        } else if (containerHeight < windowHeight * 0.7) {
            // Snap to half
            setContainerHeight(windowHeight * 0.5);
        } else {
            // Snap to full
            setContainerHeight(windowHeight - 120);
        }
    };

    // Mouse handlers for desktop testing
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isMobile) return;

        setIsDragging(true);
        setStartY(e.clientY);
        setStartHeight(containerHeight);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !isMobile) return;

        const deltaY = startY - e.clientY;
        const newHeight = Math.max(80, Math.min(window.innerHeight - 120, startHeight + deltaY));

        setContainerHeight(newHeight);
    };

    const handleMouseUp = () => {
        if (!isDragging || !isMobile) return;

        setIsDragging(false);

        const windowHeight = window.innerHeight;
        const threshold = windowHeight * 0.3;

        if (containerHeight < threshold) {
            setContainerHeight(80);
        } else if (containerHeight < windowHeight * 0.7) {
            setContainerHeight(windowHeight * 0.5);
        } else {
            setContainerHeight(windowHeight - 120);
        }
    };

    // Set up mouse move and up listeners on document
    useEffect(() => {
        if (isDragging) {
            const handleDocumentMouseMove = (e: MouseEvent) => {
                if (!isDragging || !isMobile) return;

                const deltaY = startY - e.clientY;
                const newHeight = Math.max(80, Math.min(window.innerHeight - 120, startHeight + deltaY));

                setContainerHeight(newHeight);
            };

            const handleDocumentMouseUp = () => {
                if (!isDragging || !isMobile) return;

                setIsDragging(false);

                const windowHeight = window.innerHeight;
                const threshold = windowHeight * 0.3;

                if (containerHeight < threshold) {
                    setContainerHeight(80);
                } else if (containerHeight < windowHeight * 0.7) {
                    setContainerHeight(windowHeight * 0.5);
                } else {
                    setContainerHeight(windowHeight - 120);
                }
            };

            document.addEventListener('mousemove', handleDocumentMouseMove);
            document.addEventListener('mouseup', handleDocumentMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleDocumentMouseMove);
                document.removeEventListener('mouseup', handleDocumentMouseUp);
            };
        }
    }, [isDragging, startY, startHeight, containerHeight, isMobile]);

    const handleVenueClick = (venueId: string) => {
        // Set the selected venue ID
        setSelectedVenueId(venueId);
        // Open the venue detail page in a new tab
        window.open(`/spaces/${venueId}`, '_blank');
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
        <div
            ref={containerRef}
            className="flex flex-col w-full z-5 lg:relative lg:h-auto"
            style={{
                height: isMobile ? `${containerHeight}px` : 'auto',
                transition: isDragging ? 'none' : 'height 0.3s ease-out'
            }}
        >
            {/* Mobile drag handle - only visible on mobile */}
            <div
                className="lg:hidden flex justify-center py-2 cursor-grab active:cursor-grabbing bg-white rounded-t-lg"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* Content container */}
            <div className="w-full p-6 bg-white lg:rounded-lg shadow-lg flex-1 overflow-hidden lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
                {/* Mobile header - only show space count when minimized */}
                <div className="lg:hidden mb-4">
                    <h2 className="text-xl font-semibold">
                        {selectedView === 'spaces' ? `${filteredVenues.length} Spaces` : `${events.length} Events`}
                    </h2>
                    {containerHeight > 120 && (
                        <div className="mt-4">
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
                    )}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#273287]"></div>
                    </div>
                ) : error ? (
                    <div className="p-4 bg-[#273287]/10 text-[#273287] border border-[#273287]/20 rounded-lg m-4">
                        {error instanceof Error ? error.message : 'An error occurred while fetching data'}
                    </div>
                ) : selectedView === 'spaces' ? (
                    <div className="min-h-screen lg:min-h-0">
                        {/* Desktop header - hidden on mobile */}
                        <div className="hidden lg:block mb-8">
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

                        {/* Content that shows when expanded on mobile or always on desktop */}
                        <div className={`${(containerHeight > 120 || !isMobile) ? 'block' : 'hidden'} lg:block`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto" style={{ maxHeight: containerHeight > 120 ? `${containerHeight - 200}px` : 'none' }}>
                                {filteredVenues.length > 0 ? (
                                    filteredVenues.map((venue) => {
                                        const venueImages = venue.venue_images && venue.venue_images.length > 0
                                            ? venue.venue_images.map((img: VenueImage) => getImageUrl(img))
                                            : [venue.image_url || '/images/default-venue-image.jpg'];

                                        const currentIndex = currentImageIndices[venue.id] || 0;
                                        const isFirstImage = currentIndex === 0;
                                        const isLastImage = currentIndex === venueImages.length - 1;

                                        return (
                                            <div
                                                key={venue.id}
                                                className={`cursor-pointer bg-[#F6F8FC] p-2 rounded-lg transition-all hover:opacity-90 ${selectedVenueId === venue.id ? 'ring-2 ring-[#273287]' : ''}`}
                                                onClick={() => handleVenueClick(venue.id)}
                                                onMouseEnter={() => {
                                                    // Only trigger hover event if this isn't the currently selected venue
                                                    // This prevents re-centering the map when hovering over the already selected venue
                                                    if (venue.id !== selectedVenueId) {
                                                        onVenueHover(venue.id);
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    // Only clear hover if this isn't the selected venue
                                                    if (venue.id !== selectedVenueId) {
                                                        onVenueHover(null);
                                                    }
                                                }}
                                            >
                                                <div className="aspect-[4/3] lg:aspect-square w-full overflow-hidden rounded-xl relative group">
                                                    <Image
                                                        src={venueImages[currentIndex]}
                                                        alt={venue.name}
                                                        className="h-full w-full object-cover transition-all duration-500"
                                                        width={300}
                                                        height={300}
                                                    />

                                                    {/* Navigation buttons - only visible on hover */}
                                                    {!isFirstImage && (
                                                        <button
                                                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white p-1.5 rounded-full opacity-0 group-hover:opacity-80 transition-opacity shadow-md"
                                                            onClick={(e) => handleImageNav(e, venue.id, 'prev', venueImages.length - 1)}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {!isLastImage && (
                                                        <button
                                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white p-1.5 rounded-full opacity-0 group-hover:opacity-80 transition-opacity shadow-md"
                                                            onClick={(e) => handleImageNav(e, venue.id, 'next', venueImages.length - 1)}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Image indicators */}
                                                    {venueImages.length > 1 && (
                                                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                                                            {venueImages.map((_: string, index: number) => (
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
                                                    <p className="text-sm mt-1 font-medium flex items-center">
                                                        <FaRegHandshake className="w-4 h-4 mr-1" />
                                                        {collaborationTypeLookUp[venue.collaboration_type as keyof typeof collaborationTypeLookUp]}
                                                    </p>
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
                    </div>
                ) : (
                    <div className={`${(containerHeight > 120 || !isMobile) ? 'block' : 'hidden'} lg:block`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 overflow-y-auto" style={{ maxHeight: containerHeight > 120 ? `${containerHeight - 200}px` : 'none' }}>
                            {events.map((event: Event) => {
                                // Determine the image URL for the event
                                console.log('event', event)
                                let eventImageUrl: string | undefined = undefined;
                                if (event.event_images && event.event_images.length > 0) {
                                    eventImageUrl = getImageUrl(event.event_images[0]);
                                } else if (event.image_url) {
                                    eventImageUrl = event.image_url;
                                }

                                return (
                                    <Link key={event.id} href={`/event/${event.id}`} passHref>
                                        <div
                                            className="bg-[#F6F8FC] rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                                        >
                                            {eventImageUrl && (
                                                <div className="w-full h-32 lg:h-48 relative">
                                                    <Image
                                                        src={eventImageUrl}
                                                        alt={event.title}
                                                        layout="fill"
                                                        objectFit="cover"
                                                        className="transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                </div>
                                            )}
                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h2 className="text-2xl font-semibold">{event.title}</h2>
                                                    <span className="px-3 py-1 bg-[#273287] text-white rounded-full text-sm font-medium whitespace-nowrap">
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
                                                            className="px-3 py-1 bg-[#273287] text-white rounded-full text-sm"
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
                                                        className="px-4 py-2 bg-[#273287] text-white rounded hover:bg-[#273287]/90 transition-colors duration-200"
                                                        onClick={() => {/* TODO: Implement messaging */ }}
                                                    >
                                                        Message
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ExplorePage() {
    const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null);

    return (
        <div className="relative h-screen w-screen">
            {/* Map takes up the entire screen */}
            <div className="absolute inset-0">
                <Suspense fallback={<div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#273287]"></div>
                </div>}>
                    <ExploreMap hoveredVenueId={hoveredVenueId} />
                </Suspense>
            </div>

            {/* Floating navbar with margin on all sides */}
            <div className="absolute top-0 left-0 right-0 m-3 z-[60]">
                <div className="bg-white rounded-lg shadow-lg">
                    <NavBar />
                </div>
            </div>

            {/* Floating content container below navbar - responsive positioning */}
            <div className="absolute bottom-0 left-0 right-0 lg:top-22 lg:left-3 lg:bottom-auto lg:right-auto lg:w-1/2 lg:max-w-[1/2] z-50">
                <Suspense fallback={<div className="flex items-center justify-center h-12 w-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#273287]"></div>
                </div>}>
                    <ExploreContent onVenueHover={setHoveredVenueId} />
                </Suspense>
            </div>
        </div>
    );
}

// Map component that will receive venue data
function ExploreMap({ hoveredVenueId }: { hoveredVenueId: string | null }) {
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
        // If venueId is empty string, it means deselect
        if (venueId === '') {
            setSelectedVenueId(null);
            return;
        }

        // If clicking on the already selected venue, do nothing
        // (we let the popup handle this case now)
        if (venueId === selectedVenueId) {
            return;
        }

        setSelectedVenueId(venueId);
    }, [selectedVenueId]);

    if (venuesLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#273287]"></div>
            </div>
        );
    }

    // Only show the map if we have venues and we're in spaces view
    return (
        <MapboxMapComponent
            venues={selectedView === 'spaces' ? venues : []}
            selectedVenueId={selectedVenueId}
            hoveredVenueId={hoveredVenueId}
            onMarkerClick={handleMarkerClick}
        />
    );
}

// Integrated MapboxMap component
interface MapboxMapProps {
    venues: Venue[];
    selectedVenueId: string | null;
    hoveredVenueId?: string | null;
    onMarkerClick: (venueId: string) => void;
}

function MapboxMapComponent({ venues, selectedVenueId, hoveredVenueId, onMarkerClick }: MapboxMapProps) {
    const [error, setError] = useState<string | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
    const popupRef = useRef<mapboxgl.Popup | null>(null);
    const nodeRef = useRef<HTMLDivElement | null>(null);
    const mapInitializedRef = useRef<boolean>(false);
    const markerClickedRef = useRef<boolean>(false);
    // Add a ref to store the ID of the venue with an open popup to stabilize hover behavior
    const openPopupVenueIdRef = useRef<string | null>(null);
    // Add a ref to track the previous selected venue ID to prevent unnecessary map re-centering
    const previousSelectedVenueIdRef = useRef<string | null>(null);
    // Add a ref to store React roots for popup containers
    const popupRootsRef = useRef<{ [key: string]: import('react-dom/client').Root }>({});

    // Helper function to create a popup for a venue
    const createVenuePopup = useCallback((venue: Venue): mapboxgl.Popup => {
        const venueImages = Array.isArray(venue.venue_images)
            ? venue.venue_images.map(img => getImageUrl(img))
            : undefined;

        // Create a new popup with custom content rendered with React
        const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: false,
            maxWidth: '700px',
            className: 'venue-popup',
            closeOnClick: false,
            focusAfterOpen: false,
            anchor: 'bottom'
        });

        // Create a DOM element for the popup content
        const popupContainer = document.createElement('div');
        popup.setDOMContent(popupContainer);

        // Create a flag to track if this popup has been opened before
        let hasOpened = false;

        // When the popup opens, render the React component into the container
        popup.on('open', () => {
            // Check if we already have a root for this venue
            if (!popupRootsRef.current[venue.id]) {
                // Create a new root if one doesn't exist
                popupRootsRef.current[venue.id] = createRoot(popupContainer);
            }

            // Render using the existing or new root
            popupRootsRef.current[venue.id].render(
                <PopupContent
                    venue={venue}
                    priceDisplay={collaborationTypeLookUp[venue.collaboration_type as keyof typeof collaborationTypeLookUp]}
                    venueImages={venueImages}
                    onClose={() => {
                        // This handler is ONLY for the explicit close button click
                        // Set a flag to indicate this is a manual close action
                        // to distinguish from hover-related actions
                        markerClickedRef.current = true;

                        // Remove the popup
                        popup.remove();

                        // Reset selectedVenueId since user explicitly closed it
                        onMarkerClick('');

                        // Clear the open popup venue ID
                        openPopupVenueIdRef.current = null;
                        // Also clear the previous selected venue ID
                        previousSelectedVenueIdRef.current = null;

                        // Reset flag after a short delay
                        setTimeout(() => {
                            markerClickedRef.current = false;
                        }, 100);
                    }}
                />
            );

            hasOpened = true;
        });

        // Clean up root when popup closes
        popup.on('close', () => {
            // Don't automatically reset selectedVenueId when popup closes
            // We only reset it when the close button is explicitly clicked (handled in onClose)
            // This prevents hover from closing popups

            if (popupRef.current === popup) {
                popupRef.current = null;
            }

            // Clean up React roots only if component is unmounting or popup won't be reused
            if (!mapRef.current || !hasOpened) {
                if (popupRootsRef.current[venue.id]) {
                    delete popupRootsRef.current[venue.id];
                }
            }
        });

        return popup;
    }, [onMarkerClick]);

    // Function to update markers
    const updateMarkers = useCallback((venues: Venue[]): void => {
        if (!mapRef.current) {
            return;
        }

        // Keep track of current popup venue for restoration
        const currentOpenPopupVenueId = openPopupVenueIdRef.current;

        // If we have an open popup and we're going to rebuild markers,
        // capture its state so we can restore it after
        if (currentOpenPopupVenueId && popupRef.current) {
            // No need to store the popup since we're not using it
        }

        // Close existing popup if any
        if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
        }

        // Clear existing markers
        Object.values(markersRef.current).forEach(marker => marker.remove());
        markersRef.current = {};

        // Add markers for each venue
        const markers: { [key: string]: mapboxgl.Marker } = {};

        venues.forEach(venue => {
            // Skip venues with invalid coordinates
            if (typeof venue.latitude !== 'number' || typeof venue.longitude !== 'number') {
                return;
            }

            // Create marker container
            const container = document.createElement('div');
            container.className = 'marker-container';
            container.setAttribute('data-venue-id', venue.id);

            // Create circular image marker
            const imageMarker = document.createElement('div');
            imageMarker.className = 'image-marker';

            // Get the venue image URL
            let imageUrl = '/images/default-venue-image.jpg'; // Default image
            if (venue.venue_images && venue.venue_images.length > 0) {
                // Use the first image from venue_images array
                imageUrl = getImageUrl(venue.venue_images[0]);
            } else if (venue.image_url) {
                // Fallback to the main image_url if venue_images is empty
                imageUrl = venue.image_url;
            }

            // Set the background image
            imageMarker.style.backgroundImage = `url('${imageUrl}')`;

            container.appendChild(imageMarker);

            // Apply initial styling based on selection and open popup state
            if (venue.id === openPopupVenueIdRef.current) {
                imageMarker.classList.add('selected');
            } else if (venue.id === selectedVenueId) {
                imageMarker.classList.add('selected');
            } else if (venue.id === hoveredVenueId) {
                imageMarker.classList.add('hovered');
            }

            // Create the popup for this marker but don't show it yet
            const popup = createVenuePopup(venue);

            // Add the marker to the map
            const marker = new mapboxgl.Marker(container)
                .setLngLat([venue.longitude, venue.latitude])
                .setPopup(popup) // Associate popup with marker
                .addTo(mapRef.current!);

            // Store marker reference
            markers[venue.id] = marker;

            // Add click event to marker
            container.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault(); // Prevent any default behavior

                // Set the flag before calling onMarkerClick to ensure it's set before any effects run
                markerClickedRef.current = true;

                // First update the selected venue ID before showing the popup
                // This ensures the hover effect doesn't interfere with the selected state
                onMarkerClick(venue.id);

                // Store the venue ID with open popup
                openPopupVenueIdRef.current = venue.id;

                // Get the popup and ensure it's positioned correctly
                const popup = marker.getPopup();
                if (popup) {
                    // Close any existing popup before showing this one
                    if (popupRef.current && popupRef.current !== popup) {
                        popupRef.current.remove();
                    }

                    popup.setLngLat([venue.longitude, venue.latitude]);

                    // Always show the popup when marker is clicked
                    popup.addTo(mapRef.current!);
                    popupRef.current = popup;
                }

                // Reset after a short delay to ensure all effects complete
                setTimeout(() => {
                    markerClickedRef.current = false;
                }, 500);
            });
        });

        markersRef.current = markers;

        // Restore popup if needed
        if (currentOpenPopupVenueId && markersRef.current[currentOpenPopupVenueId]) {
            const marker = markersRef.current[currentOpenPopupVenueId];
            const popup = marker.getPopup();

            if (popup) {
                popup.addTo(mapRef.current);
                popupRef.current = popup;
            }
        }
    }, [createVenuePopup, selectedVenueId, hoveredVenueId, onMarkerClick]);

    const mapContainer = useCallback((node: HTMLDivElement | null) => {
        nodeRef.current = node;

        if (node === null || mapInitializedRef.current) return;

        // Set the mapbox token
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

        if (!token) {
            setError('Mapbox token is not configured');
            return;
        }

        try {
            mapboxgl.accessToken = token;

            // Create the map
            const map = new mapboxgl.Map({
                container: node,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [-73.9880154, 40.7209735],
                zoom: 12,
                attributionControl: false,
                preserveDrawingBuffer: true // Helps prevent white flashes
            });

            // Add custom controls
            map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
            map.addControl(new mapboxgl.AttributionControl({
                compact: true
            }), 'bottom-left');

            // Store map reference
            mapRef.current = map;

            map.on('load', () => {
                // Add a warm filter to the map
                map.addLayer({
                    id: 'warm-overlay',
                    type: 'background',
                    paint: {
                        'background-color': '#FBBF24',
                        'background-opacity': 0.1
                    }
                });
                mapInitializedRef.current = true;

                // If venues are already available when map loads, initialize markers
                if (venues && venues.length > 0) {
                    updateMarkers(venues);
                }
            });

            map.on('error', (e) => {
                console.error('Map error:', e);
                setError('Error loading map: ' + e.error.message);
            });

            // Cleanup on unmount
            return () => {
                map.remove();
                mapRef.current = null;
                markersRef.current = {};
                mapInitializedRef.current = false;
                setError(null);
            };
        } catch (err) {
            console.error('Map initialization error:', err);
            setError('Failed to initialize map: ' + (err instanceof Error ? err.message : String(err)));
        }
    }, []);

    // Initialize markers when venues data loads (if map is already initialized)
    useEffect(() => {
        if (!mapRef.current || !venues?.length) return;

        // Update markers when venues data changes
        // Only update markers when venues change, not on hover
        updateMarkers(venues);
    }, [venues, updateMarkers]);

    // Effect to handle selectedVenueId changes
    useEffect(() => {
        if (!mapRef.current) {
            return;
        }

        // If we're deselecting (clearing selection)
        if (!selectedVenueId || selectedVenueId === '') {
            // Clear the open popup venue ID if it was set
            if (openPopupVenueIdRef.current) {
                openPopupVenueIdRef.current = null;
            }

            // Clear the previous selected venue ID
            previousSelectedVenueIdRef.current = null;

            // Close any open popup
            if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
            }

            return;
        }

        // Check if this is the same venue that was previously selected
        // If so, don't re-center the map (prevents re-centering on hover)
        if (previousSelectedVenueIdRef.current === selectedVenueId) {
            return;
        }

        // Find the selected venue
        const selectedVenue = venues.find(venue => venue.id === selectedVenueId);
        if (!selectedVenue) {
            return;
        }

        // Ensure latitude and longitude are defined
        if (typeof selectedVenue.latitude !== 'number' || typeof selectedVenue.longitude !== 'number') {
            console.error('Selected venue has invalid coordinates:', selectedVenue);
            return;
        }

        // Update the previous selected venue ID ref
        previousSelectedVenueIdRef.current = selectedVenueId;

        // Get map container dimensions
        const containerWidth = mapRef.current.getContainer().clientWidth;
        const containerHeight = mapRef.current.getContainer().clientHeight;

        // Calculate the offset to position marker in bottom-right quadrant
        // Project the marker coordinates to pixel space
        const markerCoords: [number, number] = [selectedVenue.longitude, selectedVenue.latitude];
        const point = mapRef.current.project(markerCoords);

        // Apply offset to move marker to bottom-right quadrant
        const offsetX = -containerWidth * 0.25; // Move left by 25% of container width
        const offsetY = -containerHeight * 0.25; // Move up by 25% of container height

        // Unproject back to geographic coordinates
        const offsetPoint = mapRef.current.unproject([point.x + offsetX, point.y + offsetY]);

        // Animate the map to the new center position
        mapRef.current.easeTo({
            center: offsetPoint,
            zoom: 12,
            duration: 1000
        });

        // Find the marker for the selected venue
        const marker = markersRef.current[selectedVenueId];

        if (marker) {
            // Store this venue ID as having an open popup
            openPopupVenueIdRef.current = selectedVenueId;

            const popup = marker.getPopup();

            // Only set up the popup if it's not already open
            if (popup && !popup.isOpen() && popup !== popupRef.current) {
                popup.setLngLat([selectedVenue.longitude, selectedVenue.latitude]);
                popup.addTo(mapRef.current);
                popupRef.current = popup;
            }
        }

        // Update all marker styles
        venues.forEach(venue => {
            const marker = markersRef.current[venue.id];
            if (marker) {
                const element = marker.getElement();
                const imageMarker = element.querySelector('.image-marker');

                if (imageMarker) {
                    if (venue.id === selectedVenueId) {
                        imageMarker.classList.add('selected');
                    } else {
                        imageMarker.classList.remove('selected');
                    }
                }
            }
        });
    }, [selectedVenueId, venues]);

    // Add custom CSS for the popup and markers
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .venue-popup .mapboxgl-popup-content {
                padding: 0;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 20px rgba(0,0,0,0.2);
            }
            
            .venue-popup .mapboxgl-popup-tip {
                display: none;
            }
            
            .marker-container {
                cursor: pointer;
                z-index: 1;
            }
            
            .image-marker {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background-size: cover;
                background-position: center;
                border: 3px solid white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
            }
            
            .image-marker.selected {
                transform: scale(1.1);
                border-color: #273287;
                box-shadow: 0 2px 10px rgba(27, 50, 135, 0.5);
                z-index: 2;
            }
            
            .image-marker.hovered {
                transform: scale(1.1);
                border-color: #273287;
                z-index: 2;
            }
            
            .image-marker:hover {
                transform: scale(1.05);
                border-color: #273287;
            }
            
            .image-marker.selected:hover {
                border-color: #273287;
            }
            
            /* Ensure the popup container is properly positioned */
            .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip {
                border-top-color: white;
            }

            /* Fix z-index stacking for markers and popup */
            .mapboxgl-marker {
                z-index: 1 !important;
            }
            
            .mapboxgl-popup {
                z-index: 20 !important;
            }
            
            /* Style for clickable carousel */
            [id^="carousel-container-"] {
                position: relative;
            }
            
            [id^="carousel-container-"]:hover::after {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(27, 50, 135, 0.2);
                z-index: 2;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Cleanup on unmount - add clearing of React roots
    useEffect(() => {
        return () => {
            if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
            }
            // Clean up all React roots - defer to avoid race condition
            setTimeout(() => {
                Object.values(popupRootsRef.current).forEach(root => {
                    if (root && typeof root.unmount === 'function') {
                        try {
                            root.unmount();
                        } catch (error) {
                            // Silently handle unmount errors that might occur during cleanup
                            console.warn('Error unmounting popup root:', error);
                        }
                    }
                });
                popupRootsRef.current = {};
            }, 0);
        };
    }, []);

    // Add effect to handle hovering on venue cards
    useEffect(() => {
        if (!mapRef.current) return;

        // Only update styles based on hover - don't open or close popups
        venues.forEach(venue => {
            const marker = markersRef.current[venue.id];
            if (marker) {
                const element = marker.getElement();
                const imageMarker = element.querySelector('.image-marker');

                if (imageMarker) {
                    // First check if this venue has an open popup - it overrides all other styles
                    if (venue.id === openPopupVenueIdRef.current) {
                        imageMarker.classList.add('selected');
                        imageMarker.classList.remove('hovered');
                    }
                    // Otherwise, handle selected state (this maintains selection between card hovers)
                    else if (venue.id === selectedVenueId) {
                        imageMarker.classList.add('selected');
                        imageMarker.classList.remove('hovered');
                    } else {
                        imageMarker.classList.remove('selected');

                        // Then handle hover state for non-selected markers
                        if (venue.id === hoveredVenueId) {
                            imageMarker.classList.add('hovered');
                        } else {
                            imageMarker.classList.remove('hovered');
                        }
                    }
                }
            }
        });

        // IMPORTANT: Do not manipulate popups in this effect!
        // This effect is only for styling markers on hover
        // Popup manipulation should only happen when markers are clicked
    }, [hoveredVenueId, selectedVenueId, venues]);

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainer} className="w-full h-full" />
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#273287]/10 bg-opacity-50">
                    <div className="text-[#273287] p-4 bg-white rounded shadow">{error}</div>
                </div>
            )}
        </div>
    );
} 
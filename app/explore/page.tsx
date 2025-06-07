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
import { FaRegHandshake } from "react-icons/fa";
import { LuMapPin } from "react-icons/lu";
import { IoClose } from "react-icons/io5";
import DateTimePicker from '../components/DateTimePicker';
import { collaborationTypeLookUp } from '@/utils/collaborationTypeLookUp';
import Link from 'next/link';
import { CollaborationType } from '../types/collaboration_types';

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
    latitude?: number;
    longitude?: number;
    pricing_type: string;
    price?: number;
    user_id?: string;
    owner_id?: string;
    event_status?: string;
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

// Event PopupContent component for MapboxMap
interface EventPopupContentProps {
    event: Event;
    eventImages?: string[];
    onClose?: () => void;
}

const EventPopupContent = ({ event, eventImages, onClose }: EventPopupContentProps) => {
    // Handle click on the carousel container
    const handleCarouselClick = (e: React.MouseEvent) => {
        // Check if the click event target is a button or button child element
        // This prevents navigation when clicking carousel controls
        const target = e.target as HTMLElement;
        const isButton = target.tagName === 'BUTTON' ||
            target.closest('button') !== null ||
            target.classList.contains('z-5');

        if (!isButton) {
            window.open(`/event/${event.id}`, '_blank');
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
                id={`carousel-container-${event.id}`}
                className="relative w-full h-64 cursor-pointer"
                onClick={handleCarouselClick}
            >
                <Image
                    src={eventImages?.[0] ?? '/images/default-venue-image.jpg'}
                    height={256}
                    width={256}
                    alt={event.title}
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="p-3">
                <h3 className="font-bold text-xl mb-1 font-heading">
                    {event.title}
                </h3>
                <p className="text-sm mb-2 flex items-center">
                    <LuMapPin className="mr-1" /> {event.address}
                </p>
                <p className="text-sm mb-2">
                    {format(new Date(event.selected_date), 'MMM d, yyyy')}
                    {event.selected_time && ` at ${event.selected_time}`}
                </p>
                <a
                    href={`/event/${event.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover underline"
                >
                    View Details
                </a>

                {/* Tags section */}
                <div className="flex flex-wrap gap-2 mt-3">
                    {event.assets_needed && event.assets_needed.map((asset, index) => (
                        <span
                            key={index}
                            className="px-2 py-0.5 bg-transparent border text-black rounded-full text-xs font-medium capitalize"
                        >
                            {asset.replace(/_/g, ' ')}
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
function ExploreContent({ onVenueHover, selectedVenueId, onVenueSelect }: { 
    onVenueHover: (venueId: string | null) => void;
    selectedVenueId: string | null;
    onVenueSelect: (venueId: string | null) => void;
}) {
    const [currentImageIndices, setCurrentImageIndices] = useState<Record<string, number>>({});
    const [capacityFilter, setCapacityFilter] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);
    const [showCapacityMenu, setShowCapacityMenu] = useState(false);
    const [isCapacityAnimating, setIsCapacityAnimating] = useState(false);

    // Mobile swipe states
    const [containerHeight, setContainerHeight] = useState<number>(160); // Increased from 120 to 200 for better initial visibility
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startHeight, setStartHeight] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [dragStartTime, setDragStartTime] = useState(0);
    const [hasMoved, setHasMoved] = useState(false);

    const searchParams = useSearchParams();
    const capacityMenuRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragHandleRef = useRef<HTMLDivElement>(null);

    // Initialize filters from URL search parameters
    useEffect(() => {
        const urlDate = searchParams.get('date');
        const urlTime = searchParams.get('time');
        const urlGuests = searchParams.get('guests');

        // Set initial date if provided in URL
        if (urlDate) {
            setSelectedDate(urlDate);
        }

        // Set initial time if provided in URL (decode URL encoding)
        if (urlTime) {
            const decodedTime = decodeURIComponent(urlTime);
            setSelectedTime(decodedTime);
        }

        // Set initial capacity filter if provided in URL
        if (urlGuests) {
            setCapacityFilter(urlGuests);
        }
    }, [searchParams]);

    // Check if we're on mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Set up native touch event listeners for better iOS Safari compatibility
    useEffect(() => {
        const dragHandle = dragHandleRef.current;
        if (!dragHandle || !isMobile) return;

        const handleNativeTouchStart = (e: TouchEvent) => {
            setDragStartTime(Date.now());
            setStartY(e.touches[0].clientY);
            setStartHeight(containerHeight);
            setHasMoved(false);
            setIsDragging(false);
        };

        const handleNativeTouchMove = (e: TouchEvent) => {
            const currentY = e.touches[0].clientY;
            const deltaY = Math.abs(startY - currentY);
            const timeSinceStart = Date.now() - dragStartTime;
            const actualDeltaY = startY - currentY;

            // Determine if this is a vertical swipe
            const isVerticalSwipe = deltaY > 5;

            // Always prevent default for vertical swipes to stop page scrolling
            if (isVerticalSwipe) {
                e.preventDefault();
            }

            // Only start dragging if user has moved more than 10px vertically or held for more than 150ms
            if (!isDragging && (deltaY > 10 || timeSinceStart > 150)) {
                setIsDragging(true);
                setHasMoved(true);
            }

            // Update height if we're dragging
            if (isDragging) {
                const newHeight = Math.max(200, Math.min(window.innerHeight - 80, startHeight + actualDeltaY));
                setContainerHeight(newHeight);
            }
        };

        const handleNativeTouchEnd = (e: TouchEvent) => {
            if (isDragging && hasMoved) {
                e.preventDefault();
                setIsDragging(false);

                const windowHeight = window.innerHeight;
                const threshold = windowHeight * 0.4;

                if (containerHeight < threshold) {
                    setContainerHeight(200);
                } else {
                    setContainerHeight(windowHeight - 80);
                }
            }

            setIsDragging(false);
            setHasMoved(false);
            setDragStartTime(0);
        };

        // Add event listeners with passive: false to ensure preventDefault works
        dragHandle.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
        dragHandle.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
        dragHandle.addEventListener('touchend', handleNativeTouchEnd, { passive: false });

        return () => {
            dragHandle.removeEventListener('touchstart', handleNativeTouchStart);
            dragHandle.removeEventListener('touchmove', handleNativeTouchMove);
            dragHandle.removeEventListener('touchend', handleNativeTouchEnd);
        };
    }, [isMobile, startY, dragStartTime, containerHeight, isDragging, hasMoved]);

    // Get the view from URL parameters, default to 'spaces'
    const view = searchParams.get('view') || 'spaces';
    const selectedView = view === 'popups' ? 'popups' : 'spaces';

    // Use React Query to fetch venues and events
    const { data: allVenues = [], isLoading: venuesLoading, error: venuesError } = useVenues();
    const { data: allEvents = [], isLoading: eventsLoading, error: eventsError } = useEvents<Event[]>();

    // Filter venues to only show approved ones (removed owner filter)
    const venues = allVenues.filter(venue => venue.status === 'approved');

    // Filter events to only show public_approved ones
    const events = allEvents.filter(event => event.event_status === 'public_approved');

    const isLoading = selectedView === 'spaces' ? venuesLoading : eventsLoading;
    const error = selectedView === 'spaces' ? venuesError : eventsError;

    const handleVenueClick = (venueId: string) => {
        // Call the parent's venue select handler
        onVenueSelect(venueId);
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
                if (showCapacityMenu) {
                    // Start exit animation
                    setIsCapacityAnimating(true);
                    setTimeout(() => {
                        setShowCapacityMenu(false);
                        setIsCapacityAnimating(false);
                    }, 150);
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showCapacityMenu]);

    const handleCapacityMenuToggle = () => {
        if (showCapacityMenu) {
            // Start exit animation
            setIsCapacityAnimating(true);
            setTimeout(() => {
                setShowCapacityMenu(false);
                setIsCapacityAnimating(false);
            }, 150);
        } else {
            // Start enter animation
            setShowCapacityMenu(true);
            setIsCapacityAnimating(true);
            setTimeout(() => {
                setIsCapacityAnimating(false);
            }, 150);
        }
    };

    const handleCapacitySelect = (value: string) => {
        setCapacityFilter(value);
        // Start exit animation
        setIsCapacityAnimating(true);
        setTimeout(() => {
            setShowCapacityMenu(false);
            setIsCapacityAnimating(false);
        }, 150);
    };

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
                className="lg:hidden flex justify-center py-2 cursor-grab active:cursor-grabbing bg-white rounded-t-lg select-none"
                ref={dragHandleRef}
                style={{ touchAction: 'none' }}
            >
                <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* Content container */}
            <div className="w-full p-6 bg-white lg:rounded-lg shadow-lg flex-1 overflow-hidden lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
                {/* Mobile header - only show space count when minimized */}
                <div className="lg:hidden mb-4">
                    <h2 className="text-xl font-semibold">
                        {selectedView === 'spaces' ? `${venues.length} Spaces` : `${events.length} Events`}
                    </h2>
                    {containerHeight > 180 && (
                        <div className="mt-4">
                            <div className="flex h-14 bg-[#F6F6F6] border border-gray-200 rounded-md items-center">
                                {/* Capacity filter */}
                                <div className="w-1/2 h-full relative" ref={capacityMenuRef}>
                                    <button
                                        onClick={handleCapacityMenuToggle}
                                        className="w-full h-full flex items-center justify-between rounded-md px-3 focus:outline-none"
                                    >
                                        <span className="text-gray-800">
                                            {capacityFilter ?
                                                (capacityFilter === '75+' ? '75+ guests' : `${capacityFilter} guests`) :
                                                'Capacity'}
                                        </span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform duration-150 ${showCapacityMenu ? "rotate-180" : ""}`}>
                                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>

                                    {showCapacityMenu && (
                                        <div className={`absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-full overflow-hidden
                                                        transition-all duration-150 ease-out
                                                        ${isCapacityAnimating ? 'opacity-0 scale-95 translate-y-[-10px]' : 'opacity-100 scale-100 translate-y-0'}`}>
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
                                                        onClick={() => handleCapacitySelect(option.value)}
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
                            <h2 className="text-xl font-semibold mb-4">{venues.length} Spaces</h2>

                            <div className="flex h-14 bg-[#F6F6F6] border border-gray-200 rounded-md items-center">
                                {/* Capacity filter */}
                                <div className="w-1/2 h-full relative" ref={capacityMenuRef}>
                                    <button
                                        onClick={handleCapacityMenuToggle}
                                        className="w-full h-full flex items-center justify-between rounded-md px-3 focus:outline-none"
                                    >
                                        <span className="text-gray-800">
                                            {capacityFilter ?
                                                (capacityFilter === '75+' ? '75+ guests' : `${capacityFilter} guests`) :
                                                'Capacity'}
                                        </span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform duration-150 ${showCapacityMenu ? "rotate-180" : ""}`}>
                                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>

                                    {showCapacityMenu && (
                                        <div className={`absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-full overflow-hidden
                                                        transition-all duration-150 ease-out
                                                        ${isCapacityAnimating ? 'opacity-0 scale-95 translate-y-[-10px]' : 'opacity-100 scale-100 translate-y-0'}`}>
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
                                                        onClick={() => handleCapacitySelect(option.value)}
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
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Content that shows when expanded on mobile or always on desktop */}
                        <div className={`${(containerHeight > 180 || !isMobile) ? 'block' : 'hidden'} lg:block`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto" style={{ maxHeight: containerHeight > 180 ? `${containerHeight - 200}px` : 'none' }}>
                                {venues.length > 0 ? (
                                    venues.map((venue) => {
                                        const venueImages = venue.venue_images && venue.venue_images.length > 0
                                            ? venue.venue_images.map((img: VenueImage) => getImageUrl(img))
                                            : [venue.image_url || '/images/default-venue-image.jpg'];

                                        const currentIndex = currentImageIndices[venue.id] || 0;
                                        const isFirstImage = currentIndex === 0;
                                        const isLastImage = currentIndex === venueImages.length - 1;

                                        return (
                                            <div
                                                key={venue.id}
                                                className={`cursor-pointer bg-[#F6F8FC] p-2 rounded-lg transition-all hover:opacity-90 ${selectedVenueId === venue.id ? 'border-2 border-[#273287]' : ''}`}
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
                                                <div className="aspect-[4/3] lg:aspect-square xl:aspect-[3/2] w-full overflow-hidden rounded-xl relative group">
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
                                                        {venue.collaboration_type?.map((type: CollaborationType) => collaborationTypeLookUp[type as keyof typeof collaborationTypeLookUp]).join(', ')}
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
                    <div className={`${(containerHeight > 180 || !isMobile) ? 'block' : 'hidden'} lg:block`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto" style={{ maxHeight: containerHeight > 180 ? `${containerHeight - 200}px` : 'none' }}>
                            {events.length > 0 ? (
                                events.map((event: Event) => {
                                    // Determine the image URL for the event
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
                                                    <div className="w-full h-32 lg:h-48 xl:h-32 relative">
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
                                                    {/* <div className="flex flex-wrap gap-2 mb-4">
                                                        {event.assets_needed?.map((tag: string, index: number) => (
                                                            <span
                                                                key={index}
                                                                className="px-3 py-1 bg-[#273287] text-white rounded-full text-sm"
                                                            >
                                                                {formatText(tag)}
                                                            </span>
                                                        ))}
                                                    </div> */}
                                                    <div className="flex justify-between items-center">
                                                        <div className="text-sm text-gray-600">
                                                            {event.expected_capacity_min && event.expected_capacity_max
                                                                ? `${event.expected_capacity_min}-${event.expected_capacity_max} guests`
                                                                : 'Guest count not specified'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 flex flex-col items-center justify-center py-10 text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">No pop-ups found</h3>
                                    <p className="text-gray-500">Check back later for upcoming events</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ExplorePage() {
    const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null);
    const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

    return (
        <div className="relative h-screen w-screen">
            {/* Map takes up the entire screen */}
            <div className="absolute inset-0">
                <Suspense fallback={<div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#273287]"></div>
                </div>}>
                    <ExploreMap hoveredVenueId={hoveredVenueId} selectedVenueId={selectedVenueId} onVenueSelect={(venueId) => setSelectedVenueId(venueId)} />
                </Suspense>
            </div>

            {/* Floating navbar with margin on all sides */}
            <div className="absolute top-0 left-0 right-0 md:m-3 z-[60]">
                <div className="bg-white md:rounded-lg shadow-lg">
                    <NavBar />
                </div>
            </div>

            {/* Floating content container below navbar - responsive positioning */}
            <div className="absolute bottom-0 left-0 right-0 lg:top-23 lg:left-3 lg:bottom-auto lg:right-auto lg:w-1/2 lg:max-w-[1/2] z-50">
                <Suspense fallback={<div className="flex items-center justify-center h-12 w-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#273287]"></div>
                </div>}>
                    <ExploreContent onVenueHover={setHoveredVenueId} selectedVenueId={selectedVenueId} onVenueSelect={(venueId) => setSelectedVenueId(venueId)} />
                </Suspense>
            </div>
        </div>
    );
}

// Map component that will receive venue data
function ExploreMap({ hoveredVenueId, selectedVenueId, onVenueSelect }: { 
    hoveredVenueId: string | null;
    selectedVenueId: string | null;
    onVenueSelect: (venueId: string | null) => void;
}) {
    const searchParams = useSearchParams();

    // Get the view from URL parameters, default to 'spaces'
    const view = searchParams.get('view') || 'spaces';
    const selectedView = view === 'popups' ? 'popups' : 'spaces';

    // Use React Query to fetch venues and events
    const { data: allVenues = [], isLoading: venuesLoading } = useVenues();
    const { data: allEvents = [], isLoading: eventsLoading } = useEvents<Event[]>();

    // Filter venues to only show approved ones (removed owner filter)
    const venues = allVenues.filter(venue => venue.status === 'approved');
    
    // Filter events to only show public_approved ones
    const events = allEvents.filter(event => event.event_status === 'public_approved');

    const handleMarkerClick = useCallback((venueId: string) => {
        // If venueId is empty string, it means deselect
        if (venueId === '') {
            onVenueSelect(null);
            return;
        }

        // If clicking on the already selected venue, do nothing
        // (we let the popup handle this case now)
        if (venueId === selectedVenueId) {
            return;
        }

        onVenueSelect(venueId);
    }, [selectedVenueId, onVenueSelect]);

    const isLoading = selectedView === 'spaces' ? venuesLoading : eventsLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#273287]"></div>
            </div>
        );
    }

    // Pass venues for spaces view, events for popups view
    return (
        <MapboxMapComponent
            venues={selectedView === 'spaces' ? venues : []}
            events={selectedView === 'popups' ? events : []}
            selectedVenueId={selectedVenueId}
            hoveredVenueId={hoveredVenueId}
            onMarkerClick={handleMarkerClick}
        />
    );
}

// Integrated MapboxMap component
interface MapboxMapProps {
    venues: Venue[];
    events: Event[];
    selectedVenueId: string | null;
    hoveredVenueId?: string | null;
    onMarkerClick: (venueId: string) => void;
}

function MapboxMapComponent({ venues, events, selectedVenueId, hoveredVenueId, onMarkerClick }: MapboxMapProps) {
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

    // Helper function to create a popup for an event
    const createEventPopup = useCallback((event: Event): mapboxgl.Popup => {
        const eventImages = Array.isArray(event.event_images)
            ? event.event_images.map(img => getImageUrl(img))
            : event.image_url ? [event.image_url] : undefined;

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
            // Check if we already have a root for this event
            if (!popupRootsRef.current[event.id]) {
                // Create a new root if one doesn't exist
                popupRootsRef.current[event.id] = createRoot(popupContainer);
            }

            // Render using the existing or new root
            popupRootsRef.current[event.id].render(
                <EventPopupContent
                    event={event}
                    eventImages={eventImages}
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
                if (popupRootsRef.current[event.id]) {
                    delete popupRootsRef.current[event.id];
                }
            }
        });

        return popup;
    }, [onMarkerClick]);

    // Function to update markers
    const updateMarkers = useCallback((venues: Venue[], events: Event[]): void => {
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
                if (popup && typeof venue.longitude === 'number' && typeof venue.latitude === 'number') {
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

        // Add markers for each event
        events.forEach(event => {
            // Skip events with invalid coordinates
            if (typeof event.latitude !== 'number' || typeof event.longitude !== 'number') {
                return;
            }

            // Create marker container
            const container = document.createElement('div');
            container.className = 'marker-container';
            container.setAttribute('data-venue-id', event.id);

            // Create circular image marker
            const imageMarker = document.createElement('div');
            imageMarker.className = 'image-marker';

            // Get the event image URL
            let imageUrl = '/images/default-venue-image.jpg'; // Default image
            if (event.event_images && event.event_images.length > 0) {
                // Use the first image from event_images array
                imageUrl = getImageUrl(event.event_images[0]);
            } else if (event.image_url) {
                // Fallback to the main image_url if event_images is empty
                imageUrl = event.image_url;
            }

            // Set the background image
            imageMarker.style.backgroundImage = `url('${imageUrl}')`;

            container.appendChild(imageMarker);

            // Apply initial styling based on selection and open popup state
            if (event.id === openPopupVenueIdRef.current) {
                imageMarker.classList.add('selected');
            } else if (event.id === selectedVenueId) {
                imageMarker.classList.add('selected');
            } else if (event.id === hoveredVenueId) {
                imageMarker.classList.add('hovered');
            }

            // Create the popup for this marker but don't show it yet
            const popup = createEventPopup(event);

            // Add the marker to the map
            const marker = new mapboxgl.Marker(container)
                .setLngLat([event.longitude, event.latitude])
                .setPopup(popup) // Associate popup with marker
                .addTo(mapRef.current!);

            // Store marker reference
            markers[event.id] = marker;

            // Add click event to marker
            container.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault(); // Prevent any default behavior

                // Set the flag before calling onMarkerClick to ensure it's set before any effects run
                markerClickedRef.current = true;

                // First update the selected venue ID before showing the popup
                // This ensures the hover effect doesn't interfere with the selected state
                onMarkerClick(event.id);

                // Store the venue ID with open popup
                openPopupVenueIdRef.current = event.id;

                // Get the popup and ensure it's positioned correctly
                const popup = marker.getPopup();
                if (popup && typeof event.longitude === 'number' && typeof event.latitude === 'number') {
                    // Close any existing popup before showing this one
                    if (popupRef.current && popupRef.current !== popup) {
                        popupRef.current.remove();
                    }

                    popup.setLngLat([event.longitude, event.latitude]);

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
    }, [createVenuePopup, createEventPopup, selectedVenueId, hoveredVenueId, onMarkerClick]);

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
                center: [-74.05, 40.7],
                zoom: 11,
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
                if ((venues && venues.length > 0) || (events && events.length > 0)) {
                    updateMarkers(venues, events);
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
        if (!mapRef.current || (!venues?.length && !events?.length)) return;

        // Update markers when venues or events data changes
        // Only update markers when data changes, not on hover
        updateMarkers(venues, events);
    }, [venues, events, updateMarkers]);

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

        // Find the selected venue or event
        const selectedVenue = venues.find(venue => venue.id === selectedVenueId);
        const selectedEvent = events.find(event => event.id === selectedVenueId);
        const selectedItem = selectedVenue || selectedEvent;
        
        if (!selectedItem) {
            return;
        }

        // Ensure latitude and longitude are defined
        if (typeof selectedItem.latitude !== 'number' || typeof selectedItem.longitude !== 'number') {
            console.error('Selected item has invalid coordinates:', selectedItem);
            return;
        }

        // Update the previous selected venue ID ref
        previousSelectedVenueIdRef.current = selectedVenueId;

        // Check if we're on mobile
        const isMobile = window.innerWidth < 1024;

        let targetCenter: [number, number];

        if (isMobile) {
            // On mobile, center the marker but lower it by 10% vertically for better popup visibility
            const containerHeight = mapRef.current.getContainer().clientHeight;

            // Project the marker coordinates to pixel space
            const markerCoords: [number, number] = [selectedItem.longitude, selectedItem.latitude];
            const point = mapRef.current.project(markerCoords);

            // Move the marker down by 10% of container height
            const offsetY = containerHeight * -.2;

            // Unproject back to geographic coordinates
            const offsetPoint = mapRef.current.unproject([point.x, point.y + offsetY]);
            targetCenter = [offsetPoint.lng, offsetPoint.lat];
        } else {
            // On desktop, use the existing offset logic
            // Get map container dimensions
            const containerWidth = mapRef.current.getContainer().clientWidth;
            const containerHeight = mapRef.current.getContainer().clientHeight;

            // Calculate the offset to position marker in bottom-right quadrant
            // Project the marker coordinates to pixel space
            const markerCoords: [number, number] = [selectedItem.longitude, selectedItem.latitude];
            const point = mapRef.current.project(markerCoords);

            // Apply offset to move marker to bottom-right quadrant
            const offsetX = -containerWidth * 0.25; // Move left by 25% of container width
            const offsetY = -containerHeight * 0.25; // Move up by 25% of container height

            // Unproject back to geographic coordinates
            const offsetPoint = mapRef.current.unproject([point.x + offsetX, point.y + offsetY]);
            targetCenter = [offsetPoint.lng, offsetPoint.lat];
        }

        // Animate the map to the new center position
        mapRef.current.easeTo({
            center: targetCenter,
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
                popup.setLngLat([selectedItem.longitude, selectedItem.latitude]);
                popup.addTo(mapRef.current);
                popupRef.current = popup;
            }
        }

        // Update all marker styles
        [...venues, ...events].forEach(item => {
            const marker = markersRef.current[item.id];
            if (marker) {
                const element = marker.getElement();
                const imageMarker = element.querySelector('.image-marker');

                if (imageMarker) {
                    if (item.id === selectedVenueId) {
                        imageMarker.classList.add('selected');
                    } else {
                        imageMarker.classList.remove('selected');
                    }
                }
            }
        });
    }, [selectedVenueId, venues, events]);

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
        [...venues, ...events].forEach(item => {
            const marker = markersRef.current[item.id];
            if (marker) {
                const element = marker.getElement();
                const imageMarker = element.querySelector('.image-marker');

                if (imageMarker) {
                    // First check if this venue has an open popup - it overrides all other styles
                    if (item.id === openPopupVenueIdRef.current) {
                        imageMarker.classList.add('selected');
                        imageMarker.classList.remove('hovered');
                    }
                    // Otherwise, handle selected state (this maintains selection between card hovers)
                    else if (item.id === selectedVenueId) {
                        imageMarker.classList.add('selected');
                        imageMarker.classList.remove('hovered');
                    } else {
                        imageMarker.classList.remove('selected');

                        // Then handle hover state for non-selected markers
                        if (item.id === hoveredVenueId) {
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
        // IMPORTANT: Do not manipulate popups in this effect!
        // This effect is only for styling markers on hover
        // Popup manipulation should only happen when markers are clicked
    }, [hoveredVenueId, selectedVenueId, venues, events]);

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
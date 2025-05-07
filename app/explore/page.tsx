'use client';

import { useState, Suspense, useEffect } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import MapboxMap from '../components/MapboxMap';
import { useVenues } from '../lib/queries';
import { useEvents } from '../lib/queries';
import NavBar from '../components/NavBar';
import { useSearchParams } from 'next/navigation';
import { useUser } from '../context/UserContext';

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
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const searchParams = useSearchParams();
    const { user } = useUser();

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

    // Calendar functions
    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    // Generate calendar grid for current month
    const generateCalendarMonth = () => {
        const month = currentMonth.getMonth();
        const year = currentMonth.getFullYear();

        // First day of month
        const firstDay = new Date(year, month, 1);
        // Last day of month
        const lastDay = new Date(year, month + 1, 0);

        // Day of week of first day (0 = Sunday, 6 = Saturday)
        const startDayOfWeek = firstDay.getDay();

        // Total days in month
        const daysInMonth = lastDay.getDate();

        // Create array for calendar grid (max 6 weeks * 7 days = 42 cells)
        const calendarDays = [];

        // Add empty cells for days before first of month
        for (let i = 0; i < startDayOfWeek; i++) {
            calendarDays.push(null);
        }

        // Add days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            calendarDays.push({
                date,
                dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                isToday: date.getTime() === today.getTime(),
                isPast: date < today,
                isAvailable: date >= today
            });
        }

        return calendarDays;
    };

    // Generate time slots from 12PM to 2AM in 30-minute increments
    const generateTimeSlots = () => {
        const slots = [];
        // 12PM to 11:30PM
        for (let hour = 12; hour < 24; hour++) {
            const hour12 = hour > 12 ? hour - 12 : hour;
            const ampm = hour >= 12 ? 'PM' : 'AM';
            slots.push(`${hour12}:00 ${ampm}`);
            slots.push(`${hour12}:30 ${ampm}`);
        }
        // 12AM to 2AM
        slots.push(`12:00 AM`);
        slots.push(`12:30 AM`);
        slots.push(`1:00 AM`);
        slots.push(`1:30 AM`);
        slots.push(`2:00 AM`);

        return slots;
    };

    const handleDateSelect = (date: string) => {
        setSelectedDate(date);
    };

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
    };

    const handleDateTimeClick = () => {
        setShowDateTimePicker(!showDateTimePicker);
    };

    const handleDateTimeConfirm = () => {
        if (selectedDate && selectedTime) {
            setShowDateTimePicker(false);
        }
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
            {/* Main content with two-column layout */}
            <div className="flex flex-row flex-1 overflow-hidden">
                {/* Venues list on the left - 60% width */}
                <div className="w-1/2 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ca0013]"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg m-4">
                            {error instanceof Error ? error.message : 'An error occurred while fetching data'}
                        </div>
                    ) : selectedView === 'spaces' ? (
                        <div>
                            {/* Venue count and filters */}
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold mb-4">{filteredVenues.length} Spaces</h2>

                                <div className="flex flex-wrap gap-4 mb-4">
                                    {/* Capacity filter */}
                                    <div className="w-48">
                                        <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                                            Capacity
                                        </label>
                                        <select
                                            id="capacity"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#ca0013] focus:border-[#ca0013]"
                                            value={capacityFilter}
                                            onChange={(e) => setCapacityFilter(e.target.value)}
                                        >
                                            <option value="">Any capacity</option>
                                            <option value="1-15">1-15 guests</option>
                                            <option value="16-30">16-30 guests</option>
                                            <option value="31-50">31-50 guests</option>
                                            <option value="51-75">51-75 guests</option>
                                            <option value="75+">75+ guests</option>
                                        </select>
                                    </div>

                                    {/* Date/Time Selector */}
                                    <div className="w-48 relative">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date & Time
                                        </label>
                                        <button
                                            onClick={handleDateTimeClick}
                                            className="w-full flex items-center justify-between border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#ca0013] focus:border-[#ca0013]"
                                        >
                                            {selectedDate && selectedTime ?
                                                `${new Date(selectedDate).toLocaleDateString()} at ${selectedTime}` :
                                                "Select date & time"
                                            }
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={showDateTimePicker ? "rotate-180" : ""}>
                                                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>

                                        {showDateTimePicker && (
                                            <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden" style={{ width: '520px', left: '0' }}>
                                                <div className="flex border-b">
                                                    <div className="w-3/5 border-r">
                                                        <div className="flex justify-between items-center p-3 border-b">
                                                            <button onClick={prevMonth} className="p-1">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                            </button>
                                                            <div className="font-medium">
                                                                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                                            </div>
                                                            <button onClick={nextMonth} className="p-1">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-7 mb-1 border-b">
                                                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                                                                <div key={day} className="text-center py-2 text-sm font-medium">
                                                                    {day}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="grid grid-cols-7 p-2">
                                                            {generateCalendarMonth().map((day, index) => (
                                                                <div key={index} className="p-1 text-center">
                                                                    {day ? (
                                                                        <button
                                                                            onClick={() => day.isAvailable && handleDateSelect(day.dateString)}
                                                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                                                                                ${day.isToday ? 'border border-amber-500' : ''}
                                                                                ${day.isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                                                                                ${day.isAvailable && !day.isToday ? 'cursor-pointer' : ''}
                                                                                ${day.dateString === selectedDate ? 'bg-[#ca0013] text-white border-2 border-[#ca0013]' :
                                                                                    (day.isAvailable && !day.isToday ? 'hover:bg-[#f5d6d8]' : '')}
                                                                            `}
                                                                            disabled={!day.isAvailable}
                                                                        >
                                                                            {day.date.getDate()}
                                                                        </button>
                                                                    ) : (
                                                                        <div className="w-8 h-8"></div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="w-2/5 max-h-72 overflow-y-auto">
                                                        <div className="p-3 border-b">
                                                            <h3 className="font-medium text-center">Time</h3>
                                                        </div>
                                                        <div className="p-2">
                                                            {generateTimeSlots().map((time) => (
                                                                <button
                                                                    key={time}
                                                                    onClick={() => handleTimeSelect(time)}
                                                                    className={`w-full text-left px-3 py-2 rounded text-sm 
                                                                        ${selectedTime === time ? 'bg-[#ca0013] text-white' : 'hover:bg-[#f5d6d8]'}`}
                                                                >
                                                                    {time}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-3 flex justify-end border-t">
                                                    <button
                                                        onClick={handleDateTimeConfirm}
                                                        className={`px-4 py-2 rounded font-medium text-sm
                                                            ${selectedDate && selectedTime ? 'bg-[#ca0013] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                                        disabled={!selectedDate || !selectedTime}
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredVenues.map((venue) => {
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
                <div className="w-1/2 relative">
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
                                venues={selectedView === 'spaces' ? filteredVenues : venues}
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
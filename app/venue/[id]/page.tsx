'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import NavBar from '@/app/components/NavBar';
import { Venue } from '@/types/Venue';
import { useUser } from '@/app/context/UserContext';

export default function VenuePage() {
    const params = useParams();
    const router = useRouter();
    const [venue, setVenue] = useState<Venue | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useUser();
    // Form state
    const [popupName, setPopupName] = useState('');
    const [message, setMessage] = useState('');
    const [collaborationTypes, setCollaborationTypes] = useState({
        minimumSpend: false,
        revenueShare: false,
        fixedRental: false,
        freePromotion: false
    });

    const handleCollaborationTypeChange = (type: string) => {
        setCollaborationTypes(prev => ({
            ...prev,
            [type]: !prev[type as keyof typeof prev]
        }));
    };

    const toggleModal = () => {
        setIsModalOpen(!isModalOpen);
    };

    // Date and time picker functions
    const formatSelectedDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString();
    };

    const handleDateTimeClick = () => {
        setShowDateTimePicker(!showDateTimePicker);
    };

    const handleDateSelect = (date: string) => {
        setSelectedDate(date);
    };

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
    };

    const handleDateTimeConfirm = () => {
        if (selectedDate && selectedTime) {
            setShowDateTimePicker(false);
        }
    };

    // Calendar navigation
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

    const convertTimeToHHMM = (timeString: string): string => {
        // Extract hours, minutes, and period
        const [time, period] = timeString.split(' ');
        const timeParts = time.split(':').map(part => parseInt(part, 10));
        let hours = timeParts[0];
        const minutes = timeParts[1];

        // Convert 12-hour to 24-hour format
        if (period === 'PM' && hours < 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }

        // Return formatted time
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    useEffect(() => {
        const fetchVenue = async () => {
            try {
                const response = await fetch(`/api/venues/${params.id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch venue');
                }
                const data = await response.json();
                setVenue(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchVenue();
        }
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FFF9F5]">
                <NavBar />
                <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#FFF9F5]">
                <NavBar />
                <div className="p-4">
                    <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-4">
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    if (!venue) {
        return (
            <div className="min-h-screen bg-[#FFF9F5]">
                <NavBar />
                <div className="p-4">
                    <div className="bg-amber-50 text-amber-600 border border-amber-200 rounded-lg p-4">
                        Venue not found
                    </div>
                </div>
            </div>
        );
    }

    // Format price display
    const formatPrice = () => {
        if (!venue.price) return 'Price upon request';

        if (venue.pricing_type === 'hourly' && venue.min_hours) {
            return `$${venue.price}/hr · ${venue.min_hours} hr min`;
        } else if (venue.pricing_type === 'flat') {
            return `$${venue.price} flat rate`;
        } else if (venue.pricing_type === 'minimum_spend') {
            return `$${venue.price} minimum spend`;
        }

        return `$${venue.price}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (!message.trim()) {
            setError('Please enter a message to send.');
            setIsSubmitting(false);
            return;
        }

        try {

            const eventDate = selectedDate && selectedTime
                ? `${selectedDate}T${convertTimeToHHMM(selectedTime)}:00` // ISO format: YYYY-MM-DDTHH:MM:SS
                : new Date().toISOString().split('.')[0]; // Remove milliseconds

            const response = await fetch('/api/chat/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    venue_name: venue?.name ?? '',
                    event_date: eventDate,
                    venue_id: params.id,
                    sender_id: user?.id ?? '',
                    recipient_id: venue?.owner_id ?? '',
                    message,
                    collaboration_types: Object.keys(collaborationTypes).filter(type => collaborationTypes[type as keyof typeof collaborationTypes]),
                    popup_name: popupName,
                    selected_date: selectedDate,
                    selected_time: selectedTime,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send chat request');
            }

            // On success, redirect to the chat page
            router.push('/chat');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred while sending your request.';
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FFF9F5]">
            <NavBar />

            {/* Image Gallery */}
            <div className="relative w-full h-[40vh] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {venue?.venue_images && Array.isArray(venue.venue_images) && venue.venue_images.length > 0 ? (
                    <div className="relative w-full h-full">
                        <Image
                            src={venue.venue_images[currentImageIndex].image_url}
                            alt={venue.name}
                            fill
                            className="object-cover rounded-lg"
                            priority
                        />
                        {venue.venue_images.length > 1 && (
                            <>
                                <button
                                    onClick={() => {
                                        setCurrentImageIndex((prevIndex) =>
                                            (prevIndex - 1 + venue.venue_images!.length) % venue.venue_images!.length
                                        );
                                    }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white z-10"
                                    aria-label="Previous image"
                                >
                                    &#8592;
                                </button>
                                <button
                                    onClick={() => {
                                        setCurrentImageIndex((prevIndex) =>
                                            (prevIndex + 1) % venue.venue_images!.length
                                        );
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white z-10"
                                    aria-label="Next image"
                                >
                                    &#8594;
                                </button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                    {venue.venue_images.map((_, i) => (
                                        <span
                                            key={i}
                                            className={`inline-block w-2 h-2 rounded-full ${i === currentImageIndex ? 'bg-amber-600' : 'bg-white border border-amber-600'
                                                }`}
                                        ></span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
                        <span className="text-gray-500">No images available</span>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Info */}
                    <div className="lg:col-span-2">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-amber-950 mb-2">{venue.name}</h1>
                                <div className="flex items-center gap-4 text-amber-800">
                                    <span>{venue.address}, {venue.city}, {venue.state}</span>
                                    {venue.avg_rating && (
                                        <span className="flex items-center">
                                            ★ {venue.avg_rating.toFixed(1)}
                                            {venue.review_count && (
                                                <span className="ml-1">({venue.review_count})</span>
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Instagram and Website Links */}
                            <div className="flex items-center gap-4 mt-3 md:mt-0">
                                {venue.instagram_handle && (
                                    <a
                                        href={`https://instagram.com/${venue.instagram_handle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-amber-700 hover:text-amber-800"
                                        title={`@${venue.instagram_handle}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                        </svg>
                                    </a>
                                )}

                                {venue.website && (
                                    <a
                                        href={venue.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-amber-700 hover:text-amber-800"
                                        title="Visit Website"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path d="M21.721 12.752a9.711 9.711 0 00-.945-5.003 12.754 12.754 0 01-4.339 2.708 18.991 18.991 0 01-.214 4.772 17.165 17.165 0 005.498-2.477zM14.634 15.55a17.324 17.324 0 00.332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 00.332 4.647 17.385 17.385 0 005.268 0zM9.772 17.119a18.963 18.963 0 004.456 0A17.182 17.182 0 0112 21.724a17.18 17.18 0 01-2.228-4.605zM7.777 15.23a18.87 18.87 0 01-.214-4.774 12.753 12.753 0 01-4.34-2.708 9.711 9.711 0 00-.944 5.004 17.165 17.165 0 005.498 2.477zM21.356 14.752a9.765 9.765 0 01-7.478 6.817 18.64 18.64 0 001.988-4.718 18.627 18.627 0 005.49-2.098zM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 001.988 4.718 9.765 9.765 0 01-7.478-6.816zM13.878 2.43a9.755 9.755 0 016.116 3.986 11.267 11.267 0 01-3.746 2.504 18.63 18.63 0 00-2.37-6.49zM12 2.276a17.152 17.152 0 012.805 7.121c-.897.23-1.837.353-2.805.353-.968 0-1.908-.122-2.805-.353A17.151 17.151 0 0112 2.276zM10.122 2.43a18.629 18.629 0 00-2.37 6.49 11.266 11.266 0 01-3.746-2.504 9.754 9.754 0 016.116-3.985z" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Amenities */}
                        <div className="border-t border-amber-200 pt-6 mb-6">
                            <h2 className="text-xl font-semibold text-amber-950 mb-4">Amenities</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {venue.alcohol_served && (
                                    <div className="flex items-center gap-2">
                                        <span>🍸</span>
                                        <span>Alcohol Served</span>
                                    </div>
                                )}
                                {venue.outside_cake_allowed && (
                                    <div className="flex items-center gap-2">
                                        <span>🍰</span>
                                        <span>Outside Cake Allowed</span>
                                    </div>
                                )}
                                {venue.max_guests && (
                                    <div className="flex items-center gap-2">
                                        <span>👥</span>
                                        <span>Max {venue.max_guests} guests</span>
                                    </div>
                                )}
                                {venue.rental_type && venue.rental_type.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span>🏠</span>
                                        <span>
                                            {venue.rental_type
                                                .map(type =>
                                                    type.split('_')
                                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                        .join(' ')
                                                )
                                                .join(', ')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="border-t border-amber-200 pt-6 mb-6">
                            <h2 className="text-xl font-semibold text-amber-950 mb-4">About this venue</h2>
                            <p className="text-amber-900 whitespace-pre-line">{venue.description}</p>
                        </div>
                    </div>

                    {/* Right Column - Booking Info */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 border border-amber-200 rounded-lg p-6 bg-white">
                            <div className="text-2xl font-semibold text-amber-950 mb-4">
                                {formatPrice()}
                            </div>
                            <button
                                className="w-full cursor-pointer bg-amber-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-amber-700 transition-colors"
                                onClick={toggleModal}
                            >
                                Contact Venue
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-md relative">
                        <button
                            onClick={toggleModal}
                            className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
                            aria-label="Close modal"
                        >
                            ✕
                        </button>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-amber-950 mb-6">Contact the Space Owner</h2>

                            <div className="mb-4">
                                <label htmlFor="popup-name" className="block text-sm font-medium text-amber-900 mb-1">
                                    Pop-up name
                                </label>
                                <input
                                    id="popup-name"
                                    type="text"
                                    value={popupName}
                                    onChange={(e) => setPopupName(e.target.value)}
                                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    placeholder="Enter your pop-up name"
                                />
                            </div>

                            {/* Date Time Picker */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-amber-900 mb-1">
                                    When is your event?
                                </label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={handleDateTimeClick}
                                        className="w-full px-3 py-2 border border-amber-200 rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    >
                                        {selectedDate && selectedTime ?
                                            `${formatSelectedDate(selectedDate)} at ${selectedTime}` :
                                            "Select date and time"}
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={showDateTimePicker ? "rotate-180" : ""}>
                                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>

                                    {showDateTimePicker && (
                                        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-full max-w-lg">
                                            <div className="flex flex-col sm:flex-row border-b">
                                                <div className="w-full sm:w-3/5 sm:border-r">
                                                    <div className="flex justify-between items-center p-3 border-b">
                                                        <button type="button" onClick={prevMonth} className="p-1">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </button>
                                                        <div className="font-medium">
                                                            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                                        </div>
                                                        <button type="button" onClick={nextMonth} className="p-1">
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
                                                                        type="button"
                                                                        onClick={() => day.isAvailable && handleDateSelect(day.dateString)}
                                                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                                                                            ${day.isToday ? 'border border-amber-500' : ''}
                                                                            ${day.isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                                                                            ${day.isAvailable && !day.isToday ? 'cursor-pointer' : ''}
                                                                            ${day.dateString === selectedDate ? 'bg-amber-600 text-white' :
                                                                                (day.isAvailable && !day.isToday ? 'hover:bg-amber-100' : '')}
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

                                                <div className="w-full sm:w-2/5 border-t sm:border-t-0">
                                                    <div className="p-3 border-b font-medium text-center">
                                                        Select Time
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto max-h-[200px] p-2">
                                                        <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
                                                            {generateTimeSlots().map((time) => (
                                                                <button
                                                                    type="button"
                                                                    key={time}
                                                                    onClick={() => handleTimeSelect(time)}
                                                                    className={`text-sm py-2 px-3 rounded text-left
                                                                        ${selectedTime === time ? 'bg-amber-600 text-white font-medium' : 'hover:bg-amber-100'}
                                                                    `}
                                                                >
                                                                    {time}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t p-3 flex justify-between items-center">
                                                <div className="text-sm">
                                                    {selectedDate ?
                                                        selectedTime ?
                                                            `Selected: ${formatSelectedDate(selectedDate)} at ${selectedTime}` :
                                                            `Selected: ${formatSelectedDate(selectedDate)} - Please select a time`
                                                        : "Please select a date and time"}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleDateTimeConfirm}
                                                    disabled={!selectedDate || !selectedTime}
                                                    className={`px-4 py-1 rounded-full text-sm font-medium ${selectedDate && selectedTime ?
                                                        'bg-amber-600 text-white hover:bg-amber-700' :
                                                        'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                        }`}
                                                >
                                                    Confirm
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mb-4">
                                <label htmlFor="message" className="block text-sm font-medium text-amber-900 mb-1">
                                    Message
                                </label>
                                <textarea
                                    id="message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[120px]"
                                    placeholder="Introduce yourself and explain what type of event you're planning..."
                                />
                            </div>

                            <div className="mb-6">
                                <p className="block text-sm font-medium text-amber-900 mb-2">
                                    Collaboration Type
                                </p>
                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={collaborationTypes.minimumSpend}
                                            onChange={() => handleCollaborationTypeChange('minimumSpend')}
                                            className="mr-2 h-4 w-4 text-amber-600 focus:ring-amber-500 border-amber-300 rounded"
                                        />
                                        <span>Minimum spend</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={collaborationTypes.revenueShare}
                                            onChange={() => handleCollaborationTypeChange('revenueShare')}
                                            className="mr-2 h-4 w-4 text-amber-600 focus:ring-amber-500 border-amber-300 rounded"
                                        />
                                        <span>Revenue share on ticket sales</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={collaborationTypes.fixedRental}
                                            onChange={() => handleCollaborationTypeChange('fixedRental')}
                                            className="mr-2 h-4 w-4 text-amber-600 focus:ring-amber-500 border-amber-300 rounded"
                                        />
                                        <span>Fixed space rental fee</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={collaborationTypes.freePromotion}
                                            onChange={() => handleCollaborationTypeChange('freePromotion')}
                                            className="mr-2 h-4 w-4 text-amber-600 focus:ring-amber-500 border-amber-300 rounded"
                                        />
                                        <span>Free venue space for promotion</span>
                                    </label>
                                </div>
                            </div>

                            <button
                                className="w-full cursor-pointer bg-amber-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-amber-700 transition-colors"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Sending...' : 'Contact Host'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 
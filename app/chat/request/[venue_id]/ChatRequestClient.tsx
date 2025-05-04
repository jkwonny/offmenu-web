"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import React from 'react';

// Define proper types
interface User {
    id: string;
    email?: string;
}

interface Venue {
    id: string;
    name: string;
    owner_id: string;
}

export default function ChatRequestClient({ venue_id }: { venue_id: string }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [venue, setVenue] = useState<Venue | null>(null);

    // Date and time picker states
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Fetch current user and venue details on mount
    useEffect(() => {
        async function fetchUserAndVenue() {
            // Fetch the current authenticated user
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            // Fetch venue name for better UX
            const { data: venueData, error } = await supabase
                .from('venues')
                .select('*')
                .eq('id', venue_id)
                .single();

            if (!error && venueData) {
                setVenue(venueData);
            }
        }

        fetchUserAndVenue();
    }, [venue_id]);

    // Format date without timezone issues
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
                    venue_id,
                    sender_id: user?.id ?? '',
                    recipient_id: venue?.owner_id ?? '',
                    message
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

    // Helper function to convert time like "7:30 PM" to "19:30" format
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

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Contact {venue?.name ?? ''}</h1>

            <div className="bg-white rounded-lg shadow-md p-6">
                <p className="mb-4">
                    Send a message to the venue owner to inquire about availability and details.
                </p>

                <form onSubmit={handleSubmit}>
                    {/* Date Time Picker */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                            When is your event?
                        </label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={handleDateTimeClick}
                                className="w-full p-3 border rounded-md text-left flex items-center justify-between focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                        <label
                            htmlFor="message"
                            className="block text-sm font-medium mb-2"
                        >
                            Your Message
                        </label>
                        <textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="Introduce yourself and explain what type of event you're planning..."
                            disabled={isSubmitting}
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full cursor-pointer py-3 px-4 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Sending...' : 'Send Request'}
                    </button>
                </form>
            </div>
        </div>
    );
} 
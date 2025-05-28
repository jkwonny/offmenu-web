'use client';

import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput, EventClickArg } from '@fullcalendar/core';
import { supabase } from '../lib/supabase';
import { useToast } from '@/app/context/ToastContext';
import Modal from '@/app/components/Modal';
import { FaAngleUp } from 'react-icons/fa';
import { FaAngleDown } from 'react-icons/fa';

interface AvailabilityEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    extendedProps: {
        source: string;
        description?: string;
        venueId: number;
        recurring: boolean;
        all_day: boolean;
    };
}

interface BusinessHour {
    daysOfWeek: number[]; // 0=Sunday, 1=Monday, etc.
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
}

interface AvailabilityCalendarProps {
    venueId: number;
}

// Define a type for the items fetched from the API
interface ApiEventItem {
    id: string;
    title?: string;
    start_time: string;
    end_time: string;
    all_day: boolean;
    source: string;
    description?: string;
    venue_id: number;
    recurring: boolean;
    backgroundColor?: string;
    borderColor?: string;
}

export default function AvailabilityCalendar({ venueId }: AvailabilityCalendarProps) {
    const [rawApiEvents, setRawApiEvents] = useState<AvailabilityEvent[]>([]);
    const [events, setEvents] = useState<EventInput[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBusinessHoursModalOpen, setIsBusinessHoursModalOpen] = useState(false);
    const [startDate, setStartDate] = useState<string>('');
    const [startTime, setStartTime] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [isAllDay, setIsAllDay] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasConnectedGoogle, setHasConnectedGoogle] = useState(false);
    const [businessHours, setBusinessHours] = useState<BusinessHour[]>([
        { daysOfWeek: [1], startTime: '09:00', endTime: '17:00' }, // Monday 9am-5pm
        { daysOfWeek: [2], startTime: '09:00', endTime: '17:00' }, // Tuesday 9am-5pm
        { daysOfWeek: [3], startTime: '09:00', endTime: '17:00' }, // Wednesday 9am-5pm
        { daysOfWeek: [4], startTime: '09:00', endTime: '17:00' }, // Thursday 9am-5pm
        { daysOfWeek: [5], startTime: '09:00', endTime: '17:00' }  // Friday 9am-5pm
    ]);
    const [isAvailabilityInfoOpen, setIsAvailabilityInfoOpen] = useState(false);

    const calendarRef = useRef<FullCalendar>(null);
    const { showToast } = useToast();

    // Fetch availability data
    useEffect(() => {
        if (!venueId) return;

        const fetchAvailability = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/calendar/availability?venueId=${venueId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                });

                if (res.ok) {
                    const { data } = await res.json();

                    // Convert availability to FullCalendar events
                    const calendarEvents = data.map((item: ApiEventItem) => {
                        let backgroundColor = '#64748b'; // Default gray for Google
                        let borderColor = '#475569';
                        const textColor = '#ffffff';
                        if (item.source === 'manual') {
                            backgroundColor = '#ef4444'; // Red for all manual blocks
                            borderColor = '#b91c1c';
                        } else if (item.source === 'google') {
                            // Google events remain gray or their specific color if provided by API
                            backgroundColor = item.backgroundColor || '#64748b';
                            borderColor = item.borderColor || '#475569';
                        }

                        return {
                            id: item.id,
                            title: item.title || (item.source === 'google' ? 'Google Calendar Event' : 'Available'),
                            start: item.start_time,
                            end: item.end_time,
                            backgroundColor,
                            borderColor,
                            textColor,
                            allDay: item.all_day,
                            extendedProps: {
                                source: item.source,
                                description: item.description,
                                venueId: item.venue_id,
                                recurring: item.recurring,
                                all_day: item.all_day
                            }
                        };
                    });

                    // setEvents(calendarEvents); // Changed to setRawApiEvents
                    setRawApiEvents(calendarEvents);
                } else {
                    console.error('Failed to fetch availability');
                    showToast('Failed to load availability data', 'error');
                }
            } catch (error) {
                console.error('Error fetching availability:', error);
                showToast('Error loading calendar data', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        const checkGoogleCalendarConnection = async () => {
            try {
                const res = await fetch('/api/calendar/status', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                });

                if (res.ok) {
                    const { connected } = await res.json();
                    setHasConnectedGoogle(connected);
                }
            } catch (error) {
                console.error('Error checking Google Calendar connection:', error);
            }
        };

        fetchAvailability();
        checkGoogleCalendarConnection();
    }, [venueId, showToast]);

    // New useEffect to combine rawApiEvents and businessHours into displayable events
    useEffect(() => {
        const businessHourEvents: EventInput[] = businessHours.flatMap(bh => {
            return {
                daysOfWeek: bh.daysOfWeek,
                startTime: bh.startTime,
                endTime: bh.endTime,
                display: 'background',
                backgroundColor: '#22c55e', // Green for available (business hours)
                borderColor: '#15803d',
                // Ensure these events don't trigger click handlers meant for actual appointments
                interactive: false,
            };
        });

        // Combine business hour background events with actual API events
        // API events should render on top of background events.
        setEvents([...businessHourEvents, ...rawApiEvents]);
    }, [rawApiEvents, businessHours]);

    // Handle fetching business hours
    useEffect(() => {
        if (!venueId) return;

        const fetchBusinessHours = async () => {
            try {
                const res = await fetch(`/api/calendar/business-hours?venueId=${venueId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                });

                if (res.ok) {
                    const { data } = await res.json();
                    if (data && data.length > 0) {
                        setBusinessHours(data);
                    }
                }
            } catch (error) {
                console.error('Error fetching business hours:', error);
            }
        };

        fetchBusinessHours();
    }, [venueId]);

    // Handle saving business hours
    const handleSaveBusinessHours = async (updatedHours: BusinessHour[]) => {
        try {
            const res = await fetch(`/api/calendar/business-hours`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    venueId,
                    businessHours: updatedHours
                }),
            });

            if (res.ok) {
                setBusinessHours(updatedHours);
                showToast('Business hours saved successfully', 'success');
                setIsBusinessHoursModalOpen(false);

                // Refresh calendar to show the updated business hours
                if (calendarRef.current) {
                    calendarRef.current.getApi().refetchEvents();
                }
            } else {
                showToast('Failed to save business hours', 'error');
            }
        } catch (error) {
            console.error('Error saving business hours:', error);
            showToast('Error saving business hours', 'error');
        }
    };

    // Handle adding a new availability
    const handleAddAvailability = async () => {
        if (!startDate || (!isAllDay && !startTime) || !endDate || (!isAllDay && !endTime)) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        // Create start and end datetime strings
        const start = isAllDay
            ? `${startDate}T00:00:00`
            : `${startDate}T${startTime}:00`;

        const end = isAllDay
            ? `${endDate}T23:59:59`
            : `${endDate}T${endTime}:00`;

        // Check if end time is after start time
        if (new Date(end) <= new Date(start)) {
            showToast('End time must be after start time', 'error');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('venue_availability')
                .insert({
                    venue_id: venueId,
                    title: title || 'Unavailable',  // Always "Unavailable" for specific blocks
                    description,
                    start_time: new Date(start).toISOString(),
                    end_time: new Date(end).toISOString(),
                    all_day: isAllDay,
                    recurring: isRecurring,
                    source: 'manual'
                })
                .select();

            if (error) {
                console.error('Error adding unavailable time:', error);
                showToast('Failed to add unavailable time', 'error');
                return;
            }

            // Add the new event to the calendar
            const newEvent: AvailabilityEvent = {
                id: data[0].id,
                title: data[0].title,
                start: data[0].start_time,
                end: data[0].end_time,
                backgroundColor: '#ef4444', // Red for unavailable
                borderColor: '#b91c1c',
                textColor: '#ffffff',
                extendedProps: {
                    source: 'manual',
                    description: data[0].description,
                    venueId,
                    recurring: isRecurring,
                    all_day: isAllDay
                }
            };

            // setEvents([...events, newEvent]); // Changed to setRawApiEvents
            setRawApiEvents(prevRawEvents => [...prevRawEvents, newEvent]);

            // Reset form
            setTitle('');
            setDescription('');
            setStartDate('');
            setStartTime('');
            setEndDate('');
            setEndTime('');
            setIsAllDay(false);
            setIsRecurring(false);
            setIsAddModalOpen(false);

            showToast('Unavailable time added successfully', 'success');
        } catch (error) {
            console.error('Error adding unavailable time:', error);
            showToast('Error adding unavailable time', 'error');
        }
    };

    // Handle syncing with Google Calendar
    const handleSyncGoogleCalendar = async () => {
        setIsSyncing(true);
        try {
            if (!hasConnectedGoogle) {
                // Redirect to Google OAuth flow
                window.location.href = '/api/calendar/authorize';
                return;
            }

            // Sync calendar
            const res = await fetch('/api/calendar/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ venueId, lookAheadDays: 90 }),
            });

            if (res.ok) {
                const data = await res.json();
                showToast(data.message || 'Calendar synced successfully', 'success');

                // Refresh calendar data
                calendarRef.current?.getApi().refetchEvents();

                // Reload events from the server
                const availabilityRes = await fetch(`/api/calendar/availability?venueId=${venueId}`, {
                    credentials: 'include'
                });
                if (availabilityRes.ok) {
                    const { data: availabilityData } = await availabilityRes.json();

                    // Convert availability to FullCalendar events
                    const calendarEvents = availabilityData.map((item: ApiEventItem) => {
                        let backgroundColor = '#64748b'; // Default gray for Google
                        let borderColor = '#475569';
                        const textColor = '#ffffff';

                        if (item.source === 'manual') {
                            backgroundColor = '#ef4444'; // Red for all manual blocks
                            borderColor = '#b91c1c';
                        } else if (item.source === 'google') {
                            // Google events remain gray or their specific color if provided by API
                            backgroundColor = item.backgroundColor || '#64748b';
                            borderColor = item.borderColor || '#475569';
                        }

                        return {
                            id: item.id,
                            title: item.title || (item.source === 'google' ? 'Google Calendar Event' : 'Available'),
                            start: item.start_time,
                            end: item.end_time,
                            backgroundColor,
                            borderColor,
                            textColor,
                            allDay: item.all_day,
                            extendedProps: {
                                source: item.source,
                                description: item.description,
                                venueId: item.venue_id,
                                recurring: item.recurring,
                                all_day: item.all_day
                            }
                        };
                    });

                    // setEvents(calendarEvents); // Changed to setRawApiEvents
                    setRawApiEvents(calendarEvents);
                }
            } else {
                const error = await res.json();
                showToast(error.error || 'Failed to sync calendar', 'error');
            }
        } catch (error) {
            console.error('Error syncing with Google Calendar:', error);
            showToast('Error syncing calendar', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    // Handle event click (view/edit/delete)
    const handleEventClick = (info: EventClickArg) => {
        const { source } = info.event.extendedProps;

        // For Google Calendar events, show a message that they can't be edited
        if (source === 'google') {
            showToast('Google Calendar events cannot be edited here. Please edit in Google Calendar.', 'info');
            return;
        }

        // For manual events, show details and allow editing/deletion
        const title = info.event.title;
        const startTime = info.event.start;
        const endTime = info.event.end;
        const description = info.event.extendedProps.description;

        // Show modal with event details (in a real app, you'd implement an edit modal)
        alert(`Event: ${title}\nStart: ${startTime}\nEnd: ${endTime}\nDescription: ${description || 'None'}`);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4">
            <div className="mb-4 p-4 bg-gray-50 rounded-md">
                <h3
                    className="text-md font-medium mb-2 cursor-pointer flex justify-between items-center"
                    onClick={() => setIsAvailabilityInfoOpen(!isAvailabilityInfoOpen)}
                >
                    How Availability Works
                    <span>{isAvailabilityInfoOpen ? <FaAngleUp /> : <FaAngleDown />}</span>
                </h3>
                <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${isAvailabilityInfoOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
                        }`}
                >
                    <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                        <li>Set your regular business hours to indicate when your venue is generally available</li>
                        <li>Any time outside your business hours is considered unavailable</li>
                        <li>Within business hours, everything is available by default</li>
                        <li>Add specific unavailable times for meetings, events, or any time your venue can&apos;t be booked</li>
                        <li>Assume all times are in EST (Eastern Standard Time)</li>
                        <li>Optionally connect your Google Calendar to automatically mark those events as unavailable (coming soon)</li>
                    </ul>
                </div>
            </div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Venue Availability</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setIsBusinessHoursModalOpen(true)}
                        className="bg-gray-100 text-gray-800 px-4 py-2 rounded-md text-sm hover:bg-gray-200"
                    >
                        Set Business Hours
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-[#06048D] text-white px-4 py-2 rounded-md text-sm hover:bg-opacity-90"
                    >
                        + Add Unavailable Time
                    </button>
                    <button
                        onClick={handleSyncGoogleCalendar}
                        disabled={isSyncing}
                        className={`px-4 py-2 rounded-md text-sm ${hasConnectedGoogle
                            ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                    >
                        {isSyncing
                            ? 'Syncing...'
                            : hasConnectedGoogle
                                ? 'Sync Google Calendar'
                                : 'Connect Google Calendar (coming soon)'
                        }
                    </button>
                </div>
            </div>

            <div className="mb-4">
                <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-[#22c55e] mr-1"></div>
                        <span>Available</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-[#ef4444] mr-1"></div>
                        <span>Unavailable</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-[#64748b] mr-1"></div>
                        <span>Google Calendar</span>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#06048D]"></div>
                </div>
            ) : (
                <div className="h-[700px]">
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="timeGridWeek"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        events={events}
                        eventClick={handleEventClick}
                        eventTimeFormat={{
                            hour: '2-digit',
                            minute: '2-digit',
                            meridiem: 'short'
                        }}
                        height="100%"
                        businessHours={businessHours}
                        slotMinTime="00:00:00"
                        slotMaxTime="24:00:00"
                        timeZone="America/New_York"
                    />
                </div>
            )}

            {/* Add Availability Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add Unavailable Time"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title (optional)
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Unavailable"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="all-day"
                            checked={isAllDay}
                            onChange={(e) => setIsAllDay(e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="all-day" className="ml-2 text-sm text-gray-700">
                            All day
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {!isAllDay && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Time
                                </label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    required={!isAllDay}
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {!isAllDay && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    End Time
                                </label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    required={!isAllDay}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="recurring"
                            checked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="recurring" className="ml-2 text-sm text-gray-700">
                            Recurring event (coming soon)
                        </label>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleAddAvailability}
                            className="px-4 py-2 text-sm text-white bg-[#06048D] rounded-md hover:bg-opacity-90"
                        >
                            Add Availability
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Business Hours Modal */}
            <Modal
                isOpen={isBusinessHoursModalOpen}
                onClose={() => setIsBusinessHoursModalOpen(false)}
                title="Set Your Space's Business Hours"
            >
                <BusinessHoursEditor
                    initialBusinessHours={businessHours}
                    onSave={handleSaveBusinessHours}
                    onCancel={() => setIsBusinessHoursModalOpen(false)}
                />
            </Modal>
        </div>
    );
}

// Business Hours Editor Component
interface BusinessHoursEditorProps {
    initialBusinessHours: BusinessHour[];
    onSave: (hours: BusinessHour[]) => void;
    onCancel: () => void;
}

type DayHours = {
    enabled: boolean;
    startTime: string;
    endTime: string;
};

function BusinessHoursEditor({ initialBusinessHours, onSave, onCancel }: BusinessHoursEditorProps) {
    // Removed unused state: const [businessHours, setBusinessHours] = useState<BusinessHour[]>(initialBusinessHours);

    // Use an array instead of an object with number keys
    const [editableHours, setEditableHours] = useState<DayHours[]>([
        { enabled: false, startTime: '09:00', endTime: '17:00' }, // Sunday
        { enabled: false, startTime: '09:00', endTime: '17:00' }, // Monday
        { enabled: false, startTime: '09:00', endTime: '17:00' }, // Tuesday
        { enabled: false, startTime: '09:00', endTime: '17:00' }, // Wednesday
        { enabled: false, startTime: '09:00', endTime: '17:00' }, // Thursday
        { enabled: false, startTime: '09:00', endTime: '17:00' }, // Friday
        { enabled: false, startTime: '09:00', endTime: '17:00' }, // Saturday
    ]);

    // Initialize the editable hours from the initial business hours
    useEffect(() => {
        const newEditableHours: DayHours[] = [
            { enabled: false, startTime: '09:00', endTime: '17:00' }, // Sunday
            { enabled: false, startTime: '09:00', endTime: '17:00' }, // Monday
            { enabled: false, startTime: '09:00', endTime: '17:00' }, // Tuesday
            { enabled: false, startTime: '09:00', endTime: '17:00' }, // Wednesday
            { enabled: false, startTime: '09:00', endTime: '17:00' }, // Thursday
            { enabled: false, startTime: '09:00', endTime: '17:00' }, // Friday
            { enabled: false, startTime: '09:00', endTime: '17:00' }, // Saturday
        ];

        initialBusinessHours.forEach(hours => {
            hours.daysOfWeek.forEach(day => {
                newEditableHours[day] = {
                    enabled: true,
                    startTime: hours.startTime,
                    endTime: hours.endTime
                };
            });
        });

        setEditableHours(newEditableHours);
    }, [initialBusinessHours]);

    const handleToggleDay = (day: number) => {
        setEditableHours(prev => {
            const newHours = [...prev];
            newHours[day] = {
                ...newHours[day],
                enabled: !newHours[day].enabled
            };
            return newHours;
        });
    };

    const handleTimeChange = (day: number, field: 'startTime' | 'endTime', value: string) => {
        setEditableHours(prev => {
            const newHours = [...prev];
            newHours[day] = {
                ...newHours[day],
                [field]: value
            };
            return newHours;
        });
    };

    const handleSaveBusinessHours = () => {
        // Convert the editable hours back to the BusinessHour format
        const newBusinessHours: BusinessHour[] = [];

        editableHours.forEach((dayHour, dayIndex) => {
            if (dayHour.enabled) {
                // Basic validation: ensure end time is after start time if on the same day
                if (dayHour.startTime && dayHour.endTime && dayHour.startTime >= dayHour.endTime) {
                    // Potentially show a toast message or handle error
                    console.warn(`Invalid time range for day ${dayIndex}: ${dayHour.startTime} - ${dayHour.endTime}. Skipping.`);
                    // Or, allow it and let backend/FullCalendar handle it if that's preferred.
                    // For now, let's create the entry. User can fix if FullCalendar shows it weirdly.
                }
                newBusinessHours.push({
                    daysOfWeek: [dayIndex], // Each enabled day is its own entry
                    startTime: dayHour.startTime,
                    endTime: dayHour.endTime
                });
            }
        });

        onSave(newBusinessHours);
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <div className="space-y-6">
            <p className="text-sm text-gray-600">
                Tell us when your space is available for pop-ups. This will help creators choose suitable dates for their events.
            </p>

            {/* Header Row */}
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-700 pb-2 border-b border-gray-200">
                <div>DAY</div>
                <div className="text-center">OPEN</div>
                <div className="text-center">OPENING TIME</div>
                <div className="text-center">CLOSING TIME</div>
            </div>

            {/* Days Grid */}
            <div className="space-y-4">
                {dayNames.map((dayName, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 items-center">
                        <div className="text-sm font-medium text-gray-700">
                            {dayName}
                        </div>

                        <div className="flex justify-center">
                            <input
                                type="checkbox"
                                checked={editableHours[index].enabled}
                                onChange={() => handleToggleDay(index)}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex justify-center">
                            <input
                                type="time"
                                value={editableHours[index].startTime}
                                onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)}
                                disabled={!editableHours[index].enabled}
                                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 w-full max-w-[120px]"
                            />
                        </div>

                        <div className="flex justify-center">
                            <input
                                type="time"
                                value={editableHours[index].endTime}
                                onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)}
                                disabled={!editableHours[index].enabled}
                                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 w-full max-w-[120px]"
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end space-x-3 pt-6">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSaveBusinessHours}
                    className="px-6 py-2 text-sm text-white bg-[#06048D] rounded-md hover:bg-opacity-90 font-medium"
                >
                    Save
                </button>
            </div>
        </div>
    );
} 
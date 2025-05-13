import { Venue } from "@/types/Venue";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/app/context/UserContext";
import { useRouter } from "next/navigation";

export default function RequestSpaceModal({ toggleModal, venue }: { toggleModal: () => void, venue: Venue }) {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const [popupName, setPopupName] = useState('');
    const [message, setMessage] = useState('');
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [collaborationTypes, setCollaborationTypes] = useState({
        minimumSpend: false,
        revenueShare: false,
        fixedRental: false,
        freePromotion: false
    });
    const [requirements, setRequirements] = useState('');
    const [specialRequests, setSpecialRequests] = useState('');
    const [instagramHandle, setInstagramHandle] = useState('');
    const [website, setWebsite] = useState('');
    const [guestCount, setGuestCount] = useState<string | null>(null);

    const handleCollaborationTypeChange = (type: string) => {
        setCollaborationTypes(prev => ({
            ...prev,
            [type]: !prev[type as keyof typeof prev]
        }));
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


    // Date and time picker functions
    const formatSelectedDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString();
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
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
                    requirements,
                    special_requests: specialRequests,
                    instagram_handle: instagramHandle,
                    website,
                    guest_count: guestCount,
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
        <div
            className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={toggleModal}
        >
            <div
                className="bg-white rounded-xl w-full max-w-lg relative p-2 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={toggleModal}
                    className="absolute right-6 top-6 text-gray-500 hover:text-gray-700"
                    aria-label="Close modal"
                >
                    ✕
                </button>
                <div className="p-6">
                    <h2 className="text-2xl font-semibold mb-2">Contact the Space Owner</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Pitch your event to the owner! They will get back to you shortly.
                    </p>

                    <div className="mb-4">
                        <label htmlFor="popup-name" className="block text-sm font-medium text-black mb-1">
                            Pop-up name
                        </label>
                        <input
                            id="popup-name"
                            type="text"
                            value={popupName}
                            onChange={(e) => setPopupName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                            placeholder="Enter your pop-up name"
                        />
                    </div>

                    {/* Date Time Picker */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-black mb-1">
                            When is your event?
                        </label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={handleDateTimeClick}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-gray-300"
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
                                                                ${day.isToday ? 'border border-gray-300' : ''}
                                                                ${day.isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                                                                ${day.isAvailable && !day.isToday ? 'cursor-pointer' : ''}
                                                                ${day.dateString === selectedDate ? 'bg-gray-300 text-white' :
                                                                        (day.isAvailable && !day.isToday ? 'hover:bg-gray-100' : '')}
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
                        <label className="block text-sm font-medium text-black mb-1">
                            Guest Count
                        </label>
                        <select
                            value={guestCount || ""}
                            onChange={(e) => setGuestCount(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                        >
                            <option value="">Select</option>
                            <option value="1-10">1-10</option>
                            <option value="11-25">11-25</option>
                            <option value="26-50">26-50</option>
                            <option value="51-100">51-100</option>
                            <option value="100+">100+</option>
                        </select>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-black mb-1">
                                Instagram Handle
                            </label>
                            <input
                                type="text"
                                value={instagramHandle}
                                onChange={(e) => setInstagramHandle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                                placeholder="Place link here"
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-black mb-1">
                                Website
                            </label>
                            <input
                                type="text"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                                placeholder="Place link here"
                            />
                        </div>
                    </div>
                    <div className='mb-4 w-full flex'>
                        <div className="w-full">
                            <label className="block text-sm font-medium text-black mb-1">
                                Requirements
                            </label>
                            <textarea
                                value={requirements}
                                onChange={(e) => setRequirements(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 min-h-[100px]"
                                placeholder="Enter requirements"
                            />
                        </div>
                    </div>

                    <div className="mb-4 w-full">
                        <label className="block text-sm font-medium text-black mb-1">
                            Special Requests
                        </label>
                        <textarea
                            value={specialRequests}
                            onChange={(e) => setSpecialRequests(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 min-h-[100px]"
                            placeholder="Enter your message"
                        />
                    </div>

                    <div className="mb-4">
                        <label htmlFor="message" className="block text-sm font-medium text-black mb-1">
                            Tell us more about your pop-up
                        </label>
                        <textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 min-h-[120px]"
                            placeholder="More information about the Pop-up format, brand, or purpose."
                        />
                    </div>

                    <div className="mb-6">
                        <p className="block text-sm font-medium text-black mb-2">
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

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        className="w-full cursor-pointer bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Sending...' : 'Contact'}
                    </button>
                </div>
            </div>
        </div>
    );
}
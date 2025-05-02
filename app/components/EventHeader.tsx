'use client';

import { useEventDetails } from '../context/EventContext';

// Format date string from "YYYY-MM-DD at h:mm AM/PM" to "April 26th, 2025 at 1:00PM"
function formatDate(dateString: string): string {
    if (!dateString) return 'Date to be determined';

    try {
        // Check if the string matches expected format "YYYY-MM-DD at h:mm AM/PM"
        const parts = dateString.split(' at ');
        if (parts.length !== 2) {
            return 'Date to be determined';
        }

        const [datePart, timePart] = parts;

        // Parse date part (YYYY-MM-DD)
        const [year, month, day] = datePart.split('-').map(num => parseInt(num, 10));

        // Create a valid date object
        const date = new Date(year, month - 1, day);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Date to be determined';
        }

        // Format month name
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthName = monthNames[date.getMonth()];

        // Add ordinal suffix to day
        const dayNum = date.getDate();
        const suffix = getOrdinalSuffix(dayNum);

        // Format as "April 26th, 2025 at 1:00PM"
        return `${monthName} ${dayNum}${suffix}, ${year} at ${timePart}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Date to be determined';
    }
}

// Helper function to get ordinal suffix for a number
function getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

export default function EventHeader() {
    const { eventDetails } = useEventDetails();
    const formattedDate = formatDate(eventDetails.date);

    return (
        <div className="sticky top-0 w-full bg-white shadow-md z-20">
            <div className="w-full mx-2 px-4 py-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-medium text-amber-900">
                            Planning a <span className="font-semibold">{eventDetails.type}</span> for <span className="font-semibold">{eventDetails.guestCount} guests</span> on <span className="font-semibold">{formattedDate}</span>
                        </h1>
                    </div>

                    <div className="flex gap-3">
                        <button
                            className="px-4 py-2 rounded-full border border-amber-600 text-amber-700 hover:bg-amber-50 transition-colors text-sm font-medium"
                        >
                            Change Event Type
                        </button>

                        <button
                            className="px-4 py-2 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors text-sm font-medium"
                        >
                            Refine Filters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 
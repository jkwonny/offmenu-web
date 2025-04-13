'use client';

import { useEventDetails } from '../context/EventContext';

export default function EventHeader() {
    const { eventDetails } = useEventDetails();

    return (
        <div className="sticky top-0 w-full bg-white shadow-md z-20">
            <div className="container mx-auto px-4 py-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-medium text-amber-900">
                            Planning a <span className="font-semibold">{eventDetails.type}</span> for <span className="font-semibold">{eventDetails.guestCount} People</span> on <span className="font-semibold">{eventDetails.date}</span>
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
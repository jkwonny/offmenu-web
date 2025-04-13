"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useEventDetails } from "../../context/EventContext";

export default function BookingStep1() {
    const router = useRouter();
    const { eventDetails, setEventDetails } = useEventDetails();
    const [eventType, setEventType] = useState<string>(eventDetails.type);
    const [guestCount, setGuestCount] = useState<string>(eventDetails.guestCount.toString());
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [pitch, setPitch] = useState<string>("");
    const [budget, setBudget] = useState<string>("");
    const [isPopUpOrEvent, setIsPopUpOrEvent] = useState(false);

    useEffect(() => {
        // Set form type based on event type
        setIsPopUpOrEvent(eventType === "Pop Up" || eventType === "Other");
    }, [eventType]);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Format date for display
        const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric'
        });

        // Update the event details in context
        setEventDetails({
            type: eventType as any,
            guestCount: parseInt(guestCount, 10),
            date: formattedDate
        });

        // Navigate to explore page
        router.push("/explore");
    };

    return (
        <main className="min-h-screen bg-[#FFF9F5] py-12">
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-amber-100">
                <h1 className="text-3xl font-bold text-amber-950 mb-6 text-center">
                    {eventType} Booking
                </h1>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label htmlFor="eventType" className="block text-amber-900 mb-2 font-medium">
                            Event Type
                        </label>
                        <select
                            id="eventType"
                            value={eventType}
                            onChange={(e) => setEventType(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-black"
                            required
                        >
                            <option value="Pop Up">Pop Up</option>
                            <option value="Birthday">Birthday</option>
                            <option value="Corporate">Corporate</option>
                            <option value="Wedding">Wedding</option>
                            <option value="Other">Other Event</option>
                        </select>
                    </div>

                    <div className="mb-6">
                        <label htmlFor="guestCount" className="block text-amber-900 mb-2 font-medium">
                            How many people are you expecting?
                        </label>
                        <input
                            type="number"
                            id="guestCount"
                            value={guestCount}
                            onChange={(e) => setGuestCount(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-black"
                            placeholder="Number of guests"
                            min="1"
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label htmlFor="eventDate" className="block text-amber-900 mb-2 font-medium">
                            When is your event?
                        </label>
                        <input
                            type="date"
                            id="eventDate"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-black"
                            required
                        />
                    </div>

                    {isPopUpOrEvent && (
                        <div className="mb-6">
                            <label htmlFor="pitch" className="block text-amber-900 mb-2 font-medium">
                                Tell us more about your event concept and requirements
                            </label>
                            <textarea
                                id="pitch"
                                value={pitch}
                                onChange={(e) => setPitch(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-black min-h-[120px] resize-y"
                                placeholder="Describe your event concept in detail..."
                                rows={4}
                            />
                        </div>
                    )}

                    <div className="mb-6">
                        <label htmlFor="budget" className="block text-amber-900 mb-2 font-medium">
                            What's your budget?
                        </label>
                        <select
                            id="budget"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-black"
                            required
                        >
                            <option value="">Select budget range</option>
                            <option value="500">Less than $500</option>
                            <option value="1000">$500 - $1,000</option>
                            <option value="2000">$1,000 - $2,000</option>
                            <option value="5000">$2,000 - $5,000</option>
                            <option value="10000">$5,000 - $10,000</option>
                            <option value="20000">More than $10,000</option>
                        </select>
                    </div>

                    <div className="flex justify-between mt-8">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                            Back
                        </button>

                        <button
                            type="submit"
                            className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                        >
                            Find Venues
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
} 
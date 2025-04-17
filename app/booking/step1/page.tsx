"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "../../lib/react-query/mutations/events";
import NavBar from "../../components/NavBar";
import { useUser } from "../../context/UserContext";

type EventType = 'Pop Up' | 'Birthday' | 'Corporate' | 'Wedding' | 'Other';

export default function BookingStep1() {
    const router = useRouter();
    const { user, isLoading } = useUser();
    const [eventType, setEventType] = useState<EventType>('Pop Up');
    const [guestCountMin, setGuestCountMin] = useState<string>("");
    const [guestCountMax, setGuestCountMax] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>("");
    const [title, setTitle] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [assetsNeeded, setAssetsNeeded] = useState<string[]>([]);
    const [assetInput, setAssetInput] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/auth/sign-in");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FFF9F5]">
                <NavBar />
                <div className="max-w-4xl mx-auto p-8 mt-8 flex justify-center">
                    <div className="animate-pulse h-6 w-24 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect in the useEffect
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formData = {
                title: title,
                event_type: eventType,
                description,
                start_date: selectedDate,
                end_date: endDate || undefined,
                expected_capacity_min: parseInt(guestCountMin, 10),
                expected_capacity_max: parseInt(guestCountMax, 10),
                assets_needed: assetsNeeded
            };

            await createEvent(formData);
            router.push("/explore");
        } catch (error) {
            console.error('Failed to create event:', error);
            // You might want to show an error message to the user here
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === ' ' && assetInput.trim()) {
            e.preventDefault();
            setAssetsNeeded([...assetsNeeded, assetInput.trim()]);
            setAssetInput("");
        }
    };

    const removeAsset = (index: number) => {
        setAssetsNeeded(assetsNeeded.filter((_, i) => i !== index));
    };

    return (
        <>
            <NavBar />
            <main className="min-h-screen bg-gradient-to-br from-[#FFF9F5] py-12">
                <div className="max-w-2xl mx-auto px-4 md:px-6">
                    <div className="bg-white p-8 rounded-xl shadow-sm border">
                        <h1 className="text-3xl font-bold mb-6 text-center">
                            Create Your Event
                        </h1>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-6">
                                <label htmlFor="eventType" className="block mb-2 font-semibold">
                                    Event Type
                                </label>
                                <select
                                    id="eventType"
                                    value={eventType}
                                    onChange={(e) => setEventType(e.target.value as EventType)}
                                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 placeholder-[#ca0013]"
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
                                <label htmlFor="title" className="block mb-2 font-semibold">
                                    Event Title
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 placeholder-[#ca0013]"
                                    placeholder="Give your event a name"
                                    required
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block mb-2 font-semibold">
                                    Expected Guests
                                </label>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            id="guestCountMin"
                                            value={guestCountMin}
                                            onChange={(e) => setGuestCountMin(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 placeholder-[#ca0013]"
                                            placeholder="Minimum guests"
                                            min="1"
                                            required
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            id="guestCountMax"
                                            value={guestCountMax}
                                            onChange={(e) => setGuestCountMax(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 placeholder-[#ca0013]"
                                            placeholder="Maximum guests"
                                            min="1"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label htmlFor="startDate" className="block mb-2 font-semibold">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    id="startDate"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 placeholder-[#ca0013]"
                                    required
                                />
                            </div>

                            <div className="mb-6">
                                <label htmlFor="endDate" className="block mb-2 font-semibold">
                                    End Date (Optional)
                                </label>
                                <input
                                    type="date"
                                    id="endDate"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 placeholder-[#ca0013]"
                                />
                            </div>

                            <div className="mb-6">
                                <label htmlFor="description" className="block mb-2 font-semibold">
                                    Event Description
                                </label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 placeholder-[#ca0013] min-h-[120px] resize-y"
                                    placeholder="Describe your event in detail..."
                                    rows={4}
                                />
                            </div>

                            <div className="mb-6">
                                <label htmlFor="assetsNeeded" className="block mb-2 font-semibold">
                                    Required Assets
                                </label>
                                <input
                                    type="text"
                                    id="assetsNeeded"
                                    value={assetInput}
                                    onChange={(e) => setAssetInput(e.target.value)}
                                    onKeyDown={handleAssetKeyDown}
                                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 placeholder-[#ca0013]"
                                    placeholder="Type an asset and press space to add"
                                />
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {assetsNeeded.map((asset, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-sm"
                                        >
                                            <span>{asset}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeAsset(index)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between mt-8">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="px-6 py-3 border rounded-lg transition-colors bg-white"
                                >
                                    Back
                                </button>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-3 text-white rounded-lg transition-colors shadow-md font-semibold"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </>
    );
} 
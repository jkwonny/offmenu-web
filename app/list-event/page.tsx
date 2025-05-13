"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "../lib/react-query/mutations/events";
import NavBar from "../components/NavBar";
import { useUser } from "../context/UserContext";
import Image from "next/image";
import DateTimePicker from "../components/DateTimePicker";

type EventType = 'Pop Up' | 'Birthday' | 'Corporate' | 'Wedding' | 'Other';
type GuestRange = '1-15' | '16-30' | '31-50' | '51-75' | '75+';

export default function ListEvent() {
    const router = useRouter();
    const { user, isLoading } = useUser();
    const [eventType, setEventType] = useState<EventType>('Pop Up');
    const [guestRange, setGuestRange] = useState<GuestRange>('1-15');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState<string>("");
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);
    const [title, setTitle] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [assetsNeeded, setAssetsNeeded] = useState<string[]>([]);
    const [assetInput, setAssetInput] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [eventStatus, setEventStatus] = useState<"private_pending" | "public_pending" | "public_approved" | "private_approved">('private_pending');

    // Image upload state
    const [eventImage, setEventImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                // Could add error state here
                return;
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                // Could add error state here
                return;
            }

            setEventImage(file);
            // Create a preview URL
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        setImagePreview(null);
        setEventImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Parse guest range to get min and max values
            let expectedCapacityMin = 0;
            let expectedCapacityMax = 0;

            if (guestRange === '1-15') {
                expectedCapacityMin = 1;
                expectedCapacityMax = 15;
            } else if (guestRange === '16-30') {
                expectedCapacityMin = 16;
                expectedCapacityMax = 30;
            } else if (guestRange === '31-50') {
                expectedCapacityMin = 31;
                expectedCapacityMax = 50;
            } else if (guestRange === '51-75') {
                expectedCapacityMin = 51;
                expectedCapacityMax = 75;
            } else if (guestRange === '75+') {
                expectedCapacityMin = 75;
                expectedCapacityMax = 500; // Setting a reasonable max for 75+
            }

            const formData = {
                title: title,
                event_type: eventType,
                description,
                selected_date: selectedDate,
                selected_time: selectedTime,
                expected_capacity_min: expectedCapacityMin,
                expected_capacity_max: expectedCapacityMax,
                assets_needed: assetsNeeded,
                image_file: eventImage || undefined,
                status: eventStatus
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
            <main className="min-h-screen w-full py-12">
                <div className="max-w-2xl mx-auto">
                    <div>
                        <h1 className="text-3xl font-bold font-heading mb-6 text-center">
                            Create Your Event
                        </h1>

                        <form onSubmit={handleSubmit}>
                            {/* Image Upload Section */}
                            <div className="mb-6">
                                <label className="block mb-2 font-semibold">
                                    Event Image
                                </label>
                                <div className="rounded-lg">
                                    {imagePreview ? (
                                        <div className="relative h-60 w-full mb-4">
                                            <Image
                                                src={imagePreview}
                                                alt="Event preview"
                                                className="rounded-md object-cover"
                                                fill
                                            />
                                            <button
                                                className="absolute top-2 right-2 bg-red-500 rounded-full p-1 text-white"
                                                onClick={handleRemoveImage}
                                                type="button"
                                                aria-label="Remove image"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-4 w-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            className="h-60 w-full border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer mb-4"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <div className="text-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <p className="mt-1 text-sm text-gray-600">Drag an image here or select one</p>
                                                <p className="mt-1 text-xs text-gray-500">File format: PNG, JPEG. Max size 10 mb.</p>
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg, image/png, image/webp"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label htmlFor="title" className="block mb-2 font-semibold">
                                    Event Name
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                                    placeholder="Give your event a name"
                                    required
                                />
                            </div>
                            <div className="mb-6">
                                <label htmlFor="eventType" className="block mb-2 font-semibold">
                                    Event Type
                                </label>
                                <select
                                    id="eventType"
                                    value={eventType}
                                    onChange={(e) => setEventType(e.target.value as EventType)}
                                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
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
                                <label htmlFor="guestRange" className="block mb-2 font-semibold">
                                    Expected Guests
                                </label>
                                <select
                                    id="guestRange"
                                    value={guestRange}
                                    onChange={(e) => setGuestRange(e.target.value as GuestRange)}
                                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 placeholder-[#ca0013]"
                                    required
                                >
                                    <option value="1-15">1-15 guests</option>
                                    <option value="16-30">16-30 guests</option>
                                    <option value="31-50">31-50 guests</option>
                                    <option value="51-75">51-75 guests</option>
                                    <option value="75+">75+ guests</option>
                                </select>
                            </div>

                            <div className="mb-6">
                                <label htmlFor="startDate" className="block mb-2 font-semibold">
                                    Start Date & Time
                                </label>
                                <div className="relative h-12">
                                    <DateTimePicker
                                        selectedDate={selectedDate}
                                        selectedTime={selectedTime}
                                        onDateSelect={setSelectedDate}
                                        onTimeSelect={setSelectedTime}
                                        onConfirm={() => setShowDateTimePicker(false)}
                                        showPicker={showDateTimePicker}
                                        togglePicker={() => setShowDateTimePicker(!showDateTimePicker)}
                                        buttonClassName="w-full h-full flex items-center px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label htmlFor="description" className="block mb-2 font-semibold">
                                    Event Description
                                </label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 min-h-[120px] resize-y"
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
                                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
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

                            <div className="mb-6">
                                <div className="flex items-center">
                                    <input
                                        id="isPublic"
                                        type="checkbox"
                                        checked={eventStatus === 'public_pending'}
                                        onChange={(e) => setEventStatus(e.target.checked ? 'public_pending' : 'private_pending')}
                                        className="h-4 w-4 text-[#ca0013] focus:ring-[#ca0013] border-gray-300 rounded"
                                    />
                                    <label htmlFor="isPublic" className="ml-2 block text-sm font-medium text-gray-700">
                                        Public Event
                                    </label>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    Public events are visible to everyone and require moderator approval. Your event won’t be published right away.                                </p>
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
                                    className="px-6 py-3 text-white rounded-lg transition-colors shadow-md font-semibold bg-[#ca0013] hover:bg-[#a80010]"
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
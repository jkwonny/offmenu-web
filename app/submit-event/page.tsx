"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCreateEvent } from "../lib/react-query/mutations/events";
import NavBar from "../components/NavBar";
import { useUser } from "../context/UserContext";
import Image from "next/image";
import DateTimePicker from "../components/DateTimePicker";
import RangeSlider from "../components/RangeSlider";

type EventType = 'Pop Up' | 'Birthday' | 'Corporate' | 'Wedding' | 'Other';
type GuestRange = '1-15' | '16-30' | '31-50' | '51-75' | '75-100' | '100+';
type DurationType = '1' | '2' | '3' | '4' | '5' | '6+';

export default function ListEvent() {
    const router = useRouter();
    const { user, isLoading: isUserLoading } = useUser();
    const { mutateAsync: createEventMutation, isPending: isCreatingEvent } = useCreateEvent();

    const [eventType, setEventType] = useState<EventType>('Pop Up');
    const [guestRange, setGuestRange] = useState<GuestRange>('1-15');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState<string>("");
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);
    const [title, setTitle] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [assetsNeeded, setAssetsNeeded] = useState<string[]>([]);
    const [assetInput, setAssetInput] = useState<string>("");
    const [eventStatus, setEventStatus] = useState<"private_pending" | "public_pending" | "public_approved" | "private_approved">('private_pending');
    const [duration, setDuration] = useState<DurationType>('1');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Image upload state - modified for multiple images
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
    const [isUploadingImages, setIsUploadingImages] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push("/auth/sign-in?redirect=/submit-event");
        }
    }, [user, isUserLoading, router]);

    // Image handling functions (adapted from submit-space/page.tsx)
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null); // Clear previous errors
        if (e.target.files && e.target.files.length > 0) {
            const newImagesArray = Array.from(e.target.files);
            const validImages = newImagesArray.filter(file => {
                const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
                const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB max (same as submit-space)

                if (!isValidType) {
                    setError('Only JPG, PNG, and WebP images are allowed.');
                }
                if (!isValidSize) {
                    setError('Images must be smaller than 5MB.');
                }
                return isValidType && isValidSize;
            });

            setUploadedImages(prev => [...prev, ...validImages]);
            const newPreviewUrls = validImages.map(file => URL.createObjectURL(file));
            setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
        }
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => {
            const newImages = [...prev];
            newImages.splice(index, 1);
            return newImages;
        });
        setImagePreviewUrls(prev => {
            URL.revokeObjectURL(prev[index]);
            const newUrls = [...prev];
            newUrls.splice(index, 1);
            return newUrls;
        });
    };

    // Function to upload images to the new API endpoint
    const uploadEventImages = async (eventId: string): Promise<string[]> => {
        if (uploadedImages.length === 0) return [];
        setIsUploadingImages(true);
        const imageUrls: string[] = [];
        const failedUploads: string[] = [];

        for (let i = 0; i < uploadedImages.length; i++) {
            const file = uploadedImages[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('eventId', eventId); // Ensure this matches the API
            formData.append('sortOrder', (i + 1).toString());

            try {
                const response = await fetch('/api/upload-event-image', { // New API endpoint
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();
                if (!response.ok) {
                    console.error('Image upload failed:', result);
                    failedUploads.push(file.name);
                    continue;
                }
                if (result.url) {
                    imageUrls.push(result.url);
                } else {
                    console.error('Image upload succeeded but no URL was returned:', result);
                    failedUploads.push(file.name);
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                failedUploads.push(file.name);
            }
        }
        setIsUploadingImages(false);
        if (failedUploads.length > 0) {
            throw new Error(`Failed to upload images: ${failedUploads.join(', ')}`);
        }
        return imageUrls;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!user) {
            setError("You must be logged in to create an event.");
            router.push("/auth/sign-in?redirect=/submit-event");
            return;
        }

        let expectedCapacityMin = 0;
        let expectedCapacityMax = 0;
        if (guestRange === '1-15') { expectedCapacityMin = 1; expectedCapacityMax = 15; }
        else if (guestRange === '16-30') { expectedCapacityMin = 16; expectedCapacityMax = 30; }
        else if (guestRange === '31-50') { expectedCapacityMin = 31; expectedCapacityMax = 50; }
        else if (guestRange === '51-75') { expectedCapacityMin = 51; expectedCapacityMax = 75; }
        else if (guestRange === '75-100') { expectedCapacityMin = 75; expectedCapacityMax = 100; }
        else if (guestRange === '100+') { expectedCapacityMin = 100; expectedCapacityMax = 500; }

        let durationHours = 0;
        if (duration === '6+') { durationHours = 6; }
        else { durationHours = parseInt(duration); }

        const eventFormData = {
            title: title,
            event_type: eventType,
            description,
            selected_date: selectedDate,
            selected_time: selectedTime,
            expected_capacity_min: expectedCapacityMin,
            expected_capacity_max: expectedCapacityMax,
            assets_needed: assetsNeeded,
            status: eventStatus,
            duration: durationHours,
        };

        try {
            const createdEvent = await createEventMutation(eventFormData);

            if (createdEvent && createdEvent.id && uploadedImages.length > 0) {
                try {
                    await uploadEventImages(createdEvent.id);
                    setSuccess(`Event "${createdEvent.title}" created and images uploaded successfully! Redirecting...`);
                } catch (imageErr) {
                    const message = imageErr instanceof Error ? imageErr.message : 'Image upload failed';
                    setError(`Event created but image upload failed: ${message}`);
                    console.error(imageErr);
                    // Don't redirect if image upload fails, let user see the error
                    return;
                }
            } else if (createdEvent) {
                setSuccess(`Event "${createdEvent.title}" created successfully! Redirecting...`);
            }

            // Redirect after successful submission
            setTimeout(() => {
                router.push("/explore"); // Or a different page like /my-events
            }, 3000);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            setError(`Event creation failed: ${message}`);
            console.error('Failed to create event:', error);
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

    const isSubmitting = isCreatingEvent || isUploadingImages;

    if (isUserLoading) {
        return (
            <div className="min-h-screen bg-[#FFF9F5]">
                <NavBar />
                <div className="max-w-4xl mx-auto p-8 mt-8 flex justify-center">
                    <div className="animate-pulse h-6 w-24 bg-gray-300 rounded"></div>
                </div>
            </div>
        );
    }

    // No user check needed here as useEffect handles redirect

    return (
        <>
            <NavBar />
            <main className="min-h-screen w-full py-4">
                <div className="mx-auto max-w-2xl px-4">
                    <h1 className="text-3xl font-bold font-heading mb-8 text-center text-gray-800">
                        Create Your Event
                    </h1>

                    {/* Error and Success Messages */}
                    {error && (
                        <div className="mb-4 p-4 rounded-md bg-red-50 text-red-700 border border-red-200">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 p-4 rounded-md bg-green-50 text-green-700 border border-green-200">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200">
                        {/* Image Upload Section - Adapted from submit-space */}
                        <div className="mb-8">
                            <label className="block text-gray-700 text-sm font-medium mb-2">
                                Event Cover Images
                            </label>
                            <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md text-gray-700 text-sm mb-4">
                                <p className="font-medium">Image Guidelines:</p>
                                <ul className="list-disc pl-5 mt-1">
                                    <li>Max 5MB per image</li>
                                    <li>Accepted formats: JPG, PNG, WebP</li>
                                    <li>High-quality images make your event stand out!</li>
                                </ul>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                accept="image/jpeg, image/png, image/webp"
                                multiple
                                className="hidden"
                                id="event-images"
                            />

                            <div
                                className="h-60 w-full border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer mb-4 hover:border-blue-500 transition-colors duration-150"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="text-center p-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="mt-2 text-sm text-gray-600">Click to upload or drag images here</p>
                                    <p className="mt-1 text-xs text-gray-500">PNG, JPG, WebP up to 5MB each.</p>
                                    {uploadedImages.length > 0 && (
                                        <p className="mt-2 text-sm text-blue-600 font-medium">
                                            {uploadedImages.length} {uploadedImages.length === 1 ? 'image' : 'images'} selected
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Image preview - Adapted from submit-space */}
                            {imagePreviewUrls.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="text-gray-700 text-xs font-medium mb-2 uppercase tracking-wider">Image Previews</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                                        {imagePreviewUrls.map((url, index) => (
                                            <div key={index} className="relative group aspect-w-1 aspect-h-1">
                                                <div className="h-24 w-full rounded-md overflow-hidden border border-gray-300 relative">
                                                    <Image
                                                        src={url}
                                                        alt={`Event image ${index + 1}`}
                                                        className="object-cover"
                                                        fill
                                                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 focus:outline-none cursor-pointer opacity-75 group-hover:opacity-100 transition-opacity"
                                                    aria-label={`Remove image ${index + 1}`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mb-6">
                            <label htmlFor="title" className="block mb-1.5 text-sm font-medium text-gray-700">
                                Event Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                placeholder=""
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label htmlFor="eventType" className="block mb-1.5 text-sm font-medium text-gray-700">
                                    Event Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="eventType"
                                    value={eventType}
                                    onChange={(e) => setEventType(e.target.value as EventType)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                    required
                                >
                                    <option value="Pop Up">Pop Up</option>
                                    <option value="Birthday">Birthday</option>
                                    <option value="Corporate">Corporate</option>
                                    <option value="Wedding">Wedding</option>
                                    <option value="Other">Other Event</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="startDate" className="block mb-1.5 text-sm font-medium text-gray-700">
                                    Start Date & Time <span className="text-red-500">*</span>
                                </label>
                                <div className="relative h-[42px]">
                                    <DateTimePicker
                                        selectedDate={selectedDate}
                                        selectedTime={selectedTime}
                                        onDateSelect={setSelectedDate}
                                        onTimeSelect={setSelectedTime}
                                        onConfirm={() => setShowDateTimePicker(false)}
                                        showPicker={showDateTimePicker}
                                        togglePicker={() => setShowDateTimePicker(!showDateTimePicker)}
                                        buttonClassName="w-full h-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-left"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <RangeSlider
                                    id="guestRange"
                                    label="Expected Guests"
                                    value={guestRange}
                                    onChange={(value) => setGuestRange(value as GuestRange)}
                                    options={[
                                        { value: '1-15', label: '1-15 guests' },
                                        { value: '16-30', label: '16-30 guests' },
                                        { value: '31-50', label: '31-50 guests' },
                                        { value: '51-75', label: '51-75 guests' },
                                        { value: '75-100', label: '75-100 guests' },
                                        { value: '100+', label: '100+ guests' },
                                    ]}
                                />
                            </div>
                            <div>
                                <RangeSlider
                                    id="duration"
                                    label="Duration (hours)"
                                    value={duration}
                                    onChange={(value) => setDuration(value as DurationType)}
                                    options={[
                                        { value: '1', label: '1 hour' },
                                        { value: '2', label: '2 hours' },
                                        { value: '3', label: '3 hours' },
                                        { value: '4', label: '4 hours' },
                                        { value: '5', label: '5 hours' },
                                        { value: '6+', label: '6+ hours' },
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="mb-6">
                            <label htmlFor="description" className="block mb-1.5 text-sm font-medium text-gray-700">
                                Event Description
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-y transition-shadow"
                                placeholder="Tell us more about your event, what you're looking for, etc."
                                rows={4}
                            />
                        </div>

                        <div className="mb-6">
                            <label htmlFor="assetsNeeded" className="block mb-1.5 text-sm font-medium text-gray-700">
                                Required Services/Features
                            </label>
                            <input
                                type="text"
                                id="assetsNeeded"
                                value={assetInput}
                                onChange={(e) => setAssetInput(e.target.value)}
                                onKeyDown={handleAssetKeyDown}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                placeholder="e.g., DJ Booth, Projector (press space to add)"
                            />
                            <div className="flex flex-wrap gap-2 mt-3">
                                {assetsNeeded.map((asset, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full text-sm text-gray-700 border border-gray-200"
                                    >
                                        <span>{asset}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeAsset(index)}
                                            className="text-gray-500 hover:text-gray-800 text-lg leading-none -mr-1"
                                            aria-label={`Remove ${asset}`}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mb-8">
                            <div className="flex items-center">
                                <input
                                    id="isPublic"
                                    type="checkbox"
                                    checked={eventStatus === 'public_pending'}
                                    onChange={(e) => setEventStatus(e.target.checked ? 'public_pending' : 'private_pending')}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="isPublic" className="ml-2 block text-sm font-medium text-gray-700">
                                    Make Event Publicly Listed
                                </label>
                            </div>
                            <p className="mt-1.5 text-xs text-gray-500">
                                Public events are discoverable on OffMenu and may require moderator approval. Private events are only visible to you.
                            </p>
                        </div>

                        <div className="flex justify-between items-center mt-10 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors duration-200"
                            >
                                Back
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[150px]"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {isUploadingImages ? 'Uploading...' : 'Creating...'}
                                    </span>
                                ) : 'Create Event'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </>
    );
} 
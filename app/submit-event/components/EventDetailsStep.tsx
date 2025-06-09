"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "../../context/UserContext";
import Image from "next/image";
import DateTimePicker from "../../components/DateTimePicker";
import ServicesFormStep, { DEFAULT_EVENT_SERVICES } from "../../components/ServicesFormStep";

type EventType = 'Pop Up' | 'Birthday' | 'Corporate' | 'Wedding' | 'Other';
type GuestRange = '1-15' | '16-30' | '31-50' | '51-75' | '75-100' | '100+';
type DurationType = '1' | '2' | '3' | '4' | '5' | '6+';

export interface EventFormData {
    title: string;
    event_type: EventType;
    description: string;
    selected_date: string;
    selected_time: string;
    expected_capacity_min: number;
    expected_capacity_max: number;
    assets_needed: string[];
    event_status: "private_pending" | "public_pending" | "public_approved" | "private_approved";
    duration: number;
    website?: string;
    instagram_handle?: string;
    // Address fields removed - will be added in step 3 if needed
}

interface EventDetailsStepProps {
    formData: EventFormData;
    onFormDataChange: (data: EventFormData) => void;
    uploadedImages: File[];
    onImagesChange: (images: File[]) => void;
    imagePreviewUrls: string[];
    onImagePreviewUrlsChange: (urls: string[]) => void;
}

export default function EventDetailsStep({
    formData,
    onFormDataChange,
    uploadedImages,
    onImagesChange,
    imagePreviewUrls,
    onImagePreviewUrlsChange,
}: EventDetailsStepProps) {
    const { isLoading: isUserLoading } = useUser();
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const guestRangeToString = (min?: number, max?: number): GuestRange => {
        if (min === 1 && max === 15) return '1-15';
        if (min === 16 && max === 30) return '16-30';
        if (min === 31 && max === 50) return '31-50';
        if (min === 51 && max === 75) return '51-75';
        if (min === 75 && max === 100) return '75-100';
        if (min === 100 && max === 500) return '100+';
        return '1-15'; // Default
    };

    const [guestRange, setGuestRange] = useState<GuestRange>(
        guestRangeToString(formData.expected_capacity_min, formData.expected_capacity_max)
    );

    const durationToString = (duration?: number): DurationType => {
        if (duration === 1) return '1';
        if (duration === 2) return '2';
        if (duration === 3) return '3';
        if (duration === 4) return '4';
        if (duration === 5) return '5';
        if (duration && duration >= 6) return '6+';
        return '1'; // Default
    };

    const [duration, setDuration] = useState<DurationType>(durationToString(formData.duration));

    // Update parent form data when local state changes
    useEffect(() => {
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

        onFormDataChange({
            ...formData,
            expected_capacity_min: expectedCapacityMin,
            expected_capacity_max: expectedCapacityMax,
            duration: durationHours,
        });
    }, [guestRange, duration]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        if (e.target.files && e.target.files.length > 0) {
            const newImagesArray = Array.from(e.target.files);
            const validImages = newImagesArray.filter(file => {
                const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
                const isValidSize = file.size <= 5 * 1024 * 1024;

                if (!isValidType) {
                    setError('Only JPG, PNG, and WebP images are allowed.');
                }
                if (!isValidSize) {
                    setError('Images must be smaller than 5MB.');
                }
                return isValidType && isValidSize;
            });

            onImagesChange([...uploadedImages, ...validImages]);
            const newPreviewUrls = validImages.map(file => URL.createObjectURL(file));
            onImagePreviewUrlsChange([...imagePreviewUrls, ...newPreviewUrls]);
        }
    };

    const removeImage = (index: number) => {
        const newUploadedImages = uploadedImages.filter((_, i) => i !== index);
        const newPreviewUrls = imagePreviewUrls.filter((_, i) => i !== index);
        
        // Revoke the object URL to prevent memory leaks
        URL.revokeObjectURL(imagePreviewUrls[index]);
        
        onImagesChange(newUploadedImages);
        onImagePreviewUrlsChange(newPreviewUrls);
    };

    if (isUserLoading) {
        return (
            <div className="min-h-screen">
                <div className="max-w-4xl mx-auto p-8 mt-8 flex justify-center">
                    <div className="animate-pulse h-6 w-24 bg-gray-300 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen w-full py-4">
            <div className="mx-auto max-w-2xl px-4">
                <h1 className="text-3xl font-bold font-heading mb-8 text-center text-gray-800">
                    Create Your Event
                </h1>

                {error && (
                    <div className="mb-4 p-4 rounded-md bg-red-50 text-red-700 border border-red-200">
                        {error}
                    </div>
                )}

                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200">
                    {/* Image Upload Section */}
                    <div className="mb-8">
                        <label className="block text-gray-700 text-sm font-medium mb-2">
                            Event Cover Images <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md text-gray-700 text-sm mb-4">
                            <p className="font-medium">Image Requirements:</p>
                            <ul className="list-disc pl-5 mt-1">
                                <li className="font-semibold text-blue-700">Minimum 1 image required</li>
                                <li>Max 5MB per image</li>
                                <li>Accepted formats: JPG, PNG, WebP</li>
                                <li>High-quality images make your event stand out!</li>
                            </ul>
                        </div>

                        {/* Show warning if no images */}
                        {imagePreviewUrls.length === 0 && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
                                <div className="flex items-center">
                                    <svg className="h-4 w-4 text-amber-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-medium">
                                        Please add at least 1 image for your event
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Show success message when minimum is met */}
                        {imagePreviewUrls.length >= 1 && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                                <div className="flex items-center">
                                    <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-medium">
                                        Great! You have {imagePreviewUrls.length} image{imagePreviewUrls.length === 1 ? '' : 's'} uploaded.
                                    </span>
                                </div>
                            </div>
                        )}

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
                                <p className="mt-1 text-xs text-red-600 font-medium">Minimum 1 image required</p>
                                {imagePreviewUrls.length > 0 && (
                                    <p className="mt-2 text-sm text-blue-600 font-medium">
                                        {imagePreviewUrls.length} {imagePreviewUrls.length === 1 ? 'image' : 'images'} selected
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Image Previews */}
                        {imagePreviewUrls.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                {imagePreviewUrls.map((url, index) => (
                                    <div key={index} className="relative group">
                                        <Image
                                            src={url}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                                            width={200}
                                            height={128}
                                        />
                                        <button
                                            onClick={() => removeImage(index)}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Event Title */}
                    <div className="mb-6">
                        <label htmlFor="title" className="block mb-1.5 text-sm font-medium text-gray-700">
                            Event Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={formData.title}
                            onChange={(e) => onFormDataChange({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                            placeholder="What's the name of your event?"
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
                                value={formData.event_type}
                                onChange={(e) => onFormDataChange({ ...formData, event_type: e.target.value as EventType })}
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
                                    selectedDate={formData.selected_date}
                                    selectedTime={formData.selected_time}
                                    onDateSelect={(date) => onFormDataChange({ ...formData, selected_date: date })}
                                    onTimeSelect={(time) => onFormDataChange({ ...formData, selected_time: time })}
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
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                                Expected Guest Count
                            </label>
                            <select
                                value={guestRange}
                                onChange={(e) => setGuestRange(e.target.value as GuestRange)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                            >
                                <option value="1-15">1-15 guests</option>
                                <option value="16-30">16-30 guests</option>
                                <option value="31-50">31-50 guests</option>
                                <option value="51-75">51-75 guests</option>
                                <option value="75-100">75-100 guests</option>
                                <option value="100+">100+ guests</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                                Event Duration (hours)
                            </label>
                            <select
                                value={duration}
                                onChange={(e) => setDuration(e.target.value as DurationType)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                            >
                                <option value="1">1 hour</option>
                                <option value="2">2 hours</option>
                                <option value="3">3 hours</option>
                                <option value="4">4 hours</option>
                                <option value="5">5 hours</option>
                                <option value="6+">6+ hours</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label htmlFor="description" className="block mb-1.5 text-sm font-medium text-gray-700">
                            Event Description
                        </label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-y transition-shadow"
                            placeholder="Tell us more about your event, what you're looking for, etc."
                            rows={4}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label htmlFor="website" className="block mb-1.5 text-sm font-medium text-gray-700">
                                Event Website
                            </label>
                            <input
                                id="website"
                                type="url"
                                value={formData.website || ''}
                                onChange={(e) => onFormDataChange({ ...formData, website: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                placeholder="https://your-event-website.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="instagram" className="block mb-1.5 text-sm font-medium text-gray-700">
                                Instagram Handle
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">@</span>
                                <input
                                    id="instagram"
                                    type="text"
                                    value={formData.instagram_handle || ''}
                                    onChange={(e) => onFormDataChange({ ...formData, instagram_handle: e.target.value })}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                    placeholder="your_handle"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <ServicesFormStep
                            selectedServices={formData.assets_needed}
                            onServicesChange={(services) => onFormDataChange({ ...formData, assets_needed: services })}
                            title="Required Services/Features"
                            description="What services or features do you need for your event?"
                            presetServices={DEFAULT_EVENT_SERVICES}
                            placeholder="e.g., DJ Booth, Projector"
                            showPresetServices={true}
                            allowCustomServices={true}
                            addOnSpace={true}
                        />
                    </div>

                    <div className="mb-8">
                        <div className="flex items-center">
                            <input
                                id="isPublic"
                                type="checkbox"
                                checked={formData.event_status.startsWith('public_')}
                                onChange={(e) => {
                                    const newStatus = e.target.checked ? 'public_pending' : 'private_pending';
                                    onFormDataChange({ ...formData, event_status: newStatus });
                                }}
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
                </div>
            </div>
        </main>
    );
} 
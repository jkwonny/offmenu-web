"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import NavBar from '@/app/components/NavBar';
import CreateOrEditEventForm from '@/app/components/CreateOrEditEventForm';
import type { EventFormData } from '@/app/components/CreateOrEditEventForm';
import { useUpdateEvent } from '@/app/lib/react-query/mutations/events';
import { useUser } from '@/app/context/UserContext';
import { Event } from '@/app/types/event';

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = params.id as string;
    const { user } = useUser();

    const [eventData, setEventData] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { mutateAsync: updateEventMutation } = useUpdateEvent();

    useEffect(() => {
        if (eventId) {
            const fetchEvent = async () => {
                setLoading(true);
                setError(null);
                try {
                    const response = await fetch(`/api/events/${eventId}`);
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || `Error: ${response.status}`);
                    }
                    const data = await response.json();
                    setEventData(data);
                    if (user && data.user_id !== user.id) {
                        setError("You are not authorized to edit this event.");
                        // Redirect or show a message
                        setTimeout(() => router.push(`/event/${eventId}`), 3000);
                    }
                } catch (err) {
                    if (err instanceof Error) {
                        setError(err.message);
                    } else {
                        setError('An unknown error occurred while fetching event data.');
                    }
                    console.error("Failed to fetch event for editing:", err);
                }
                setLoading(false);
            };
            fetchEvent();
        }
    }, [eventId, user, router]);

    // Function to upload images (can be reused or adapted from create page if complex)
    // For simplicity, we assume a similar upload function as in create page,
    // or this could be further refactored into a shared utility.
    const uploadEventImages = async (currentEventId: string, imageFiles: File[]): Promise<string[]> => {
        if (imageFiles.length === 0) return [];
        const imageUrls: string[] = [];
        const failedUploads: string[] = [];

        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('eventId', currentEventId);
            formData.append('sortOrder', (i + 1).toString()); // Adjust sort order as needed

            try {
                const response = await fetch('/api/upload-event-image', {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();
                if (!response.ok) {
                    failedUploads.push(file.name);
                    continue;
                }
                if (result.url) {
                    imageUrls.push(result.url);
                }
            } catch {
                failedUploads.push(file.name);
            }
        }
        if (failedUploads.length > 0) {
            throw new Error(`Failed to upload some images: ${failedUploads.join(', ')}`);
        }
        return imageUrls;
    };


    const handleSubmit = async (data: EventFormData, uploadedImageFiles: File[], imagesToDelete: string[]) => {
        if (!eventId) {
            setError("Event ID is missing.");
            return;
        }
        if (!user || (eventData && eventData.user_id !== user.id)) {
            setError("You are not authorized to update this event.");
            return;
        }

        setError(null);
        setSuccess(null);
        setIsSubmitting(true);

        try {
            // Ensure all required fields are provided with default values
            const updateData = {
                ...data,
                id: eventId,
                street_number: data.street_number || "",
                street_name: data.street_name || "",
                neighborhood: data.neighborhood || "",
                city: data.city || "",
                state: data.state || "",
                postal_code: data.postal_code || "",
                latitude: data.latitude || "",
                longitude: data.longitude || "",
            };
            
            const updatedEventData = await updateEventMutation(updateData);

            // Handle new image uploads
            if (uploadedImageFiles.length > 0) {
                try {
                    await uploadEventImages(eventId, uploadedImageFiles);
                } catch (imageErr) {
                    const message = imageErr instanceof Error ? imageErr.message : 'Image upload failed';
                    // Update might have succeeded, but images failed.
                    setSuccess(`Event "${updatedEventData.title}" updated, but new image uploads failed: ${message}. You can try again.`);
                    setTimeout(() => router.push(`/event/${eventId}`), 4000);
                    setIsSubmitting(false);
                    return;
                }
            }

            // Handle image deletions
            if (imagesToDelete.length > 0) {
                try {
                    const response = await fetch('/api/delete-event-images', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ eventId, imageUrls: imagesToDelete }),
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to delete some images.');
                    }
                    // Optionally, handle partial success if the API supports it
                } catch (deleteErr) {
                    const message = deleteErr instanceof Error ? deleteErr.message : 'Image deletion failed';
                    // Event update and new uploads might have succeeded, but deletions failed.
                    // Append to success message or set a specific error state
                    setSuccess(`Event "${updatedEventData.title}" updated and new images uploaded, but some old images could not be deleted: ${message}. Please check manually.`);
                    // Decide if this is a critical failure or a partial success
                    setTimeout(() => router.push(`/event/${eventId}`), 5000); // Longer timeout to read message
                    setIsSubmitting(false);
                    return;
                }
            }

            setSuccess(`Event "${updatedEventData.title}" updated successfully! Redirecting...`);
            setTimeout(() => {
                router.push(`/event/${eventId}`);
            }, 3000);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            setError(`Event update failed: ${message}`);
            console.error('Failed to update event:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex justify-center items-center">
                <NavBar /> {/* Keep NavBar for consistent layout during loading */}
                <p>Loading event details for editing...</p>
            </div>
        );
    }

    // Error display for fetch errors or authorization issues
    if (error && !eventData) { // If error happened before data was loaded or auth failed
        return (
            <>
                <NavBar />
                <div className="min-h-screen bg-gray-100 flex justify-center items-center">
                    <p>Error: {error}</p>
                </div>
            </>
        );
    }

    // If eventData is loaded but user is not owner (this might be redundant if useEffect redirects)
    if (eventData && user && eventData.user_id !== user.id) {
        return (
            <>
                <NavBar />
                <div className="min-h-screen bg-gray-100 flex justify-center items-center">
                    <p>You are not authorized to edit this event. Redirecting...</p>
                </div>
            </>
        );
    }

    if (!eventData) { // Handles case where eventData is null after loading (e.g. not found, but no specific error thrown to fill `error` state)
        return (
            <>
                <NavBar />
                <div className="min-h-screen bg-gray-100 flex justify-center items-center">
                    <p>Event not found or could not be loaded for editing.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <NavBar />
            {/* Page-level Error and Success Messages for submit actions */}
            {error && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4">
                    <div className="p-4 rounded-md bg-red-50 text-red-700 border border-red-200 shadow-lg">
                        {error}
                    </div>
                </div>
            )}
            {success && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4">
                    <div className="p-4 rounded-md bg-green-50 text-green-700 border border-green-200 shadow-lg">
                        {success}
                    </div>
                </div>
            )}
            <CreateOrEditEventForm
                initialData={eventData}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                mode="edit"
            />
        </>
    );
} 
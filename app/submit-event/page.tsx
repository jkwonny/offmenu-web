"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateEvent } from "../lib/react-query/mutations/events";
import NavBar from "../components/NavBar";
import { useUser } from "../context/UserContext";
import CreateOrEditEventForm from "../components/CreateOrEditEventForm";
import type { EventFormData } from "../components/CreateOrEditEventForm";

export default function SubmitEventPage() {
    const router = useRouter();
    const { user } = useUser();
    const { mutateAsync: createEventMutation } = useCreateEvent();

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const uploadEventImages = async (eventId: string, imageFiles: File[]): Promise<string[]> => {
        if (imageFiles.length === 0) return [];
        const imageUrls: string[] = [];
        const failedUploads: string[] = [];

        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('eventId', eventId);
            formData.append('sortOrder', (i + 1).toString());

            try {
                const response = await fetch('/api/upload-event-image', {
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
        if (failedUploads.length > 0) {
            throw new Error(`Failed to upload images: ${failedUploads.join(', ')}`);
        }
        return imageUrls;
    };

    const handleSubmit = async (data: EventFormData, uploadedImageFiles: File[]) => {
        setError(null);
        setSuccess(null);
        setIsSubmitting(true);

        if (!user) {
            setError("You must be logged in to create an event.");
            router.push("/auth/sign-in?redirect=/submit-event");
            setIsSubmitting(false);
            return;
        }

        try {
            const createdEvent = await createEventMutation(data);

            if (createdEvent && createdEvent.id && uploadedImageFiles.length > 0) {
                try {
                    await uploadEventImages(createdEvent.id, uploadedImageFiles);
                    setSuccess(`Event "${createdEvent.title}" created and images uploaded successfully! Redirecting...`);
                } catch (imageErr) {
                    const message = imageErr instanceof Error ? imageErr.message : 'Image upload failed';
                    setError(`Event created but image upload failed: ${message}. You can edit the event to try uploading again.`);
                    console.error(imageErr);
                    setTimeout(() => {
                        if (createdEvent?.id) router.push(`/event/${createdEvent.id}`);
                        else router.push("/explore");
                    }, 4000);
                    setIsSubmitting(false);
                    return;
                }
            } else if (createdEvent) {
                setSuccess(`Event "${createdEvent.title}" created successfully! Redirecting...`);
            }

            setTimeout(() => {
                if (createdEvent?.id) router.push(`/event/${createdEvent.id}`);
                else router.push("/explore");
            }, 3000);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            setError(`Event creation failed: ${message}`);
            console.error('Failed to create event:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <NavBar />
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
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                mode="create"
            />
        </>
    );
} 
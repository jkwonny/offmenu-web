'use client';

import { useState, useEffect } from 'react';
import NavBar from '../components/NavBar';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import CreateOrEditSpaceForm, { SpaceFormDataWithImages } from '../components/CreateOrEditSpaceForm';
import { SpaceFormData } from '@/app/types/space';
import { handleAuthError } from '../lib/supabase';

export default function SubmitSpacePage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const [pageSuccess, setPageSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function getUser() {
            try {
                const { data, error } = await supabase.auth.getUser();
                if (error) {
                    handleAuthError(error);
                    router.push('/auth/signin?redirect=/submit-space');
                    return;
                }
                setCurrentUser(data.user);
                if (!data.user) {
                    router.push('/auth/signin?redirect=/submit-space');
                }
            } catch (error) {
                handleAuthError(error as Error);
                setCurrentUser(null);
                router.push('/auth/signin?redirect=/submit-space');
            }
        }
        getUser();
    }, [router]);

    const uploadImagesToServer = async (venueId: number | string, images: File[]): Promise<string[]> => {
        if (images.length === 0) return [];
        const imageUrls: string[] = [];
        const failedUploads: string[] = [];

        for (let i = 0; i < images.length; i++) {
            const file = images[i];
            const imageFormData = new FormData();
            imageFormData.append('file', file);
            imageFormData.append('venueId', venueId.toString());
            imageFormData.append('sortOrder', (i + 1).toString());

            try {
                const response = await fetch('/api/upload-image', {
                    method: 'POST',
                    body: imageFormData,
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

    const handleSubmitCreateSpace = async (
        formData: SpaceFormData,
        newImages: File[],
        // imageUrlsToRemove is not used in create mode, but part of the shared signature
        imageUrlsToRemove: string[]
    ): Promise<{ success: boolean; message: string; venueId?: string | number }> => {
        if (!currentUser) {
            return { success: false, message: 'You must be logged in to submit a space.' };
        }
        setIsSubmitting(true);
        setPageError(null);
        setPageSuccess(null);

        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                handleAuthError(sessionError || new Error('Session expired'));
                router.push('/auth/signin?redirect=/submit-space');
                return { success: false, message: sessionError?.message || 'Your session has expired. Please sign in again.' };
            }

            const submissionData = {
                ...formData,
                owner_id: currentUser.id,
                rental_type: formData.rental_type,
                collaboration_type: formData.collaboration_type || null,
                website: formData.website?.trim() || null,
                instagram_handle: formData.instagram_handle?.trim() || null,
                street_number: formData.street_number?.trim() || null,
                street_name: formData.street_name?.trim() || null,
                neighborhood: formData.neighborhood?.trim() || null,
                city: formData.city?.trim() || null,
                state: formData.state || null,
                postal_code: formData.postal_code?.trim() || null,
                latitude: formData.latitude ? parseFloat(formData.latitude as string) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude as string) : null,
                max_guests: formData.max_guests ? parseInt(formData.max_guests as string, 10) : null,
                tags: formData.tags ? formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag !== '') : [],
                status: 'pending',
                services: formData.services,
            };

            const response = await fetch('/api/venues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.details || `HTTP error! status: ${response.status}`);
            }

            let imageUploadMessage = '';
            if (newImages.length > 0 && result.id) {
                try {
                    await uploadImagesToServer(result.id, newImages);
                    imageUploadMessage = ' Images uploaded successfully.';
                } catch (imageErr) {
                    const message = imageErr instanceof Error ? imageErr.message : 'Image upload failed';
                    // Venue created but image upload failed
                    setPageError(`Venue created but image upload failed: ${message}`);
                    // Still return success for venue creation, but with a note about images.
                    return { success: true, message: `"${result.name}" space submitted! Some images failed to upload.`, venueId: result.id };
                }
            }

            setPageSuccess(`"${result.name}" space submitted successfully!${imageUploadMessage}`);
            setTimeout(() => {
                router.push('/events'); // Or a more relevant page like dashboard or the new space's page
            }, 3000);
            return { success: true, message: `"${result.name}" space submitted successfully!${imageUploadMessage}`, venueId: result.id };

        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setPageError(`Submission failed: ${message}`);
            return { success: false, message: `Submission failed: ${message}` };
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelCreate = () => {
        router.push('/dashboard'); // Or to any other relevant page
    };

    if (!currentUser) {
        // Optionally show a loading state or a message while user is being fetched/redirected
        return (
            <>
                <NavBar />
                <div className="min-h-screen bg-[#fffbf6] flex flex-col items-center justify-center">
                    <p className="text-lg text-gray-700">Loading user information...</p>
                    {/* Basic spinner */}
                    <svg className="animate-spin h-8 w-8 text-blue-600 mt-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            </>
        );
    }

    return (
        <>
            <NavBar />
            <div className="min-h-screen bg-[#fffbf6] flex flex-col">
                <div className="container mx-auto px-4 max-w-4xl flex-grow py-8">
                    {pageError && (
                        <div className="mb-4 p-4 rounded-md bg-red-50 text-red-600">
                            {pageError}
                        </div>
                    )}
                    {pageSuccess && (
                        <div className="mb-4 p-4 rounded-md bg-green-50 text-green-600">
                            {pageSuccess}
                        </div>
                    )}
                    {!pageSuccess && (
                        <CreateOrEditSpaceForm
                            onSubmit={handleSubmitCreateSpace}
                            onCancel={handleCancelCreate}
                            mode="create"
                            title="Submit Your Space"
                        />
                    )}
                </div>
            </div>
        </>
    );
} 
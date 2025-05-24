'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import NavBar from '@/app/components/NavBar'; // Adjusted path
import CreateOrEditSpaceForm, { SpaceFormDataWithImages } from '@/app/components/CreateOrEditSpaceForm'; // Adjusted path
import { SpaceFormData } from '@/app/types/space';
import { supabase } from '@/app/lib/supabase'; // Adjusted path
import { User } from '@supabase/supabase-js';
import { handleAuthError } from '@/app/lib/supabase'; // Adjusted path

export default function EditSpacePage() {
    const router = useRouter();
    const params = useParams();
    const spaceId = params?.id as string;

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [initialData, setInitialData] = useState<Partial<SpaceFormDataWithImages> | null>(null);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [pageSuccess, setPageSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function getUser() {
            try {
                const { data, error } = await supabase.auth.getUser();
                if (error) {
                    handleAuthError(error);
                    router.push(`/auth/signin?redirect=/spaces/${spaceId}/edit`);
                    return;
                }
                setCurrentUser(data.user);
                if (!data.user) {
                    router.push(`/auth/signin?redirect=/spaces/${spaceId}/edit`);
                }
            } catch (error) {
                handleAuthError(error as Error);
                setCurrentUser(null);
                router.push(`/auth/signin?redirect=/spaces/${spaceId}/edit`);
            }
        }
        getUser();
    }, [router, spaceId]);

    const fetchSpaceData = useCallback(async () => {
        if (!spaceId || !currentUser) return;
        setLoading(true);
        try {
            // Fetch existing venue data
            // Assuming you have an API endpoint like GET /api/venues/[id]
            // Or directly fetch from Supabase if preferred and secure
            const response = await fetch(`/api/venues/${spaceId}`);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Space not found.');
                }
                throw new Error('Failed to fetch space data.');
            }
            const data = await response.json();

            // Check if the current user is the owner of the space
            if (data.owner_id !== currentUser.id) {
                setPageError("You are not authorized to edit this space.");
                setInitialData(null); // Clear any potentially loaded data
                setTimeout(() => router.push('/dashboard'), 3000); // Redirect after a delay
                return;
            }

            const imageUrls = data.venue_images ? data.venue_images.map((img: { image_url: string }) => img.image_url) : [];

            setInitialData({
                ...data,
                image_urls: imageUrls, // Use the mapped image URLs
                // Ensure tags is a string as expected by the form
                tags: Array.isArray(data.tags) ? data.tags.join(', ') : data.tags || '',
                // Convert numeric/boolean values to string if your form expects strings
                max_guests: data.max_guests?.toString() || '',
                latitude: data.latitude?.toString() || '',
                longitude: data.longitude?.toString() || '',
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            setPageError(message);
        } finally {
            setLoading(false);
        }
    }, [spaceId, router, currentUser]);

    useEffect(() => {
        if (currentUser && spaceId) { // Only fetch if user and spaceId are available
            fetchSpaceData();
        }
    }, [currentUser, spaceId, fetchSpaceData]);

    const uploadImagesToServer = async (venueId: string | number, images: File[]): Promise<string[]> => {
        // This function can be identical to the one in submit-space or moved to a shared lib
        if (images.length === 0) return [];
        const imageUrls: string[] = [];
        // ... (implementation as in submit-space page - or better, call a shared utility)
        for (let i = 0; i < images.length; i++) {
            const file = images[i];
            const imageFormData = new FormData();
            imageFormData.append('file', file);
            imageFormData.append('venueId', venueId.toString());
            imageFormData.append('sortOrder', (i + 1).toString()); // Or more sophisticated logic for sort order in edit

            try {
                const response = await fetch('/api/upload-image', {
                    method: 'POST',
                    body: imageFormData,
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Image upload failed');
                if (result.url) imageUrls.push(result.url);
            } catch (error) {
                console.error('Error uploading image:', error);
                // Decide if one failed upload should stop all or collect errors
                throw error; // Re-throw to be caught by handleSubmitEditSpace
            }
        }
        return imageUrls;
    };

    const deleteImagesFromServer = async (venueId: string | number, urlsToRemove: string[]): Promise<void> => {
        if (urlsToRemove.length === 0) return;
        // You'll need an API endpoint for deleting images
        // Example: POST /api/delete-images with { venueId, urls: [url1, url2] }
        try {
            const response = await fetch('/api/delete-images', { // Ensure this API route exists
                method: 'POST', // Or DELETE, depending on your API design
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ venueId, urls: urlsToRemove }),
            });
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to delete some images.');
            }
        } catch (error) {
            console.error('Error deleting images:', error);
            throw error; // Re-throw to be caught by handleSubmitEditSpace
        }
    };


    const handleSubmitEditSpace = async (
        formData: SpaceFormData,
        newImages: File[],
        imageUrlsToRemove: string[]
    ): Promise<{ success: boolean; message: string; venueId?: string | number }> => {
        if (!currentUser || !spaceId) {
            return { success: false, message: 'User or Space ID is missing.' };
        }
        setIsSubmitting(true);
        setPageError(null);
        setPageSuccess(null);

        try {
            // Verify session
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                handleAuthError(sessionError || new Error('Session expired'));
                router.push(`/auth/signin?redirect=/spaces/${spaceId}/edit`);
                return { success: false, message: 'Your session has expired. Please sign in again.' };
            }

            // 1. Delete images marked for removal
            if (imageUrlsToRemove.length > 0) {
                await deleteImagesFromServer(spaceId, imageUrlsToRemove);
            }

            // 2. Upload new images
            if (newImages.length > 0) {
                // Consider if you need to manage sort order or replace existing images here
                await uploadImagesToServer(spaceId, newImages);
            }

            // 3. Update space data (excluding direct image URLs if they are managed by relations)
            // First, create an object that strictly conforms to SpaceFormData or the expected update payload.
            const updatePayload: Partial<SpaceFormData> = {
                name: formData.name,
                description: formData.description,
                address: formData.address,
                street_number: formData.street_number,
                street_name: formData.street_name,
                neighborhood: formData.neighborhood,
                city: formData.city,
                state: formData.state,
                postal_code: formData.postal_code,
                category: formData.category,
                rental_type: formData.rental_type,
                collaboration_type: formData.collaboration_type,
                website: formData.website,
                instagram_handle: formData.instagram_handle,
                rules: formData.rules,
                services: formData.services,
                // Ensure numeric fields are numbers if your DB expects them
                max_guests: formData.max_guests ? parseInt(formData.max_guests as string, 10).toString() : '',
                latitude: formData.latitude ? parseFloat(formData.latitude as string).toString() : '',
                longitude: formData.longitude ? parseFloat(formData.longitude as string).toString() : '',
                // Tags should be a string for the form, but your API/DB might expect an array
                // The CreateOrEditSpaceForm keeps it as a comma-separated string.
                // If your API for PUT/PATCH expects an array, transform it here.
                // For example, if API expects an array for tags:
                // tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
                // If API expects a string (as per SpaceFormData):
                tags: formData.tags || '',
            };


            // Example with API route
            const response = await fetch(`/api/venues/${spaceId}`, {
                method: 'PUT', // Or PATCH
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || result.details || 'Failed to update space.');
            }


            setPageSuccess(`"${result.name || formData.name}" space updated successfully!`);
            setTimeout(() => {
                router.push(`/spaces/${spaceId}`); // Redirect to detail page
            }, 2000);
            return { success: true, message: `Space updated successfully!`, venueId: spaceId };

        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setPageError(`Update failed: ${message}`);
            return { success: false, message: `Update failed: ${message}` };
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelEdit = () => {
        router.push(spaceId ? `/spaces/${spaceId}` : '/dashboard');
    };

    if (loading) {
        return (
            <>
                <NavBar />
                <div className="min-h-screen bg-[#fffbf6] flex flex-col items-center justify-center">
                    <p className="text-lg text-gray-700">Loading space details...</p>
                    <svg className="animate-spin h-8 w-8 text-blue-600 mt-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            </>
        );
    }

    if (pageError && !initialData) { // Show full page error if initial data failed to load and error is fatal for form display
        return (
            <>
                <NavBar />
                <div className="min-h-screen bg-[#fffbf6] flex flex-col items-center justify-center">
                    <div className="container mx-auto px-4 max-w-xl text-center">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
                        <p className="text-red-500 p-4 bg-red-100 rounded-md">{pageError}</p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="mt-6 px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // If initialData is null but no critical pageError, it might mean user is not authorized or space not found but handled gracefully
    // The CreateOrEditSpaceForm might not render correctly without initialData in edit mode, 
    // So we ensure we only render if initialData is available.
    if (!initialData && !loading) { // And not loading anymore
        // This case should ideally be covered by the pageError block if data loading failed critically
        // If it reaches here, it means loading finished, initialData is null, but no pageError was set to block rendering.
        // This might happen if authorization fails and sets pageError but doesn't throw to stop execution before this check.
        return (
            <>
                <NavBar />
                <div className="min-h-screen bg-[#fffbf6] flex flex-col items-center justify-center">
                    <div className="container mx-auto px-4 max-w-xl text-center">
                        <h1 className="text-2xl font-bold text-gray-700 mb-4">Problem Loading Space</h1>
                        <p className="text-gray-600 p-4 bg-gray-100 rounded-md">
                            {pageError || 'Could not load space details for editing. It might have been deleted or you may not have permission.'}
                        </p>
                        <button
                            onClick={() => router.push(spaceId ? `/spaces/${spaceId}` : '/dashboard')}
                            className="mt-6 px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
                            {spaceId ? 'Back to Space' : 'Go to Dashboard'}
                        </button>
                    </div>
                </div>
            </>
        )
    }


    return (
        <>
            <NavBar />
            <div className="min-h-screen bg-[#fffbf6] flex flex-col">
                <div className="container mx-auto px-4 max-w-4xl flex-grow py-8">
                    {/* Page-level error/success for operations before form might be fully interactive or after submission */}
                    {pageError && initialData && (
                        <div className="mb-4 p-4 rounded-md bg-red-50 text-red-600">
                            {pageError}
                        </div>
                    )}
                    {pageSuccess && (
                        <div className="mb-4 p-4 rounded-md bg-green-50 text-green-600">
                            {pageSuccess}
                        </div>
                    )}

                    {initialData && !pageSuccess && (
                        <CreateOrEditSpaceForm
                            initialData={initialData}
                            onSubmit={handleSubmitEditSpace}
                            onCancel={handleCancelEdit}
                            mode="edit"
                            title="Edit Your Space"
                            isSubmitting={isSubmitting}
                        />
                    )}
                </div>
            </div>
        </>
    );
} 
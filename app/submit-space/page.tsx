'use client';

import { useState } from 'react';
import NavBar from '../components/NavBar';
import { useRouter } from 'next/navigation';
import CreateOrEditSpaceForm from '../components/CreateOrEditSpaceForm';
import { SpaceFormData } from '@/app/types/space';
import { useUser } from '../context/UserContext';

export default function SubmitSpacePage() {
    const router = useRouter();
    const [pageError, setPageError] = useState<string | null>(null);
    const [pageSuccess, setPageSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useUser();

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
    ): Promise<{ success: boolean; message: string; venueId?: string | number }> => {
        setIsSubmitting(true);
        setPageError(null);
        setPageSuccess(null);

        try {
            const submissionData = {
                owner_id: user?.id ?? 'd03d1efd-7b00-4828-ac89-4f3f55b830d4',
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

            console.log('submissionData', submissionData);

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
                router.push('/manage/dashboard'); // Or a more relevant page like dashboard or the new space's page
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

    return (
        <>
            <NavBar />
            <div className="min-h-screen w-screen flex flex-col">
                <div className="container max-w-4xl flex-grow py-8">
                    {pageError && (
                        <div className="mb-4 p-4 mx-auto rounded-md bg-red-50 text-red-600">
                            {pageError}
                        </div>
                    )}
                    {pageSuccess && (
                        <div className="mb-4 p-4 mx-auto rounded-md bg-green-50 text-green-600">
                            {pageSuccess}
                        </div>
                    )}
                    {!pageSuccess && (
                        <CreateOrEditSpaceForm
                            onSubmit={handleSubmitCreateSpace}
                            onCancel={handleCancelCreate}
                            mode="create"
                            title="Submit Your Space"
                            isSubmitting={isSubmitting}
                        />
                    )}
                </div>
            </div>
        </>
    );
} 
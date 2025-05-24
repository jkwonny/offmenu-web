import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service role to bypass RLS policies
const supabaseAdmin = createClient(
    supabaseUrl || 'https://placeholder-url.supabase.co',
    supabaseServiceKey || 'placeholder-key',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Helper function to extract file path from Supabase storage URL
const getPathFromUrl = (url: string): string | null => {
    try {
        const parsedUrl = new URL(url);
        // Example URL: https://<project-ref>.supabase.co/storage/v1/object/public/event-photos/event_id/image.jpg
        // Path should be: event-photos/event_id/image.jpg
        const pathSegments = parsedUrl.pathname.split('/');
        // Find the bucket name in the path and return the rest
        const bucketNameIndex = pathSegments.findIndex(segment => segment === 'event-photos');
        if (bucketNameIndex !== -1 && bucketNameIndex < pathSegments.length -1) {
            return pathSegments.slice(bucketNameIndex).join('/');
        }
        return null;
    } catch (error) {
        console.error('Error parsing URL to get path:', error);
        return null;
    }
};

export async function POST(request: Request) {
    try {
        const { eventId, imageUrls } = await request.json();

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return NextResponse.json({ error: 'Image URLs are required and must be an array' }, { status: 400 });
        }

        const deletedImagePaths: string[] = [];
        const failedDeletions: string[] = [];
        const successfullyDeletedUrls: string[] = [];

        for (const imageUrl of imageUrls) {
            if (typeof imageUrl !== 'string') {
                console.warn('Skipping invalid image URL (not a string):', imageUrl);
                failedDeletions.push(`Invalid URL format: ${imageUrl}`);
                continue;
            }

            const filePath = getPathFromUrl(imageUrl);

            if (!filePath) {
                console.warn('Could not extract file path from URL:', imageUrl);
                failedDeletions.push(`Failed to parse path from URL: ${imageUrl}`);
                continue;
            }

            // 1. Delete from Supabase Storage
            const { error: storageError } = await supabaseAdmin.storage
                .from('event-photos') // Make sure this matches your bucket name
                .remove([filePath]);

            if (storageError) {
                console.error('Supabase storage deletion error for path:', filePath, storageError);
                // If storage delete fails, we might still try to delete from DB, or skip.
                // For now, let's log and add to failedDeletions.
                failedDeletions.push(`${imageUrl} (storage: ${storageError.message})`);
                continue; // Skip DB deletion if storage failed, to avoid orphaned DB entries pointing to non-existent files
            }

            // 2. Delete from event_images table
            const { error: dbError } = await supabaseAdmin
                .from('event_images')
                .delete()
                .eq('image_url', imageUrl)
                .eq('event_id', eventId); // Ensure we only delete for the correct event

            if (dbError) {
                console.error('Supabase DB deletion error for URL:', imageUrl, dbError);
                failedDeletions.push(`${imageUrl} (database: ${dbError.message})`);
                // Potentially, here you might want to re-upload the file if DB deletion fails,
                // but that's complex. For now, just log the failure.
            } else {
                deletedImagePaths.push(filePath);
                successfullyDeletedUrls.push(imageUrl);
            }
        }

        if (failedDeletions.length > 0) {
            return NextResponse.json({ 
                message: 'Some images were not deleted successfully.',
                successfullyDeleted: successfullyDeletedUrls,
                failures: failedDeletions 
            }, { status: 207 }); // 207 Multi-Status
        }

        return NextResponse.json({ 
            success: true, 
            message: 'All specified images deleted successfully.',
            deletedPaths: deletedImagePaths 
        }, { status: 200 });

    } catch (error: unknown) {
        console.error('API Error in /api/delete-event-images:', error);
        let errorMessage = 'An unexpected error occurred';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ error: 'Failed to process image deletion request', details: errorMessage }, { status: 500 });
    }
} 
import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/app/lib/supabase'; // Adjust path as needed

// Helper to extract file path from Supabase URL
// This is a common pattern, but might need adjustment based on your exact URL structure and bucket
const getPathFromSupabaseUrl = (url: string) => {
    try {
        const urlObj = new URL(url);
        // Example URL: https://<project_ref>.supabase.co/storage/v1/object/public/venue-images/venue_123/image.jpg
        // Path would be: venue-images/venue_123/image.jpg (if venue-images is the bucket)
        // Or if the URL path directly given by Supabase storage is just the path after the bucket:
        const pathSegments = urlObj.pathname.split('/storage/v1/object/public/');
        if (pathSegments.length > 1) {
            // The path will be something like "bucket-name/folder/image.png"
            return pathSegments[1]; 
        }
        console.warn(`Could not extract a standard Supabase storage path from URL: ${url}`);
        // Fallback: try to get the last part of the path if it's a direct file name or object path
        const segments = urlObj.pathname.split('/');
        return segments.slice(segments.indexOf('public') + 1).join('/'); // attempt to get path after /public/

    } catch (error) {
        console.error('Invalid URL for Supabase path extraction:', url, error);
        return null;
    }
};

export async function POST(request: NextRequest) {
    let venueId: string | number;
    let urls: string[];

    try {
        const body = await request.json();
        venueId = body.venueId;
        urls = body.urls;

        if (!venueId || !urls || !Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json({ error: 'Missing venueId or URLs, or URLs is not an array or is empty.' }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const errors: { url: string; message: string }[] = [];
    const successes: { url: string; message: string }[] = [];

    for (const url of urls) {
        const filePath = getPathFromSupabaseUrl(url);
        if (!filePath) {
            errors.push({ url, message: 'Could not determine file path from URL.' });
            continue;
        }

        try {
            // 1. Delete from Supabase Storage
            // Assumes the filePath includes the bucket name as the first segment if your `getPathFromSupabaseUrl` returns that.
            // Or, if filePath is just the path within the bucket, specify bucket explicitly.
            // Let's assume filePath is like "bucket-name/actual/path/to/image.jpg"
            const bucketAndPath = filePath.split('/');
            const bucketName = bucketAndPath.shift(); // First part is bucket name
            const actualPath = bucketAndPath.join('/');

            if(!bucketName || !actualPath) {
                errors.push({ url, message: `Invalid file path structure: ${filePath}` });
                continue;
            }

            const { error: storageError } = await supabase.storage
                .from(bucketName) // e.g., 'venue-images'
                .remove([actualPath]);

            if (storageError) {
                console.error(`Supabase storage deletion error for ${actualPath} in bucket ${bucketName}:`, storageError);
                // Don't stop, try to delete from DB anyway, or collect error
                errors.push({ url, message: `Storage deletion failed: ${storageError.message}` });
                // Optionally, you might decide to not proceed with DB deletion if storage deletion fails
            }

            // 2. Delete from your database table (e.g., 'venue_images')
            // This assumes you store the full URL or a path that can be matched.
            // If you store the full URL, match against that.
            const { error: dbError } = await supabase
                .from('venue_images') // Your table linking images to venues
                .delete()
                .eq('venue_id', venueId)
                .eq('image_url', url); // Assuming you store the full URL in this column

            if (dbError) {
                console.error(`Supabase DB deletion error for image URL ${url} and venue ${venueId}:`, dbError);
                errors.push({ url, message: `Database record deletion failed: ${dbError.message}` });
            } else {
                if (!storageError) { // Only count as full success if both storage and DB are fine
                    successes.push({ url, message: 'Successfully deleted' });
                }
            }

        } catch (error: unknown) {
            console.error(`Unexpected error deleting image ${url}:`, error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            errors.push({ url, message: `Unexpected error: ${message}` });
        }
    }

    if (errors.length > 0 && successes.length === 0) {
        return NextResponse.json({ 
            error: 'Failed to delete one or more images.',
            details: errors 
        }, { status: 500 });
    }
    
    if (errors.length > 0) {
        return NextResponse.json({ 
            message: 'Some images deleted successfully, but some failures occurred.',
            successes,
            errors 
        }, { status: 207 }); // Multi-Status
    }

    return NextResponse.json({ message: 'All specified images deleted successfully.', successes }, { status: 200 });
} 
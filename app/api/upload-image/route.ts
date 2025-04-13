import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const venueId = formData.get('venueId') as string;
        const sortOrderStr = formData.get('sortOrder') as string;
        
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        
        if (!venueId) {
            return NextResponse.json({ error: 'No venue ID provided' }, { status: 400 });
        }
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json({ 
                error: 'Invalid file type. Only JPG, PNG, and WebP images are allowed' 
            }, { status: 400 });
        }
        
        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json({ 
                error: 'File too large. Maximum size is 5MB' 
            }, { status: 400 });
        }
        
        // Generate a unique filename
        const uniqueId = uuidv4();
        const fileName = `${venueId}/${uniqueId}-${file.name.replace(/\s+/g, '_')}`;
        
        // Get file bytes
        const fileBuffer = await file.arrayBuffer();
        
        // Upload file to Supabase
        const { data, error } = await supabaseAdmin.storage
            .from('venue-images')
            .upload(fileName, fileBuffer, {
                contentType: file.type,
                upsert: true,
            });
            
        if (error) {
            if (error.message.includes('bucket') || error.message.includes('row-level security policy')) {
                console.error('Storage bucket error:', error);
                return NextResponse.json({ 
                    error: 'Storage bucket configuration error. Please make sure the "venue-images" bucket exists and has proper permissions.',
                    details: error.message
                }, { status: 500 });
            }
            
            console.error('Error uploading file:', error);
            return NextResponse.json({ error: `Failed to upload: ${error.message}` }, { status: 500 });
        }
        
        // Get the public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('venue-images')
            .getPublicUrl(fileName);
            
        // Determine sort order - default to 1 if not provided
        const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 1;
        
        // Store image info in venue_images table
        const { error: insertError } = await supabaseAdmin
            .from('venue_images')
            .insert({
                venue_id: parseInt(venueId),
                image_url: publicUrl,
                sort_order: sortOrder
            });
            
        if (insertError) {
            console.error('Error inserting image record:', insertError);
            
            if (insertError.message.includes('row-level security policy')) {
                return NextResponse.json({ 
                    error: 'Database permission error. Please check RLS policies for venue_images table.',
                    url: publicUrl,
                    details: insertError.message
                }, { status: 500 });
            }
            
            return NextResponse.json({ 
                error: `File uploaded but failed to save record: ${insertError.message}`,
                url: publicUrl 
            }, { status: 207 }); // Partial success
        }
        
        return NextResponse.json({ 
            success: true, 
            url: publicUrl 
        }, { status: 200 });
        
    } catch (error: unknown) {
        console.error('Upload error:', error);
        let errorMessage = 'An unexpected error occurred';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
} 
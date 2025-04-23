import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

type AttachmentType = 'image' | 'video' | 'document' | 'audio' | 'other';

interface UploadResult {
  url: string;
  path: string;
  attachment_type: AttachmentType;
}

/**
 * Uploads a file to the chat-attachments bucket and returns a signed URL
 * @param file The file to upload
 * @param userId The user ID of the uploader
 * @returns Object containing the signed URL, file path, and attachment type
 */
export async function uploadChatAttachment(
  file: File,
  userId: string
): Promise<UploadResult> {
  // Determine attachment type based on MIME type
  const attachment_type = getAttachmentType(file.type);

  // Generate timestamp for unique filename
  const timestamp = Date.now();
  const uniqueId = uuidv4();
  const fileName = `${userId}/${timestamp}-${uniqueId}-${file.name.replace(/\s+/g, '_')}`;

  // Upload file to Supabase Storage
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Error uploading file: ${error.message}`);
  }

  // Try to get a signed URL (1 hour expiration)
  let url;
  try {
    const { data: urlData, error: urlError } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(data.path, 3600);

    if (urlError) {
      console.error('Signed URL error:', urlError);
      // Fall back to public URL if signed URL fails
      throw urlError;
    }
    
    url = urlData.signedUrl;
  } catch (error) {
    // Fallback to public URL if signed URL creation fails
    console.log('Falling back to public URL');
    const { data: publicUrlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(data.path);
    
    url = publicUrlData.publicUrl;
  }

  return {
    url,
    path: data.path,
    attachment_type,
  };
}

/**
 * Determines the attachment type based on MIME type
 * @param mimeType The MIME type of the file
 * @returns The attachment type
 */
function getAttachmentType(mimeType: string): AttachmentType {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType.startsWith('video/')) {
    return 'video';
  } else if (mimeType.startsWith('audio/')) {
    return 'audio';
  } else if (
    mimeType === 'application/pdf' ||
    mimeType.includes('document') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  ) {
    return 'document';
  } else {
    return 'other';
  }
} 
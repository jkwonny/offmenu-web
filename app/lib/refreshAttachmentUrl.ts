import { supabase } from './supabase';

interface RefreshResult {
  url: string;
  success: boolean;
}

/**
 * Refreshes an expired attachment URL by generating a new signed URL
 * @param path The storage path of the attachment
 * @returns Object containing the new signed URL and success status
 */
export async function refreshAttachmentUrl(path: string): Promise<RefreshResult> {
  try {
    // Extract the actual path from the URL if needed
    let storagePath = path;
    
    // If the path is a full URL, extract just the path portion
    if (path.includes('chat-attachments/')) {
      const pathParts = path.split('chat-attachments/');
      if (pathParts.length > 1) {
        storagePath = pathParts[1].split('?')[0]; // Remove any query parameters
      }
    }
    
    // Create a new signed URL with 24 hour expiration
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(storagePath, 86400);
    
    if (error) {
      console.error('Error refreshing signed URL:', error);
      throw error;
    }
    
    return {
      url: data.signedUrl,
      success: true
    };
  } catch (error) {
    console.error('Failed to refresh attachment URL:', error);
    
    // Fallback to public URL if signed URL creation fails
    try {
      const { data } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(path);
      
      return {
        url: data.publicUrl,
        success: true
      };
    } catch (fallbackError) {
      console.error('Fallback to public URL also failed:', fallbackError);
      return {
        url: '',
        success: false
      };
    }
  }
} 
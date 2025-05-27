import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role to bypass RLS policies (only for server operations)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { room_id, sender_id, content, attachment_url, attachment_type } = await request.json();
    // Validate required fields
    if (!room_id || !sender_id) {
      return NextResponse.json(
        { error: 'Room ID and sender ID are required' },
        { status: 400 }
      );
    }

    // Either content or attachment must be provided
    if (!content && !attachment_url) {
      return NextResponse.json(
        { error: 'Message must contain either text content or an attachment' },
        { status: 400 }
      );
    }

    // Validate attachment_type based on database constraint
    let finalAttachmentType = null;
    let finalAttachmentUrl = null;
    
    if (attachment_url) {
      finalAttachmentUrl = attachment_url;
      
      // Ensure attachment_type is valid
      if (attachment_type === "image" || attachment_type === "video" || attachment_type === "document") {
        finalAttachmentType = attachment_type;
      } else {
        // Default to "document" if not specified or invalid
        finalAttachmentType = "document";
      }
    }

    // Check if the chat room exists and the user is a participant
    const { data: chatRoom, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .select(`
        id, 
        sender_id,
        recipient_id
      `)
      .eq('id', room_id)
      .single();

    if (roomError) {
      console.error('Error fetching chat room:', roomError);
      return NextResponse.json(
        { error: 'Chat room not found' },
        { status: 404 }
      );
    }
    
    // Verify user is a participant - now using direct fields from chat_rooms
    const participants = [chatRoom.sender_id, chatRoom.recipient_id].filter(Boolean);

    if (participants.length === 0) {
      return NextResponse.json(
        { error: 'Failed to extract participant information' },
        { status: 500 }
      );
    }
    
    if (!participants.includes(sender_id)) {
      return NextResponse.json(
        { error: 'User is not a participant in this chat room' },
        { status: 403 }
      );
    }

    // Insert message
    const { data: message, error: insertError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        room_id,
        sender_id,
        content,
        attachment_url: finalAttachmentUrl,
        attachment_type: finalAttachmentType
      })
      .select('id, content, sender_id, created_at, attachment_url, attachment_type')
      .single();

    if (insertError) {
      console.error('Error sending message:', insertError);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message_id: message.id,
      timestamp: message.created_at
    });

  } catch (error) {
    console.error('Unexpected error in send message API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 
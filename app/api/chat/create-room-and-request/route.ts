import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/app/lib/email';
import { getChatMessageRequestTemplate } from '@/app/lib/emailTemplates';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role to bypass RLS policies (only for server operations)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const {  
      venue_id, 
      sender_id, 
      recipient_id, 
      message, 
      event_date, 
      venue_name, 
      collaboration_types, 
      popup_name, 
      selected_date, 
      selected_time, 
      requirements, 
      instagram_handle, 
      website, 
      guest_count,
      services
    } = await request.json();

    // Validate required fields
    if (!venue_id || !sender_id || !recipient_id || !event_date || !venue_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if a chat room already exists between these users for this venue
    const { data: existingRoom, error: roomCheckError } = await supabaseAdmin
      .from('chat_rooms')
      .select('id')
      .eq('venue_id', venue_id)
      .eq('sender_id', sender_id)
      .eq('recipient_id', recipient_id)
      .single();

    if (roomCheckError && roomCheckError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected when no room exists
      console.error('Error checking for existing chat room:', roomCheckError);
      return NextResponse.json(
        { error: 'Failed to check for existing chat room' },
        { status: 500 }
      );
    }

    let roomId: string;
    let isNewRoom = false;

    if (existingRoom) {
      // Use existing room
      roomId = existingRoom.id;
    } else {
      // Create new chat room immediately
      const { data: newRoom, error: roomError } = await supabaseAdmin
        .from('chat_rooms')
        .insert({
          venue_id,
          venue_name,
          event_date,
          sender_id,
          recipient_id,
          popup_name,
          requirements,
          instagram_handle,
          website,
          guest_count,
          collaboration_types,
          services
        })
        .select('id')
        .single();

      if (roomError) {
        console.error('Error creating chat room:', roomError);
        return NextResponse.json(
          { error: 'Failed to create chat room' },
          { status: 500 }
        );
      }

      roomId = newRoom.id;
      isNewRoom = true;
    }

    // Create booking request (separate from chat room)
    const { data: bookingRequest, error: requestError } = await supabaseAdmin
      .from('booking_requests')
      .insert({
        venue_name,
        venue_id,
        sender_id,
        recipient_id,
        message,
        event_date,
        status: 'pending',
        collaboration_types,
        popup_name,
        selected_date,
        selected_time,
        requirements,
        instagram_handle,
        website,
        guest_count,
        room_id: roomId, // Link to the chat room
        services
      })
      .select('id')
      .single();

    if (requestError) {
      console.error('Error creating booking request:', requestError);
      return NextResponse.json(
        { error: 'Failed to create booking request' },
        { status: 500 }
      );
    }

    // Send initial message to the chat room
    if (message && message.trim()) {
      const { error: messageError } = await supabaseAdmin
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id,
          content: message
        });

      if (messageError) {
        console.error('Error sending initial message:', messageError);
        // Don't fail the entire request if message fails
      }
    }

    // Send email notification to venue manager for new chat requests
    if (isNewRoom) {
      try {
        // Fetch sender and recipient information for the email
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, name, email')
          .in('id', [sender_id, recipient_id]);

        if (!userError && userData && userData.length >= 2) {
          const sender = userData.find(u => u.id === sender_id);
          const recipient = userData.find(u => u.id === recipient_id);

          if (recipient?.email && sender?.name) {
            const recipientName = recipient.name || 'Venue Manager';
            const senderName = sender.name;
            const chatLink = `https://offmenu.space/chat?chatRoomId=${roomId}`;

            const emailTemplate = getChatMessageRequestTemplate(
              recipientName,
              senderName,
              venue_name,
              chatLink
            );

            await sendEmail({
              to: recipient.email,
              subject: `💬 New chat request from ${senderName} for ${venue_name}`,
              html: emailTemplate
            });
          }
        }
      } catch (emailError) {
        console.error('Error sending chat notification email:', emailError);
        // Don't fail the entire request if email fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      room_id: roomId,
      booking_request_id: bookingRequest.id,
      status: 'pending' 
    });

  } catch (error) {
    console.error('Unexpected error in create room and request API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 
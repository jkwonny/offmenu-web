"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import NavBar from '../components/NavBar';

interface ChatRoom {
    id: string;
    created_at: string;
    venue_id: number;
    event_id: string;
    venue: {
        name: string;
    };
    event: {
        title: string;
    };
    latest_message?: {
        content: string;
        created_at: string;
        sender: {
            name: string;
        };
    };
}

interface ChatRequest {
    id: string;
    created_at: string;
    message: string;
    status: string;
    venue_id: number;
    event_id: string;
    venue_name: string;
    event_title: string;
    sender_name: string;
    recipient_name: string;
    sender_id: string;
    recipient_id: string;
}

export default function ChatHomePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [pendingChats, setPendingChats] = useState<ChatRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        async function fetchUserAndChats() {
            try {
                // Get current authenticated user
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                if (!user) {
                    setLoading(false);
                    return;
                }

                // Fetch chat rooms where the user is a participant
                // First, get rooms where user is the sender
                const { data: senderRooms, error: senderError } = await supabase
                    .from('chat_rooms')
                    .select(`
            id, 
            created_at, 
            venue_id, 
            event_id,
            venue:venues(name),
            event:events(title),
            chat_request:chat_requests!inner(sender_id, recipient_id)
          `)
                    .eq('chat_request.sender_id', user.id);

                if (senderError) throw senderError;

                // Then, get rooms where user is the recipient
                const { data: recipientRooms, error: recipientError } = await supabase
                    .from('chat_rooms')
                    .select(`
            id, 
            created_at, 
            venue_id, 
            event_id,
            venue:venues(name),
            event:events(title),
            chat_request:chat_requests!inner(sender_id, recipient_id)
          `)
                    .eq('chat_request.recipient_id', user.id);

                if (recipientError) throw recipientError;

                // Combine the results
                const combinedRooms = [...(senderRooms || []), ...(recipientRooms || [])];

                // Sort by created_at
                const sortedRooms = combinedRooms.sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );

                // Remove duplicates based on room id
                const uniqueRoomIds = new Set();
                const rooms = sortedRooms.filter(room => {
                    if (uniqueRoomIds.has(room.id)) {
                        return false;
                    }
                    uniqueRoomIds.add(room.id);
                    return true;
                });

                // Fetch the latest message for each room
                const roomsWithMessages = await Promise.all(
                    rooms.map(async (room: any) => {
                        const { data: messages } = await supabase
                            .from('chat_messages')
                            .select(`
                content, 
                created_at,
                sender:users!sender_id(name)
              `)
                            .eq('room_id', room.id)
                            .order('created_at', { ascending: false })
                            .limit(1);

                        const latestMessage = messages && messages.length > 0
                            ? {
                                content: messages[0].content,
                                created_at: messages[0].created_at,
                                sender: {
                                    name: (() => {
                                        const sender = messages[0].sender;
                                        if (!sender) return 'Unknown';

                                        // Use type assertion
                                        const senderData = Array.isArray(sender)
                                            ? (sender as any[])[0]
                                            : sender as any;

                                        return senderData?.name || 'Unknown';
                                    })()
                                }
                            }
                            : undefined;

                        // Transform the data to match the ChatRoom interface
                        const chatRoom: ChatRoom = {
                            id: room.id,
                            created_at: room.created_at,
                            venue_id: room.venue_id,
                            event_id: room.event_id,
                            venue: {
                                name: room.venue ? room.venue.name : 'Unknown Venue'
                            },
                            event: {
                                title: room.event ? room.event.title : 'Unknown Event'
                            },
                            latest_message: latestMessage
                        };

                        return chatRoom;
                    })
                );

                // Fetch pending chat requests
                const { data: pendingRequests, error: pendingError } = await supabase
                    .from('chat_requests')
                    .select(`
                        id,
                        created_at,
                        message,
                        status,
                        venue_id,
                        event_id,
                        sender_id,
                        recipient_id,
                        venue:venues(name),
                        event:events(title),
                        sender:users!sender_id(name),
                        recipient:users!recipient_id(name)
                    `)
                    .eq('status', 'pending')
                    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

                if (pendingError) throw pendingError;

                // Process pending chat requests with proper type handling
                const formattedPendingRequests = (pendingRequests || []).map((req: any) => ({
                    id: req.id,
                    created_at: req.created_at,
                    message: req.message,
                    status: req.status,
                    venue_id: req.venue_id,
                    event_id: req.event_id,
                    sender_id: req.sender_id,
                    recipient_id: req.recipient_id,
                    venue_name: req.venue ? req.venue.name : 'Unknown Venue',
                    event_title: req.event ? req.event.title : 'Unknown Event',
                    sender_name: req.sender ? req.sender.name : 'Unknown',
                    recipient_name: req.recipient ? req.recipient.name : 'Unknown'
                }));

                setPendingChats(formattedPendingRequests);

                setChatRooms(roomsWithMessages);
            } catch (err: any) {
                setError(err.message || 'Failed to load chat rooms');
                console.error('Error fetching chat rooms:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchUserAndChats();
    }, []);

    const handleAcceptRequest = async (requestId: string) => {
        setActionLoading(requestId);
        try {
            // Update request status to approved
            const { error: updateError } = await supabase
                .from('chat_requests')
                .update({ status: 'approved' })
                .eq('id', requestId);

            if (updateError) throw updateError;

            // Get the request details to create a chat room
            const { data: requestData, error: fetchError } = await supabase
                .from('chat_requests')
                .select('event_id, venue_id, sender_id, message')
                .eq('id', requestId)
                .single();

            if (fetchError) throw fetchError;

            // Create a new chat room
            const { data: roomData, error: roomError } = await supabase
                .from('chat_rooms')
                .insert({
                    request_id: requestId,
                    event_id: requestData.event_id,
                    venue_id: requestData.venue_id
                })
                .select('id')
                .single();

            if (roomError) throw roomError;

            // Add the initial message from the request to the chat_messages
            const { error: messageError } = await supabase
                .from('chat_messages')
                .insert({
                    room_id: roomData.id,
                    sender_id: requestData.sender_id,
                    content: requestData.message
                });

            if (messageError) throw messageError;

            // Update the local state to remove the accepted request
            setPendingChats(prev => prev.filter(chat => chat.id !== requestId));

            // Refresh the chat rooms list
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Failed to accept request');
            console.error('Error accepting chat request:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        setActionLoading(requestId);
        try {
            const { error } = await supabase
                .from('chat_requests')
                .update({ status: 'rejected' })
                .eq('id', requestId);

            if (error) throw error;

            // Update the local state to remove the rejected request
            setPendingChats(prev => prev.filter(chat => chat.id !== requestId));
        } catch (err: any) {
            setError(err.message || 'Failed to reject request');
            console.error('Error rejecting chat request:', err);
        } finally {
            setActionLoading(null);
        }
    };

    if (!user && !loading) {
        return (
            <div className="min-h-screen bg-[#FFF9F5]">
                <NavBar />
                <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 text-center">
                    <h1 className="text-2xl font-bold mb-6">Your Conversations</h1>
                    <p>Please sign in to view your conversations.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FFF9F5]">
            <NavBar />
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
                <h1 className="text-2xl font-bold mb-6">Your Conversations</h1>

                {loading ? (
                    <div className="text-center py-10">Loading your conversations...</div>
                ) : error ? (
                    <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">{error}</div>
                ) : null}

                {pendingChats.length > 0 && (
                    <>
                        <h2 className="text-xl font-bold mb-4">Pending Requests</h2>
                        <div className="space-y-4 mb-6">
                            {pendingChats.map((request) => (
                                <div key={request.id} className="block bg-gray-50 rounded-lg shadow-md p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="font-semibold">{request.venue_name}</h2>
                                            <p className="text-sm text-gray-600">
                                                Event: {request.event_title}
                                            </p>
                                            <p className="text-sm mt-2">
                                                {request.sender_id === user.id
                                                    ? `To: ${request.recipient_name}`
                                                    : `From: ${request.sender_name}`}
                                            </p>
                                            <p className="text-sm italic mt-1">{request.message}</p>
                                        </div>
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                            Pending
                                        </span>
                                    </div>

                                    {request.recipient_id === user.id && (
                                        <div className="mt-3 flex space-x-2">
                                            <button
                                                onClick={() => handleAcceptRequest(request.id)}
                                                disabled={actionLoading === request.id}
                                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                                            >
                                                {actionLoading === request.id ? 'Processing...' : 'Accept'}
                                            </button>
                                            <button
                                                onClick={() => handleRejectRequest(request.id)}
                                                disabled={actionLoading === request.id}
                                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                                            >
                                                {actionLoading === request.id ? 'Processing...' : 'Reject'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <h2 className="text-xl font-bold mb-4">Active Conversations</h2>
                {chatRooms.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-6 text-center">
                        <p className="mb-4">You don&apos;t have any active conversations.</p>
                        <Link href="/explore" className="text-amber-600 hover:text-amber-700">
                            Explore venues to start a conversation
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {chatRooms.map((room) => (
                            <Link
                                key={room.id}
                                href={`/chat/${room.id}`}
                                className="block bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="font-semibold">{room.venue?.name || 'Unknown Venue'}</h2>
                                        <p className="text-sm text-gray-600">
                                            Event: {room.event?.title || 'Not specified'}
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {format(new Date(room.created_at), 'MMM d, yyyy')}
                                    </span>
                                </div>

                                {room.latest_message && (
                                    <div className="mt-2 pt-2 border-t">
                                        <p className="text-sm font-medium">{room.latest_message.sender?.name || 'Unknown'}:</p>
                                        <p className="text-sm text-gray-700 truncate">{room.latest_message.content}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {format(new Date(room.latest_message.created_at), 'h:mm a')}
                                        </p>
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
} 
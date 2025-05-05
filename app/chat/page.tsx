"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import NavBar from '../components/NavBar';

interface User {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    role?: string;
}

interface ChatRoom {
    id: string;
    created_at: string;
    venue_id: number;
    venue_name?: string;
    event_date?: string;
    request_id?: string;
    venue: {
        name: string;
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
    venue_name: string;
    event_date: string;
    sender_id: string;
    recipient_id: string;
    sender_name: string;
    recipient_name: string;
    room_id?: string;
}

// Type for raw response from Supabase
interface SupabaseRequestResponse {
    id: string;
    created_at: string;
    message: string;
    status: string;
    venue_id: number;
    venue_name?: string;
    event_date?: string;
    sender_id: string;
    recipient_id: string;
    sender: unknown;
    recipient: unknown;
}

export default function ChatHomePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [allVenueRequests, setAllVenueRequests] = useState<ChatRequest[]>([]);
    const [ownedVenues, setOwnedVenues] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Add this helper function for fetching chat rooms
    const fetchChatRooms = async (userId: string | undefined) => {
        if (!userId) return;

        try {
            // Fetch chat rooms where the user is a participant
            // First, get rooms where user is the sender
            const { data: senderRooms, error: senderError } = await supabase
                .from('chat_rooms')
                .select(`
                    id, 
                    created_at, 
                    venue_id, 
                    venue_name,
                    event_date,
                    request_id,
                    venue:venues(name),
                    chat_request:chat_requests!inner(sender_id, recipient_id, status)
                `)
                .eq('chat_request.sender_id', userId);

            if (senderError) throw senderError;

            // Then, get rooms where user is the recipient
            const { data: recipientRooms, error: recipientError } = await supabase
                .from('chat_rooms')
                .select(`
                    id, 
                    created_at, 
                    venue_id,
                    venue_name,
                    event_date,
                    request_id,
                    venue:venues(name),
                    chat_request:chat_requests!inner(sender_id, recipient_id, status)
                `)
                .eq('chat_request.recipient_id', userId);

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
                rooms.map(async (room) => {
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
                                        ? (sender as { name?: string }[])[0]
                                        : sender as { name?: string };

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
                        venue_name: room.venue_name,
                        event_date: room.event_date,
                        request_id: room.request_id,
                        venue: {
                            name: room.venue && Array.isArray(room.venue) && room.venue[0]?.name ? room.venue[0].name : 'Unknown Venue'
                        },
                        latest_message: latestMessage
                    };

                    return chatRoom;
                })
            );

            setChatRooms(roomsWithMessages);

        } catch (err) {
            console.error('Error fetching chat rooms:', err);
        }
    };

    useEffect(() => {
        async function fetchUserAndChats() {
            try {
                // Get current authenticated user
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user as User);

                if (!user) {
                    setLoading(false);
                    return;
                }

                // Fetch venues owned by the user
                const { data: userVenues, error: venueError } = await supabase
                    .from('venues')
                    .select('id')
                    .eq('owner_id', user.id);

                if (venueError) throw venueError;

                // Store venue IDs owned by this user
                const venueIds = userVenues?.map(venue => venue.id) || [];
                setOwnedVenues(venueIds);

                // Fetch chat requests for venues owned by this user
                if (venueIds.length > 0) {
                    const { data: venueRequests, error: requestsError } = await supabase
                        .from('chat_requests')
                        .select(`
                            id,
                            created_at,
                            message,
                            status,
                            venue_id,
                            venue_name,
                            event_date,
                            sender_id,
                            recipient_id,
                            sender:users!sender_id(name),
                            recipient:users!recipient_id(name)
                        `)
                        .in('venue_id', venueIds);

                    if (requestsError) throw requestsError;

                    // Process all venue chat requests
                    const formattedVenueRequests = ((venueRequests || []) as unknown as SupabaseRequestResponse[]).map((req) => {
                        // Extract sender and recipient names safely
                        let senderName = 'Unknown';
                        let recipientName = 'Unknown';

                        if (req.sender) {
                            const sender = req.sender as { name?: string };
                            senderName = typeof sender.name === 'string' ? sender.name : 'Unknown';
                        }

                        if (req.recipient) {
                            const recipient = req.recipient as { name?: string };
                            recipientName = typeof recipient.name === 'string' ? recipient.name : 'Unknown';
                        }

                        return {
                            id: req.id,
                            created_at: req.created_at,
                            message: req.message,
                            status: req.status,
                            venue_id: req.venue_id,
                            venue_name: req.venue_name || 'Unknown Venue',
                            event_date: req.event_date || '',
                            sender_id: req.sender_id,
                            recipient_id: req.recipient_id,
                            sender_name: senderName,
                            recipient_name: recipientName
                        };
                    });

                    setAllVenueRequests(formattedVenueRequests);
                }

                // Fetch chat rooms where the user is a participant
                await fetchChatRooms(user?.id);

                // Fetch pending chat requests for the user (not venue related)
                const { data: pendingRequests, error: pendingError } = await supabase
                    .from('chat_requests')
                    .select(`
                        id,
                        created_at,
                        message,
                        status,
                        venue_id,
                        venue_name,
                        event_date,
                        sender_id,
                        recipient_id,
                        sender:users!sender_id(name),
                        recipient:users!recipient_id(name)
                    `)
                    .eq('status', 'pending')
                    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

                if (pendingError) throw pendingError;

                // Process pending chat requests, but not storing the result since it's unused
                ((pendingRequests || []) as unknown as SupabaseRequestResponse[]).map((req) => {
                    // Extract sender and recipient names safely
                    let senderName = 'Unknown';
                    let recipientName = 'Unknown';

                    if (req.sender) {
                        const sender = req.sender as { name?: string };
                        senderName = typeof sender.name === 'string' ? sender.name : 'Unknown';
                    }

                    if (req.recipient) {
                        const recipient = req.recipient as { name?: string };
                        recipientName = typeof recipient.name === 'string' ? recipient.name : 'Unknown';
                    }

                    return {
                        id: req.id,
                        created_at: req.created_at,
                        message: req.message,
                        status: req.status,
                        venue_id: req.venue_id,
                        venue_name: req.venue_name || 'Unknown Venue',
                        event_date: req.event_date || '',
                        sender_id: req.sender_id,
                        recipient_id: req.recipient_id,
                        sender_name: senderName,
                        recipient_name: recipientName
                    };
                });

                // Create a mapping of request_id to room_id for later use
                const requestToRoomMap: Record<string, string> = {};
                chatRooms.forEach(room => {
                    if (room.request_id) {
                        requestToRoomMap[room.request_id] = room.id;
                    }
                });

                // If we have venue requests, check if any approved ones have corresponding room IDs
                if (allVenueRequests.length > 0) {
                    setAllVenueRequests(prev => prev.map(request => {
                        if (request.status === 'approved' && requestToRoomMap[request.id]) {
                            return { ...request, room_id: requestToRoomMap[request.id] };
                        }
                        return request;
                    }));
                }
            } catch (err: Error | unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load chat rooms';
                setError(errorMessage);
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
                .select('venue_id, venue_name, event_date, sender_id, message, collaboration_types, popup_name, selected_date, selected_time')
                .eq('id', requestId)
                .single();

            if (fetchError) throw fetchError;

            // Create a new chat room
            const { data: roomData, error: roomError } = await supabase
                .from('chat_rooms')
                .insert({
                    request_id: requestId,
                    venue_id: requestData.venue_id,
                    venue_name: requestData.venue_name,
                    event_date: requestData.event_date,
                    collaboration_types: requestData.collaboration_types,
                    popup_name: requestData.popup_name,
                    selected_date: requestData.selected_date,
                    selected_time: requestData.selected_time
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

            // Update the status in allVenueRequests if this request is in that list
            setAllVenueRequests(prev =>
                prev.map(request =>
                    request.id === requestId
                        ? { ...request, status: 'approved', room_id: roomData.id }
                        : request
                )
            );

            // Refetch chat rooms to update the list
            await fetchChatRooms(user?.id);

            // Refresh the page
            router.refresh();
        } catch (err: Error | unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to accept request';
            setError(errorMessage);
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
            // Update the status in allVenueRequests if this request is in that list
            setAllVenueRequests(prev =>
                prev.map(request =>
                    request.id === requestId
                        ? { ...request, status: 'rejected' }
                        : request
                )
            );
        } catch (err: Error | unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to reject request';
            setError(errorMessage);
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
                {loading ? (
                    <div className="text-center py-10">Loading your conversations...</div>
                ) : error ? (
                    <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">{error}</div>
                ) : null}
                {/* Section for all venue requests (for venue owners) */}
                {allVenueRequests.filter(request => request.status === 'pending').length > 0 && (
                    <>
                        <h2 className="text-xl font-bold mb-4">Pending Chat Requests</h2>
                        <div className="space-y-4 mb-6">
                            {allVenueRequests.filter(request => request.status === 'pending').map((request) => (
                                <div key={request.id} className="block bg-gray-50 rounded-lg shadow-md p-4">
                                    {request.status === 'approved' ? (
                                        <Link href={`/chat/${request.room_id || ''}`} className="block">
                                            <div className="flex justify-between items-start hover:bg-gray-100 transition-colors rounded-md p-2">
                                                <div>
                                                    <h2 className="font-semibold">{request.venue_name}</h2>
                                                    {request.event_date && (
                                                        <p className="text-sm text-gray-600">
                                                            Event date: {format(new Date(request.event_date), 'MMM d, yyyy')}
                                                        </p>
                                                    )}
                                                    <p className="text-sm mt-2">
                                                        From: {request.sender_name}
                                                    </p>
                                                    <p className="text-sm italic mt-1">{request.message}</p>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                                                        Approved
                                                    </span>
                                                    <span className="text-xs text-amber-600 mt-2">Click to chat</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h2 className="font-semibold">{request.venue_name}</h2>
                                                {request.event_date && (
                                                    <p className="text-sm text-gray-600">
                                                        Event date: {format(new Date(request.event_date), 'MMM d, yyyy')}
                                                    </p>
                                                )}
                                                <p className="text-sm mt-2">
                                                    From: {request.sender_name}
                                                </p>
                                                <p className="text-sm italic mt-1">{request.message}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded ${request.status === 'pending'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                            </span>
                                        </div>
                                    )}

                                    {request.status === 'pending' && ownedVenues.includes(request.venue_id) && (
                                        <div className="mt-3 flex space-x-2">
                                            <button
                                                onClick={() => handleAcceptRequest(request.id)}
                                                disabled={actionLoading === request.id}
                                                className="px-3 cursor-pointer py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                                            >
                                                {actionLoading === request.id ? 'Processing...' : 'Accept'}
                                            </button>
                                            <button
                                                onClick={() => handleRejectRequest(request.id)}
                                                disabled={actionLoading === request.id}
                                                className="px-3 cursor-pointer py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
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
                                        <h2 className="font-semibold">{room.venue_name || 'Unknown Venue'}</h2>
                                        <p className="text-sm text-gray-600">
                                            {room.event_date ? `Event date: ${format(new Date(room.event_date), 'MMM d, yyyy')}` : 'No event date specified'}
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {format(new Date(room.created_at), 'MMM d, yyyy')}
                                    </span>
                                </div>

                                {room.latest_message && (
                                    <div className="mt-2 pt-2 border-t">
                                        <span className="text-sm font-medium">{room.latest_message.sender?.name || 'Unknown'}: </span>
                                        <span className="text-sm text-gray-700 truncate">{room.latest_message.content}</span>
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
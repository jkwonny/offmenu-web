"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { format } from 'date-fns';
import NavBar from '@/app/components/NavBar';

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

interface ChatMessage {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    sender_name: string;

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

// Define VenueImage interface
interface VenueImage {
    image_url: string;
    sort_order?: number;
}

// Update Venue interface to include properly typed venue_images
interface Venue {
    id: number;
    name: string;
    address?: string;
    description?: string;
    neighborhood?: string;
    image_url?: string;
    venue_images?: VenueImage[];
}

// Create a separate component that uses useSearchParams
function ChatContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<User | null>(null);
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [allVenueRequests, setAllVenueRequests] = useState<ChatRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
    const [loadingRoom, setLoadingRoom] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [selectedSpace, setSelectedSpace] = useState<Venue | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    console.log('chatMEssages', chatMessages)
    // Helper function to scroll to bottom
    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            const element = messagesContainerRef.current;
            element.scrollTop = element.scrollHeight;
        }
    };

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

    useEffect(() => {
        // Get the chatRoomId from URL query params
        const chatRoomId = searchParams.get('chatRoomId');

        if (chatRoomId && chatRooms.length > 0) {
            loadChatRoom(chatRoomId);
        } else if (!chatRoomId && chatRooms.length > 0) {
            // Optionally set the first room as default if no ID is specified
            // router.push(`/chat/chat?chatRoomId=${chatRooms[0].id}`);
        }
    }, [searchParams, chatRooms]);

    const loadChatRoom = async (roomId: string) => {
        setLoadingRoom(true);
        try {
            // Find the room in our local state first
            const room = chatRooms.find(r => r.id === roomId);

            if (room) {
                setSelectedRoom(room);

                // Fetch messages for this room
                const { data: messages, error: messagesError } = await supabase
                    .from('chat_messages')
                    .select(`
                        id,
                        content,
                        created_at,
                        sender_id,
                        sender:users!sender_id(name)
                    `)
                    .eq('room_id', roomId)
                    .order('created_at', { ascending: true });

                if (messagesError) throw messagesError;

                // Process messages as needed
                const processedMessages = messages?.map(msg => ({
                    id: msg.id,
                    content: msg.content,
                    created_at: msg.created_at,
                    sender_id: msg.sender_id,
                    sender_name: msg.sender && typeof msg.sender === 'object'
                        ? (Array.isArray(msg.sender)
                            ? (msg.sender[0] as { name?: string })?.name || 'Unknown'
                            : (msg.sender as { name?: string })?.name || 'Unknown')
                        : 'Unknown'
                })) || [];

                setChatMessages(processedMessages);

                // Fetch venue details
                const { data: venueData, error } = await supabase
                    .from('venues')
                    .select(`
                        *,
                        venue_images(image_url, sort_order)
                    `)
                    .eq('id', room.venue_id)
                    .single();
                if (!error && venueData) {
                    // Process venue data to include venue_images properly
                    const processedVenueData = {
                        ...venueData,
                        venue_images: venueData.venue_images || []
                    };
                    setSelectedSpace(processedVenueData);
                }
            }
        } catch (err) {
            console.error('Error loading chat room:', err);
            setError('Failed to load chat room');
        } finally {
            setLoadingRoom(false);
            // Scroll to bottom after loading finishes
            setTimeout(scrollToBottom, 100);
        }
    };

    const handleChatRoomClick = (roomId: string) => {
        // Update URL without navigation
        router.push(`/chat?chatRoomId=${roomId}`, { scroll: false });
    };

    // Update the useEffect for scrolling
    useEffect(() => {
        if (chatMessages.length > 0) {
            // First immediate scroll
            scrollToBottom();

            // Then scroll again after a short delay to ensure DOM is updated
            setTimeout(scrollToBottom, 100);
        }
    }, [chatMessages, selectedRoom]);

    if (!user && !loading) {
        return (
            <div className="min-h-screen">
                <NavBar />
                <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 text-center">
                    <h1 className="text-2xl font-bold mb-6">Your Conversations</h1>
                    <p>Please sign in to view your conversations.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen min-w-screen flex flex-col ">
            <div className="fixed bg-white/30 backdrop-blur-md z-10"></div>
            <div className="relative z-12">
                <NavBar />
            </div>

            {error && (
                <div className="z-10 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mx-4 mt-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError('')} className="text-red-700 hover:text-red-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="flex-grow w-full flex px-4 py-6 h-[calc(100vh-64px)] z-10">
                <div className="grid grid-cols-4 gap-4 w-full h-full">
                    {/* Left Sidebar - Messages */}
                    <div className="col-span-1 bg-white rounded-lg shadow-sm p-4 h-full">
                        <div className="flex items-center gap-2">
                            <div className='flex gap-2 items-center'>
                                <h1 className="text-lg font-semibold">Messages</h1>
                                <div className="bg-[#E7E7E7] rounded-full h-6 w-6 text-xs flex items-center justify-center">
                                    {chatRooms.length > 0 ? chatRooms.length : 2}
                                </div>

                            </div>
                        </div>
                        {/* <div className='flex gap-2'>
                            <button className='bg-[#3D3D3D] px-4 py-2 rounded-full'>
                                Users
                            </button>
                            <button className='bg-[#F6F6F6] px-4 py-2 rounded-full'>Group of guests</button>
                        </div> */}

                        <div className="col-span-3 overflow-y-scroll h-full mt-4">
                            {chatRooms.map((room, index) => (
                                <div
                                    key={room.id}
                                    onClick={() => handleChatRoomClick(room.id)}
                                    className={`block p-4 hover:bg-gray-50 cursor-pointer border-b border-[#E7E7E7] ${index === 0 ? 'border-t' : ''} ${searchParams.get('chatRoomId') === room.id ? 'bg-gray-100' : ''}`}
                                >
                                    <div className="flex items-center gap-3 rounded-lg">
                                        <div className="w-10 h-10 bg-amber-100 rounded-full flex-shrink-0 flex items-center justify-center text-amber-600 uppercase">
                                            {room.venue_name ? room.venue_name.charAt(0) : '?'}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <h3 className="font-medium text-gray-900 truncate">{room.venue_name || 'Unknown Venue'}</h3>
                                            <p className="text-sm text-gray-500 truncate">
                                                {room.latest_message
                                                    ? `${room.latest_message.content}`
                                                    : 'No messages yet'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Middle - Chat Area */}
                    <div className="col-span-2 bg-white rounded-lg shadow-sm flex flex-col h-full overflow-scroll">
                        {loadingRoom ? (
                            <div className="flex items-center justify-center h-full">
                                <p>Loading conversation...</p>
                            </div>
                        ) : selectedRoom ? (
                            <>
                                <div className="p-4 border-b border-[#E7E7E7]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 uppercase">
                                            {selectedRoom.venue_name ? selectedRoom.venue_name.charAt(0) : '?'}
                                        </div>
                                        <div>
                                            <h2 className="font-medium">{selectedRoom.venue_name || 'Unknown Venue'}</h2>
                                            <p className="text-sm text-gray-500">
                                                {selectedSpace?.neighborhood}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-y-scroll p-4 space-y-4 flex-grow" ref={messagesContainerRef}>
                                    {chatMessages.length > 0 ? (
                                        chatMessages.map((message) => {
                                            const isCurrentUser = message.sender_id === user?.id;
                                            return (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
                                                >
                                                    {!isCurrentUser && (
                                                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs mr-2">
                                                            {message.sender_name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div className={`max-w-[80%] ${isCurrentUser ? 'bg-[#E2E6F7]' : 'bg-[#EBF1F3] border border-gray-200'} text-gray-800 rounded-lg p-3`}>
                                                        {!isCurrentUser && (
                                                            <p className="font-medium text-xs mb-1">{message.sender_name}</p>
                                                        )}
                                                        <p>{message.content}</p>
                                                        <div className="flex justify-end items-center mt-1 gap-1">
                                                            <span className="text-xs text-gray-500">
                                                                {format(new Date(message.created_at), 'h:mm a')}
                                                            </span>
                                                            {isCurrentUser && (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center text-gray-500 py-10">
                                            No messages yet
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 border-t flex items-center">
                                    <input
                                        type="text"
                                        placeholder="Enter your message here"
                                        className="flex-grow p-3 border rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                    <button className="ml-2 bg-gray-100 p-3 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                        </svg>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-800 mb-2">Select a conversation</h3>
                                <p className="text-gray-500">Choose a chat from the sidebar to start messaging</p>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar - Event Info */}
                    <div className="col-span-1 bg-white rounded-lg shadow-sm overflow-hidden h-full flex flex-col p-2">
                        {selectedSpace?.venue_images && selectedSpace.venue_images.length > 0 ? (
                            <div className="relative w-full h-72">
                                <img
                                    src={selectedSpace.venue_images[0].image_url}
                                    alt={selectedSpace?.name || "Venue"}
                                    className="w-full h-72 object-cover rounded-lg"
                                    onError={(e) => {
                                        e.currentTarget.src = 'https://via.placeholder.com/800x400?text=Venue';
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="w-full h-72 bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500">No image available</span>
                            </div>
                        )}

                        <div className="p-5 flex flex-col gap-2 justify-between h-full">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">{selectedSpace?.name}</h2>

                                <p className="text-gray-600 mb-6">
                                    {selectedSpace?.description}
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-gray-600">{selectedSpace?.address}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-gray-600">{selectedRoom?.event_date}</span>
                                    </div>
                                </div>
                            </div>


                            <div className="mt-8">
                                <h3 className="font-medium text-gray-900 mb-3">Revenue share on ticket sales</h3>
                                <button className="w-full bg-gray-800 text-white py-3 rounded-md hover:bg-gray-700 transition">
                                    View Pop-up
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Main component that wraps the ChatContent in Suspense
export default function ChatHomePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen">
                <NavBar />
                <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                    <p>Loading conversations...</p>
                </div>
            </div>
        }>
            <ChatContent />
        </Suspense>
    );
} 
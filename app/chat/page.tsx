"use client";

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import NavBar from '@/app/components/NavBar';
import { ChatRoom } from '@/app/types/chat';
import { useChatRooms } from '@/app/lib/hooks/useChatRooms';
import {
    useCurrentUser,
    useUserVenues,
    useBookingRequests,
    useChatMessages,
    useVenueDetails
} from '@/app/lib/queries/chat';
import Image from 'next/image';
import Link from 'next/link';
import { CollaborationTypes } from '@/constants/CollaborationTypes';

function ChatContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState('');
    const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
    const [showChatView, setShowChatView] = useState(false); // For mobile view state
    const [waitingForRoom, setWaitingForRoom] = useState(false); // Add state to track if we're waiting for a room to appear
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const currentRoomIdRef = useRef<string | null>(null);
    const roomNotFoundTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // React Query hooks
    const { data: user, isLoading: userLoading, error: userError } = useCurrentUser();
    const { data: userVenues = [], isLoading: venuesLoading } = useUserVenues(user?.id);

    // Extract venue IDs for booking requests
    const venueIds = useMemo(() => userVenues.map((venue: { id: number }) => venue.id), [userVenues]);
    const { isLoading: requestsLoading } = useBookingRequests(venueIds);

    const { rooms: chatRooms, isLoading: chatRoomsLoading, error: chatRoomsError } = useChatRooms(user?.id);

    // Get selected room ID from URL
    const selectedRoomId = searchParams.get('chatRoomId');

    // Fetch messages and venue details for selected room
    const { data: chatMessages = [], isLoading: messagesLoading } = useChatMessages(selectedRoomId || undefined);
    const { data: selectedSpace, isLoading: venueDetailsLoading } = useVenueDetails(selectedRoom?.venue_id);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            const element = messagesContainerRef.current;
            element.scrollTop = element.scrollHeight;
        }
    };

    // Handle errors from React Query
    useEffect(() => {
        if (userError) {
            setError('Failed to load user data');
            console.error('Error from useCurrentUser:', userError);
        } else if (chatRoomsError) {
            setError('Failed to load chat rooms');
            console.error('Error from useChatRooms:', chatRoomsError);
        }
    }, [userError, chatRoomsError]);

    // Update selected room when URL changes
    useEffect(() => {
        const chatRoomId = searchParams.get('chatRoomId');

        if (chatRoomId && chatRooms.length > 0) {
            // Only update the selected room if it's different from the currently loaded one
            if (currentRoomIdRef.current !== chatRoomId) {
                const room = chatRooms.find(r => r.id === chatRoomId);

                if (room) {
                    // Clear any pending timeout and waiting state
                    if (roomNotFoundTimeoutRef.current) {
                        clearTimeout(roomNotFoundTimeoutRef.current);
                        roomNotFoundTimeoutRef.current = null;
                    }
                    setWaitingForRoom(false);
                    setError(''); // Clear any existing errors
                    
                    // Convert to proper ChatRoom type with all required properties
                    const roomData = room as ChatRoom & {
                        event_date?: string;
                        sender_id?: string;
                        recipient_id?: string;
                        popup_name?: string;
                        requirements?: string;
                        special_requests?: string;
                        instagram_handle?: string;
                        website?: string;
                        guest_count?: string;
                        collaboration_types?: string[];
                        request_id?: string;
                        services?: string[];
                    };

                    const typedRoom: ChatRoom = {
                        id: room.id,
                        created_at: room.created_at,
                        venue_id: room.venue_id,
                        venue_name: room.venue_name,
                        event_date: roomData.event_date,
                        sender_id: roomData.sender_id || '',
                        recipient_id: roomData.recipient_id || '',
                        popup_name: roomData.popup_name,
                        requirements: roomData.requirements,
                        special_requests: roomData.special_requests,
                        instagram_handle: roomData.instagram_handle,
                        website: roomData.website,
                        guest_count: roomData.guest_count,
                        collaboration_types: roomData.collaboration_types,
                        request_id: roomData.request_id,
                        venue: room.venue,
                        services: roomData.services,
                        latest_message: room.latest_message ? {
                            content: room.latest_message.content,
                            created_at: room.latest_message.created_at,
                            sender: {
                                name: room.latest_message.sender.name
                            },
                        } : undefined
                    };

                    setSelectedRoom(typedRoom);
                    setShowChatView(true); // Show chat view on mobile when room is selected
                    currentRoomIdRef.current = chatRoomId;
                } else {
                    // Room not found - but don't immediately show error
                    // Set waiting state and give it time for the room to be created
                    setWaitingForRoom(true);
                    
                    // Clear any existing timeout
                    if (roomNotFoundTimeoutRef.current) {
                        clearTimeout(roomNotFoundTimeoutRef.current);
                    }
                    
                    // Wait 5 seconds before showing the error (room should be created by then)
                    roomNotFoundTimeoutRef.current = setTimeout(() => {
                        console.warn(`Chat room with ID ${chatRoomId} not found after waiting`);
                        setError('Chat room not found');
                        setSelectedRoom(null);
                        setShowChatView(false);
                        setWaitingForRoom(false);
                        currentRoomIdRef.current = null;
                        roomNotFoundTimeoutRef.current = null;
                    }, 5000);
                }
            }
        } else if (!chatRoomId) {
            // Clear selected room if no chatRoomId in URL
            setSelectedRoom(null);
            setShowChatView(false);
            setWaitingForRoom(false);
            currentRoomIdRef.current = null;
            // Clear any pending timeout
            if (roomNotFoundTimeoutRef.current) {
                clearTimeout(roomNotFoundTimeoutRef.current);
                roomNotFoundTimeoutRef.current = null;
            }
        } else if (chatRoomId && chatRooms.length === 0 && !chatRoomsLoading) {
            // We have a chatRoomId but no rooms loaded and not loading - wait a bit
            setWaitingForRoom(true);
        }
    }, [searchParams, chatRooms, chatRoomsLoading]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (roomNotFoundTimeoutRef.current) {
                clearTimeout(roomNotFoundTimeoutRef.current);
            }
        };
    }, []);

    const handleChatRoomClick = (roomId: string) => {
        // Update URL without navigation
        router.push(`/chat?chatRoomId=${roomId}`, { scroll: false });
    };

    const handleBackToList = () => {
        setShowChatView(false);
        setSelectedRoom(null);
        router.push('/chat', { scroll: false });
    };

    // Fix the useEffect for scrolling to avoid unnecessary updates
    useEffect(() => {
        if (chatMessages.length > 0) {
            // First immediate scroll
            scrollToBottom();

            // Then scroll again after a short delay to ensure DOM is updated
            setTimeout(scrollToBottom, 100);
        }
    }, [chatMessages]); // Remove selectedRoom from the dependency array

    // Set overall loading state based on user loading and chat rooms loading
    const isLoading = userLoading || venuesLoading || requestsLoading || chatRoomsLoading || waitingForRoom;

    if (!user && !userLoading) {
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
        <div className="min-h-screen min-w-screen flex flex-col">
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
                {/* Desktop Layout - Hidden on mobile */}
                <div className="hidden lg:grid grid-cols-4 gap-4 w-full h-full">
                    {/* Left Sidebar - Messages */}
                    <div className="col-span-1 bg-white rounded-lg shadow-sm p-4 h-full">
                        <div className="flex items-center gap-2">
                            <div className='flex gap-2 items-center'>
                                <h1 className="text-lg font-semibold">Messages</h1>
                                <div className="bg-[#E7E7E7] rounded-full h-6 w-6 text-xs flex items-center justify-center">
                                    {chatRooms.length > 0 ? chatRooms.length : 0}
                                </div>
                            </div>
                        </div>

                        <div className="col-span-3 overflow-y-scroll h-full mt-4">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-32">
                                    <p>Loading chats...</p>
                                </div>
                            ) : chatRooms.length > 0 ? (
                                chatRooms.map((room, index) => (
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
                                ))
                            ) : (
                                <div className="text-center py-6 text-gray-500">
                                    No conversations found
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Middle - Chat Area */}
                    <div className="col-span-2 bg-white rounded-lg shadow-sm flex flex-col h-full overflow-scroll">
                        {messagesLoading || venueDetailsLoading ? (
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
                            <div className="relative w-full h-64">
                                <Image
                                    src={selectedSpace.venue_images[0].image_url}
                                    alt={selectedSpace?.name || "Venue"}
                                    layout="fill"
                                    objectFit="cover"
                                    className="rounded-lg"
                                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = 'https://via.placeholder.com/800x400?text=Venue';
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="w-full h-64 bg-gray-200 flex items-center justify-center rounded-lg">
                                <span className="text-gray-500">No image available</span>
                            </div>
                        )}

                        <div className="p-4 flex flex-col gap-4 justify-between h-full overflow-y-auto">
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-xl font-bold mb-2">{selectedSpace?.name}</h2>
                                    <p className="text-gray-600 text-sm line-clamp-3">
                                        {selectedSpace?.description}
                                    </p>
                                </div>

                                {/* Event Details */}
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold text-gray-900 mb-3">Event Details</h3>
                                    <div className="space-y-2">
                                        {selectedRoom?.popup_name && (
                                            <div className="flex items-start gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm0 2a7 7 0 00-7 7h14a7 7 0 00-7-7z" clipRule="evenodd" />
                                                </svg>
                                                <span className="text-sm text-gray-600">{selectedRoom.popup_name}</span>
                                            </div>
                                        )}

                                        {selectedRoom?.event_date && (
                                            <div className="flex items-start gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                </svg>
                                                <span className="text-sm text-gray-600">{selectedRoom.event_date}</span>
                                            </div>
                                        )}

                                        {selectedRoom?.guest_count && (
                                            <div className="flex items-start gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                                </svg>
                                                <span className="text-sm text-gray-600">{selectedRoom.guest_count} guests expected</span>
                                            </div>
                                        )}

                                        <div className="flex items-start gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-sm text-gray-600">{selectedSpace?.address}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Services Requested */}
                                {selectedRoom?.services && (
                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold text-gray-900 mb-3">Services Requested</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {selectedRoom.services.map((service: string, index: number) => (
                                                <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                                    <div className="bg-blue-500 rounded-full p-1 flex-shrink-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-sm text-gray-700 font-xs">{service}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Collaboration Types */}
                                {selectedRoom?.collaboration_types && selectedRoom.collaboration_types.length > 0 && (
                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold text-gray-900 mb-3">Collaboration Types</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedRoom.collaboration_types.map((type, index) => (
                                                <span 
                                                    key={index} 
                                                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                                                >
                                                    {CollaborationTypes[type as keyof typeof CollaborationTypes] || type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Contact Information */}
                                {(selectedRoom?.instagram_handle || selectedRoom?.website) && (
                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                                        <div className="space-y-2">
                                            {selectedRoom?.instagram_handle && (
                                                <a
                                                    href={`https://instagram.com/${selectedRoom.instagram_handle.replace('@', '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-pink-600 transition-colors"
                                                >
                                                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-yellow-500 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5">
                                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                                        </svg>
                                                    </div>
                                                    <span>@{selectedRoom.instagram_handle.replace('@', '')}</span>
                                                </a>
                                            )}

                                            {selectedRoom?.website && (
                                                <a
                                                    href={selectedRoom.website.startsWith('http') ? selectedRoom.website : `https://${selectedRoom.website}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="truncate">{selectedRoom.website.replace(/^https?:\/\//, '')}</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Special Requests */}
                                {selectedRoom?.special_requests && (
                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold text-gray-900 mb-3">Special Requests</h3>
                                        <p className="text-sm text-gray-600 whitespace-pre-line">{selectedRoom.special_requests}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 pt-4 border-t">
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-900 mb-3">Revenue share on ticket sales</p>
                                    <Link href={`/spaces/${selectedSpace?.id}`}>
                                        <button className="w-full bg-gray-800 text-white py-3 rounded-md hover:bg-gray-700 transition">
                                            View Pop-up
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Layout - Visible only on mobile */}
                <div className="lg:hidden w-full h-full">
                    {!showChatView ? (
                        /* Mobile Chat List View */
                        <div className="bg-white rounded-lg shadow-sm p-4 h-full">
                            <div className="flex items-center gap-2 mb-4">
                                <div className='flex gap-2 items-center'>
                                    <h1 className="text-lg font-semibold">Messages</h1>
                                    <div className="bg-[#E7E7E7] rounded-full h-6 w-6 text-xs flex items-center justify-center">
                                        {chatRooms.length > 0 ? chatRooms.length : 0}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-y-scroll h-full">
                                {isLoading ? (
                                    <div className="flex justify-center items-center h-32">
                                        <p>Loading chats...</p>
                                    </div>
                                ) : chatRooms.length > 0 ? (
                                    chatRooms.map((room, index) => (
                                        <div
                                            key={room.id}
                                            onClick={() => handleChatRoomClick(room.id)}
                                            className={`block p-4 hover:bg-gray-50 cursor-pointer border-b border-[#E7E7E7] ${index === 0 ? 'border-t' : ''}`}
                                        >
                                            <div className="flex items-center gap-3 rounded-lg">
                                                <div className="w-12 h-12 bg-amber-100 rounded-full flex-shrink-0 flex items-center justify-center text-amber-600 uppercase">
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
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-gray-500">
                                        No conversations found
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Mobile Chat Room View */
                        <div className="bg-white rounded-lg shadow-sm flex flex-col h-full">
                            {messagesLoading || venueDetailsLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <p>Loading conversation...</p>
                                </div>
                            ) : selectedRoom ? (
                                <>
                                    {/* Mobile Chat Header with Back Button and Venue Info */}
                                    <div className="p-4 border-b border-[#E7E7E7]">
                                        <div className="flex items-center gap-3 mb-3">
                                            <button
                                                onClick={handleBackToList}
                                                className="p-2 hover:bg-gray-100 rounded-full"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 uppercase">
                                                {selectedRoom.venue_name ? selectedRoom.venue_name.charAt(0) : '?'}
                                            </div>
                                            <div className="flex-grow">
                                                <h2 className="font-medium">{selectedRoom.venue_name || 'Unknown Venue'}</h2>
                                                <p className="text-sm text-gray-500">
                                                    {selectedSpace?.neighborhood}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Venue Info Card - Clickable */}
                                        {selectedSpace && (
                                            <Link href={`/spaces/${selectedSpace.id}`} className="block">
                                                <div className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer">
                                                    <div className="flex items-center gap-3">
                                                        {selectedSpace?.venue_images && selectedSpace.venue_images.length > 0 ? (
                                                            <div className="relative w-12 h-12 flex-shrink-0">
                                                                <Image
                                                                    src={selectedSpace.venue_images[0].image_url}
                                                                    alt={selectedSpace?.name || "Venue"}
                                                                    layout="fill"
                                                                    objectFit="cover"
                                                                    className="rounded-lg"
                                                                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        target.src = 'https://via.placeholder.com/48x48?text=V';
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <span className="text-gray-500 text-xs">No img</span>
                                                            </div>
                                                        )}
                                                        <div className="flex-grow min-w-0">
                                                            <h3 className="font-medium text-sm truncate">{selectedSpace?.name}</h3>
                                                            <p className="text-xs text-gray-500 truncate">{selectedSpace?.address}</p>
                                                            {selectedRoom?.event_date && (
                                                                <p className="text-xs text-gray-500">{selectedRoom.event_date}</p>
                                                            )}
                                                        </div>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </Link>
                                        )}
                                    </div>

                                    {/* Messages */}
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

                                    {/* Message Input */}
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
                                    <p className="text-gray-500">Choose a chat from the list to start messaging</p>
                                </div>
                            )}
                        </div>
                    )}
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
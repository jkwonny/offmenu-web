'use client';

import { format } from 'date-fns';
import Image from 'next/image';
import { RefObject } from 'react';

interface VenueImage {
    image_url: string;
    sort_order?: number;
}

interface Venue {
    id: number;
    name: string;
    address?: string;
    description?: string;
    neighborhood?: string;
    image_url?: string;
    venue_images?: VenueImage[];
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
}

interface ChatMessage {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    sender_name: string;
}

interface User {
    id: string;
}

interface ChatContentProps {
    loadingRoom: boolean;
    selectedRoom: ChatRoom | null;
    user: User | null;
    chatMessages: ChatMessage[];
    messagesContainerRef: RefObject<HTMLDivElement | null>;
    selectedSpace: Venue | null;
}

export default function ChatContent({
    loadingRoom,
    selectedRoom,
    user,
    chatMessages,
    messagesContainerRef,
    selectedSpace
}: ChatContentProps) {
    // Use the search params hook within this component that's wrapped in Suspense

    return (
        <>
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
                        <Image
                            src={selectedSpace.venue_images[0].image_url}
                            alt={selectedSpace?.name || "Venue"}
                            className="rounded-lg object-cover"
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            onError={(e) => {
                                // Using unoptimized fallback image
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
        </>
    );
} 
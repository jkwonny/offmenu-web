"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { uploadChatAttachment } from '../../lib/uploadChatAttachment';
import { refreshAttachmentUrl } from '../../lib/refreshAttachmentUrl';
import { formatInTimeZone } from 'date-fns-tz';
import NavBar from '../../components/NavBar';
import Image from 'next/image';

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    attachment_url?: string;
    attachment_type?: string;
    sender?: {
        name: string;
        email: string;
    };
}

interface ChatParticipant {
    id: string;
    name: string;
    email: string;
}

// Define interface for room data structure returned from Supabase
interface RoomData {
    id: string;
    request_id?: string;
    event_id?: string;
    venue_id?: number;
    chat_requests: {
        sender_id: string;
        recipient_id: string;
    };
    events?: {
        title: string;
    };
    venues?: {
        name: string;
    };
}

// User interface for authentication data
interface User {
    id: string;
    name?: string;
    email?: string;
}

export default function ChatRoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.room_id as string;
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [user, setUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [participants, setParticipants] = useState<ChatParticipant[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [roomDetails, setRoomDetails] = useState<{
        event_title?: string;
        venue_name?: string;
    }>({});

    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress] = useState(0);

    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [refreshingUrls, setRefreshingUrls] = useState<Record<string, boolean>>({});

    // Store the channel reference for typing indicator
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        async function setup() {
            try {
                // Get current authenticated user
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                if (!user) {
                    router.push('/auth/signin');
                    return;
                }

                // Fetch room details
                const { data: room, error: roomError } = await supabase
                    .from('chat_rooms')
                    .select(`
            id,
            request_id,
            event_id,
            venue_id,
            chat_requests(sender_id, recipient_id),
            events(title),
            venues(name)
          `)
                    .eq('id', roomId)
                    .single();

                if (roomError) throw roomError;

                // Type cast the room data to our interface
                const typedRoom = room as unknown as RoomData;

                // Set room details
                setRoomDetails({
                    event_title: typedRoom.events?.title,
                    venue_name: typedRoom.venues?.name
                });


                // Get participants
                const participants = [
                    typedRoom.chat_requests.sender_id,
                    typedRoom.chat_requests.recipient_id
                ].filter(Boolean);

                // Verify user is a participant
                const isParticipant = participants.includes(user.id);
                if (!isParticipant) {
                    setError('You are not a participant in this conversation.');
                    setLoading(false);
                    return;
                }

                // Fetch participants' details
                const { data: participantsData } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .in('id', participants);

                setParticipants(participantsData || []);

                // Fetch messages
                const { data: messagesData, error: messagesError } = await supabase
                    .from('chat_messages')
                    .select(`
            id,
            content,
            sender_id,
            created_at,
            attachment_url,
            attachment_type,
            sender:users(name, email)
          `)
                    .eq('room_id', roomId)
                    .order('created_at', { ascending: true });

                if (messagesError) throw messagesError;

                // Format the messages data to match our interface
                const formattedMessages = messagesData?.map(msg => {
                    // Extract sender info from the nested array
                    const senderInfo = msg.sender
                        ? msg.sender
                        : { name: 'Unknown', email: '' };

                    return {
                        ...msg,
                        sender: senderInfo
                    } as Message;
                }) || [];

                setMessages(formattedMessages);

                // Subscribe to new messages
                const channel = setupRealtimeSubscription(roomId, user.id);
                channelRef.current = channel;

            } catch (err: unknown) {
                console.error('Error setting up chat room:', err);
                setError(err instanceof Error ? err.message : 'Failed to load chat room');
            } finally {
                setLoading(false);
            }
        }

        setup();

        // Cleanup subscription on unmount
        return () => {
            if (channelRef.current) {
                channelRef.current.unsubscribe();
            }
        };
    }, [roomId, router]);

    // Setup realtime subscription for messages and typing indicators
    const setupRealtimeSubscription = (roomId: string, userId: string) => {
        const channel = supabase.channel(`room:${roomId}`, {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        // Subscribe to inserts on chat_messages table
        channel
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `room_id=eq.${roomId}`,
                },
                async (payload) => {
                    // Fetch sender info for the new message
                    const { data: senderData } = await supabase
                        .from('users')
                        .select('name, email')
                        .eq('id', payload.new.sender_id)
                        .single();

                    // Add the new message to the state
                    const newMessage = {
                        ...payload.new,
                        sender: senderData || { name: 'Unknown', email: '' }
                    } as Message;

                    setMessages((prev) => [...prev, newMessage]);
                }
            )
            // User typing indicator with presence
            .on('presence', { event: 'sync' }, () => {
                const presenceState = channel.presenceState();

                const typingUsers: string[] = [];

                // Get list of users who are typing
                Object.keys(presenceState).forEach((presenceId) => {
                    const presence = presenceState[presenceId];
                    // Use type assertion to handle complex presence structure
                    presence.forEach((p) => {
                        // Type narrowing check to ensure properties exist
                        if (p && typeof p === 'object' && 'typing' in p && 'user_id' in p) {
                            if (p.typing && p.user_id !== userId) {
                                typingUsers.push(p.user_id as string);
                            }
                        }
                    });
                });

                setTypingUsers(typingUsers);
            })
            .subscribe(() => {
                // Subscription status handling can be added here if needed
            });

        return channel;
    };

    // Auto-scroll to bottom when new messages come in
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Handle typing indicator
    const handleTyping = () => {
        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (!channelRef.current || !user) return;

        // Update presence with typing: true
        channelRef.current.track({
            user_id: user.id,
            typing: true,
            username: user.name || user.email,
        });

        // Set timeout to clear typing indicator
        typingTimeoutRef.current = setTimeout(() => {
            if (channelRef.current && user) {
                channelRef.current.track({
                    user_id: user.id,
                    typing: false,
                    username: user.name || user.email,
                });
            }
        }, 2000);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if ((!newMessage.trim() && !fileToUpload) || sending || !user) {
            return;
        }

        setSending(true);

        try {
            let attachmentUrl = '';
            let attachmentType = '';

            // If there's a file to upload, process it first
            if (fileToUpload) {
                setIsUploading(true);
                // Upload the file and get the URL
                const uploadResult = await uploadChatAttachment(fileToUpload, user.id);
                attachmentUrl = uploadResult.url;
                attachmentType = uploadResult.attachment_type;
                setIsUploading(false);
                setFileToUpload(null);
            }

            // Send the message
            const response = await fetch('/api/chat/sendMessage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    room_id: roomId,
                    sender_id: user.id,
                    sender_name: user.name,
                    content: newMessage.trim(),
                    attachment_url: attachmentUrl,
                    attachment_type: attachmentType
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to send message');
            }

            // Clear the input
            setNewMessage('');
        } catch (err: unknown) {
            console.error('Error sending message:', err);
            setError(err instanceof Error ? err.message : 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type and size here
            const acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'];
            const maxSize = 10 * 1024 * 1024; // 10MB

            if (!acceptedTypes.includes(file.type)) {
                setError('Invalid file type. Only images, videos, and PDFs are allowed.');
                return;
            }

            if (file.size > maxSize) {
                setError('File too large. Maximum size is 10MB.');
                return;
            }

            setFileToUpload(file);
            setError('');
        }
    };

    const cancelFileUpload = () => {
        setFileToUpload(null);
    };

    const formatMessageDate = (timestamp: string) => {
        // Explicitly treat the database timestamp as UTC
        const utcDate = new Date(timestamp);
        const nyTimeZone = 'America/New_York';

        const today = new Date();
        const nycToday = new Date(formatInTimeZone(today, nyTimeZone, 'yyyy-MM-dd'));
        const nycMessageDate = new Date(formatInTimeZone(utcDate, nyTimeZone, 'yyyy-MM-dd'));

        if (
            nycMessageDate.getDate() === nycToday.getDate() &&
            nycMessageDate.getMonth() === nycToday.getMonth() &&
            nycMessageDate.getFullYear() === nycToday.getFullYear()
        ) {
            return 'Today, ' + formatInTimeZone(utcDate, nyTimeZone, 'h:mm a');
        }

        return formatInTimeZone(utcDate, nyTimeZone, 'MMM d, h:mm a');
    };

    // Function to handle image load errors (e.g., expired JWT)
    const handleImageError = useCallback(async (messageId: string, originalUrl: string) => {
        // Prevent multiple refreshes for the same URL
        if (refreshingUrls[messageId]) return;

        setRefreshingUrls(prev => ({ ...prev, [messageId]: true }));

        try {
            const result = await refreshAttachmentUrl(originalUrl);

            if (result.success) {
                // Update the message with the refreshed URL
                setMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg.id === messageId
                            ? { ...msg, attachment_url: result.url }
                            : msg
                    )
                );
            }
        } catch (error) {
            console.error('Failed to refresh image URL:', error);
        } finally {
            setRefreshingUrls(prev => ({ ...prev, [messageId]: false }));
        }
    }, [refreshingUrls]);

    // Check for and refresh soon-to-expire attachment URLs
    useEffect(() => {
        if (messages.length === 0 || !user) return;

        const checkAndRefreshExpiringUrls = async () => {
            const now = new Date();
            const urlsToRefresh: { messageId: string, url: string }[] = [];

            // Find messages with attachment URLs containing JWT tokens
            for (const message of messages) {
                if (!message.attachment_url) continue;

                // If URL contains a JWT token
                if (message.attachment_url.includes('token=')) {
                    try {
                        // Extract token expiry by parsing JWT (token is after 'token=' in the URL)
                        const tokenPart = message.attachment_url.split('token=')[1]?.split('&')[0];
                        if (!tokenPart) continue;

                        // Decode the JWT payload (middle part)
                        const payloadBase64 = tokenPart.split('.')[1];
                        if (!payloadBase64) continue;

                        // Decode the base64 payload
                        const payloadJson = atob(payloadBase64);
                        const payload = JSON.parse(payloadJson);

                        // Check if token expires within the next hour
                        if (payload.exp) {
                            const expiryTime = new Date(payload.exp * 1000);
                            const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

                            if (expiryTime < oneHourFromNow) {
                                urlsToRefresh.push({
                                    messageId: message.id,
                                    url: message.attachment_url
                                });
                            }
                        }
                    } catch (error) {
                        console.warn('Error parsing JWT from URL:', error);
                    }
                }
            }

            // Refresh URLs that will expire soon
            for (const { messageId, url } of urlsToRefresh) {
                try {
                    // Don't refresh if already refreshing
                    if (refreshingUrls[messageId]) continue;

                    await handleImageError(messageId, url);
                } catch (error) {
                    console.error('Error refreshing URL:', error);
                }
            }
        };

        // Check for expiring URLs on load and every 30 minutes
        checkAndRefreshExpiringUrls();
        const interval = setInterval(checkAndRefreshExpiringUrls, 30 * 60 * 1000);

        return () => clearInterval(interval);
    }, [messages, user, handleImageError, refreshingUrls]);

    if (!user && !loading) {
        return (
            <>
                <NavBar />
                <div className="max-w-4xl mx-auto p-6 text-center">
                    <p>Please sign in to view this conversation.</p>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <NavBar />
                <div className="max-w-4xl mx-auto p-6">
                    <div className="bg-red-100 text-red-700 p-4 rounded-md">{error}</div>
                    <button
                        onClick={() => router.push('/chat')}
                        className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-md"
                    >
                        Back to Conversations
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <NavBar />
            <div className="max-w-4xl mx-auto px-4 pt-4 pb-4 flex flex-col h-[calc(100vh-128px)]">
                {/* Header with venue/event info */}
                <div className="bg-white rounded-t-lg shadow-sm p-4 border-b flex justify-between items-center">
                    <div>
                        <h1 className="font-semibold text-lg">{roomDetails.venue_name || 'Chat'}</h1>
                        {roomDetails.event_title && (
                            <p className="text-sm text-gray-600">Event: {roomDetails.event_title}</p>
                        )}
                    </div>
                    <button
                        onClick={() => router.push('/chat')}
                        className="text-sm text-amber-600 hover:text-amber-700"
                    >
                        Back
                    </button>
                </div>

                {/* Messages Section */}
                <div className="flex-1 overflow-y-auto bg-white p-4 space-y-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <p>Loading messages...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-center text-gray-500">
                            <div>
                                <p className="mb-2">No messages yet</p>
                                <p className="text-sm">Send a message to start the conversation</p>
                            </div>
                        </div>
                    ) : (
                        messages.map((message) => {
                            const isCurrentUser = message.sender_id === user?.id;

                            return (
                                <div
                                    key={message.id}
                                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[75%] rounded-lg p-3 ${isCurrentUser
                                            ? 'bg-amber-600 text-white rounded-tr-none'
                                            : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                            }`}
                                    >
                                        {!isCurrentUser && (
                                            <p className="text-xs font-semibold mb-1">
                                                {message.sender?.name || 'Unknown'}
                                            </p>
                                        )}

                                        {/* Message content */}
                                        {message.content && <p className="mb-2">{message.content}</p>}

                                        {/* Attachment handling */}
                                        {message.attachment_url && message.attachment_type === 'image' && (
                                            <div className="mb-2">
                                                <Image
                                                    src={message.attachment_url}
                                                    alt="Attachment"
                                                    className="rounded-md max-w-full max-h-64 object-contain"
                                                    onError={() => handleImageError(message.id, message.attachment_url || '')}
                                                    width={300}
                                                    height={200}
                                                />
                                                {refreshingUrls[message.id] && (
                                                    <p className="text-xs mt-1 text-amber-100">Refreshing image...</p>
                                                )}
                                            </div>
                                        )}

                                        {message.attachment_url && message.attachment_type === 'video' && (
                                            <div className="mb-2">
                                                <video
                                                    src={message.attachment_url}
                                                    controls
                                                    className="rounded-md max-w-full max-h-64"
                                                    onError={() => handleImageError(message.id, message.attachment_url || '')}
                                                />
                                                {refreshingUrls[message.id] && (
                                                    <p className="text-xs mt-1 text-amber-100">Refreshing video...</p>
                                                )}
                                            </div>
                                        )}

                                        {message.attachment_url && message.attachment_type === 'document' && (
                                            <div className="mb-2">
                                                <a
                                                    href={message.attachment_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center space-x-2 p-2 bg-white rounded-md border text-amber-600"
                                                    onClick={(e) => {
                                                        if (message.attachment_url?.includes('jwt expired')) {
                                                            e.preventDefault();
                                                            handleImageError(message.id, message.attachment_url);
                                                        }
                                                    }}
                                                >
                                                    <span>View Document</span>
                                                </a>
                                                {refreshingUrls[message.id] && (
                                                    <p className="text-xs mt-1 text-amber-100">Refreshing document...</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Timestamp */}
                                        <p
                                            className={`text-xs ${isCurrentUser ? 'text-amber-100' : 'text-gray-500'
                                                } text-right`}
                                        >
                                            {formatMessageDate(message.created_at)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Typing indicator */}
                    {typingUsers.length > 0 && (
                        <div className="flex items-center text-sm text-gray-500 mt-2">
                            <div className="flex space-x-1 mr-2">
                                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-100"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-200"></div>
                            </div>
                            {typingUsers.length === 1
                                ? `${participants.find(p => p.id === typingUsers[0])?.name || 'Someone'} is typing...`
                                : 'Multiple people are typing...'}
                        </div>
                    )}

                    {/* Auto-scroll anchor */}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="bg-white rounded-b-lg shadow-sm p-4 border-t">
                    {/* File preview */}
                    {fileToUpload && (
                        <div className="mb-3 p-2 border rounded-md bg-gray-50 flex justify-between items-center">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-amber-100 rounded-md flex items-center justify-center mr-2">
                                    {fileToUpload.type.startsWith('image/') ? '🖼️' :
                                        fileToUpload.type.startsWith('video/') ? '🎥' : '📄'}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="truncate text-sm font-medium">{fileToUpload.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {(fileToUpload.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={cancelFileUpload}
                                className="text-red-500 hover:text-red-700 ml-2"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Upload progress */}
                    {isUploading && (
                        <div className="mb-3">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-amber-600 h-2.5 rounded-full"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Uploading file...</p>
                        </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                        <label
                            htmlFor="file-upload"
                            className="p-2 text-gray-500 hover:text-amber-600 cursor-pointer"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                />
                            </svg>
                            <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={sending || isUploading}
                                accept="image/jpeg,image/png,image/gif,video/mp4,application/pdf"
                            />
                        </label>

                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                handleTyping();
                            }}
                            placeholder="Type a message..."
                            className="flex-1 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                            disabled={sending || isUploading}
                        />

                        <button
                            type="submit"
                            disabled={(!newMessage.trim() && !fileToUpload) || sending || isUploading}
                            className="p-3 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
} 
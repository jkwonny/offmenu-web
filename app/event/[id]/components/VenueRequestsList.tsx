"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MapPin, MessageSquare, Check, Clock, X, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import { 
    fetchVenueRequestsByEventId, 
    acceptVenueOffer, 
    getChatRoomForRequest,
    VenueBookingRequest 
} from '@/app/lib/queries/venue-requests';

interface VenueRequestsListProps {
    eventId: string;
    isOwner: boolean;
    onEventUpdate?: () => void; // Callback to refresh event data
}

interface ActionState {
    isLoading: boolean;
    error: string | null;
    retryCount: number;
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'accepted':
            return {
                label: 'Accepted',
                className: 'bg-green-100 text-green-800',
                icon: Check,
            };
        case 'declined':
            return {
                label: 'Declined',
                className: 'bg-red-100 text-red-800',
                icon: X,
            };
        default:
            return {
                label: 'Waiting response',
                className: 'bg-yellow-100 text-yellow-800',
                icon: Clock,
            };
    }
};

export default function VenueRequestsList({ eventId, isOwner, onEventUpdate }: VenueRequestsListProps) {
    const router = useRouter();
    const [requests, setRequests] = useState<VenueBookingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});

    const loadRequests = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        setError(null);
        
        try {
            const response = await fetchVenueRequestsByEventId(eventId);
            if (response.success) {
                setRequests(response.requests);
                setRetryCount(0); // Reset retry count on success
            } else {
                throw new Error(response.error || 'Failed to load venue requests');
            }
        } catch (err) {
            console.error('Error fetching venue requests:', err);
            
            let errorMessage = 'Failed to load venue requests';
            if (err instanceof Error) {
                errorMessage = err.message;
            }
            
            // Add retry suggestion for network errors
            if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
                errorMessage += '. Please check your internet connection.';
            }
            
            setError(errorMessage);
            setRetryCount(prev => prev + 1);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        if (eventId) {
            loadRequests();
        }
    }, [eventId]);

    const setActionState = (requestId: string, state: Partial<ActionState>) => {
        setActionStates(prev => ({
            ...prev,
            [requestId]: {
                ...prev[requestId],
                isLoading: false,
                error: null,
                retryCount: 0,
                ...state,
            }
        }));
    };

    const handleAcceptOffer = async (request: VenueBookingRequest) => {
        if (!isOwner) return;
        
        const requestId = request.id;
        setActionState(requestId, { isLoading: true, error: null });
        
        try {
            const result = await acceptVenueOffer(request.event_id, request.id, request.venue_id);
            
            if (result.success) {
                // Update the local state immediately
                setRequests(prev => 
                    prev.map(r => 
                        r.id === requestId 
                            ? { ...r, status: 'accepted' as const }
                            : r
                    )
                );
                
                // Call the event update callback to refresh event data
                if (onEventUpdate) {
                    onEventUpdate();
                }
                
                setActionState(requestId, { isLoading: false });
            } else {
                throw new Error(result.error || 'Failed to accept offer');
            }
        } catch (err) {
            console.error('Error accepting offer:', err);
            
            let errorMessage = 'Failed to accept offer';
            if (err instanceof Error) {
                errorMessage = err.message;
            }
            
            setActionState(requestId, { 
                isLoading: false, 
                error: errorMessage,
                retryCount: (actionStates[requestId]?.retryCount || 0) + 1
            });
        }
    };

    const handleMessageSpace = async (request: VenueBookingRequest) => {
        const requestId = request.id;
        setActionState(requestId, { isLoading: true, error: null });
        
        try {
            const result = await getChatRoomForRequest(request.id);
            
            if (result.chatRoomId) {
                router.push(`/chat?chatRoomId=${result.chatRoomId}`);
            } else {
                throw new Error(result.error || 'Chat room not found');
            }
        } catch (err) {
            console.error('Error accessing chat room:', err);
            
            let errorMessage = 'Unable to access chat room';
            if (err instanceof Error) {
                errorMessage = err.message;
            }
            
            setActionState(requestId, { 
                isLoading: false, 
                error: errorMessage,
                retryCount: (actionStates[requestId]?.retryCount || 0) + 1
            });
        }
    };

    const handleViewSpaceDetails = (venueId: string) => {
        router.push(`/spaces/${venueId}`);
    };

    const handleRetryAction = (requestId: string, action: () => Promise<void>) => {
        action();
    };

    const handleRetryLoad = () => {
        loadRequests();
    };

    // Refresh requests when coming back from external pages
    useEffect(() => {
        const handleFocus = () => {
            loadRequests(false); // Refresh without showing loading spinner
        };
        
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [eventId]);

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">List of Spaces</h2>
                <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-gray-600 text-sm">Loading venue requests...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">List of Spaces</h2>
                <div className="flex items-center justify-center py-8">
                    <div className="text-center max-w-md">
                        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load requests</h3>
                        <p className="text-gray-600 text-sm mb-4">{error}</p>
                        <button
                            onClick={handleRetryLoad}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </button>
                        {retryCount > 1 && (
                            <p className="text-xs text-gray-500 mt-2">
                                Attempted {retryCount} times
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">List of Spaces</h2>
                <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">
                        <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No venue requests yet</h3>
                    <p className="text-gray-600 text-sm">Venue requests will appear here once you contact spaces.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">List of Spaces</h2>
                <button
                    onClick={() => loadRequests(false)}
                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                    title="Refresh requests"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </button>
            </div>
            
            <div className="space-y-4">
                {requests.map((request) => {
                    const statusConfig = getStatusConfig(request.status);
                    const StatusIcon = statusConfig.icon;
                    const actionState = actionStates[request.id];
                    
                    return (
                        <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-start space-x-3">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                        <Image
                                            src={request.venue?.image_url || request.venue?.venue_images?.[0]?.image_url || '/images/default-venue-image.jpg'}
                                            alt={request.venue?.name || 'Venue'}
                                            width={64}
                                            height={64}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{request.venue?.name}</h3>
                                        {request.venue?.address && (
                                            <p className="text-sm text-gray-600 flex items-center mt-1">
                                                <MapPin className="h-3 w-3 mr-1" />
                                                {request.venue.neighborhood || request.venue.address}
                                            </p>
                                        )}
                                        {request.venue?.capacity && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                Capacity: {request.venue.capacity} guests
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
                                        <StatusIcon className="h-3 w-3 mr-1" />
                                        {statusConfig.label}
                                    </span>
                                </div>
                            </div>

                            {/* Action error display */}
                            {actionState?.error && (
                                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-red-700">{actionState.error}</span>
                                        <button
                                            onClick={() => setActionState(request.id, { error: null })}
                                            className="text-red-400 hover:text-red-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleViewSpaceDetails(request.venue_id)}
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Space details
                                </button>
                                
                                <button
                                    onClick={() => handleMessageSpace(request)}
                                    disabled={actionState?.isLoading}
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {actionState?.isLoading ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 mr-1 border-2 border-blue-700 border-t-transparent rounded-full"></div>
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquare className="h-4 w-4 mr-1" />
                                            Message to Space
                                        </>
                                    )}
                                </button>
                                
                                {isOwner && request.status === 'accepted' && (
                                    <button
                                        onClick={() => handleAcceptOffer(request)}
                                        disabled={actionState?.isLoading}
                                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {actionState?.isLoading ? (
                                            <>
                                                <div className="animate-spin h-4 w-4 mr-1 border-2 border-green-700 border-t-transparent rounded-full"></div>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4 mr-1" />
                                                Accept offer
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Retry button for failed actions */}
                                {actionState?.error && actionState.retryCount > 0 && (
                                    <button
                                        onClick={() => {
                                            if (actionState.error?.includes('accept')) {
                                                handleRetryAction(request.id, () => handleAcceptOffer(request));
                                            } else if (actionState.error?.includes('chat')) {
                                                handleRetryAction(request.id, () => handleMessageSpace(request));
                                            }
                                        }}
                                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
                                    >
                                        <RefreshCw className="h-4 w-4 mr-1" />
                                        Retry
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
} 
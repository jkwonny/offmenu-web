'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Venue } from '@/types/Venue';
import NavBar from '@/app/components/NavBar';

// Extended Venue type with status
interface AdminVenue extends Venue {
    status?: 'pending' | 'approved' | 'declined';
}

// Event interface based on the API structure
interface AdminEvent {
    id: string;
    title: string;
    description?: string;
    event_type: string;
    selected_date: string;
    selected_time?: string;
    expected_capacity_min?: number;
    expected_capacity_max?: number;
    assets_needed?: string[];
    is_active: boolean;
    user_id: string;
    owner_id?: string;
    created_at: string;
    updated_at: string;
    event_status?: 'private_pending' | 'public_pending' | 'public_approved' | 'private_approved';
    duration?: number;
    address?: string;
    city?: string;
    state?: string;
    event_images?: Array<{
        id: number;
        event_id: string;
        image_url: string;
        sort_order: number;
        created_at: string;
    }>;
}

function AdminDashboardContent() {
    const searchParams = useSearchParams();
    const view = searchParams.get('view') || 'spaces';
    
    const [venues, setVenues] = useState<AdminVenue[]>([]);
    const [events, setEvents] = useState<AdminEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVenues, setSelectedVenues] = useState<Set<string>>(new Set());
    const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    // Fetch all venues and events on component mount
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                
                // Fetch venues
                const venuesResponse = await fetch('/api/venues');
                if (!venuesResponse.ok) {
                    throw new Error('Failed to fetch venues');
                }
                const venuesData = await venuesResponse.json();
                const venuesWithStatus = venuesData.map((venue: AdminVenue) => ({
                    ...venue,
                    status: venue.status || 'pending'
                }));
                setVenues(venuesWithStatus);

                // Fetch events
                const eventsResponse = await fetch('/api/events');
                if (!eventsResponse.ok) {
                    throw new Error('Failed to fetch events');
                }
                const eventsData = await eventsResponse.json();
                setEvents(eventsData);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // Handle venue status change
    const handleStatusChange = async (venueId: string, newStatus: 'approved' | 'declined') => {
        try {
            // Optimistic update
            setVenues(prevVenues =>
                prevVenues.map(venue =>
                    venue.id === venueId ? { ...venue, status: newStatus } : venue
                )
            );

            // Send update to server
            const response = await fetch(`/api/venues/${venueId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                throw new Error('Failed to update venue status');
            }

            // No need to update state again as we already did it optimistically
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update venue status');
            console.error('Error updating venue status:', err);

            // Revert the optimistic update on error
            setVenues(prevVenues => {
                // Refetch the venues to ensure we have the correct data
                fetchData();
                return prevVenues;
            });
        }
    };

    // Handle event status change
    const handleEventStatusChange = async (eventId: string, newStatus: 'public_approved' | 'private_approved') => {
        try {
            // Optimistic update
            setEvents(prevEvents =>
                prevEvents.map(event =>
                    event.id === eventId ? { ...event, event_status: newStatus } : event
                )
            );

            // Send update to server
            const response = await fetch(`/api/events/${eventId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                throw new Error('Failed to update event status');
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update event status');
            console.error('Error updating event status:', err);

            // Revert the optimistic update on error
            setEvents(prevEvents => {
                fetchData();
                return prevEvents;
            });
        }
    };

    // Handle bulk actions for venues
    const handleBulkAction = async (action: 'approve' | 'decline' | 'remove') => {
        if (selectedVenues.size === 0) return;

        setBulkActionLoading(true);
        try {
            const promises = Array.from(selectedVenues).map(async (venueId) => {
                if (action === 'remove') {
                    // Remove venue entirely
                    const response = await fetch(`/api/venues/${venueId}`, {
                        method: 'DELETE',
                    });
                    if (!response.ok) {
                        throw new Error(`Failed to remove venue ${venueId}`);
                    }
                } else {
                    // Update status
                    const response = await fetch(`/api/venues/${venueId}/status`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ status: action === 'approve' ? 'approved' : 'declined' }),
                    });
                    if (!response.ok) {
                        throw new Error(`Failed to ${action} venue ${venueId}`);
                    }
                }
            });

            await Promise.all(promises);

            // Update local state
            if (action === 'remove') {
                setVenues(prevVenues => 
                    prevVenues.filter(venue => !selectedVenues.has(venue.id))
                );
            } else {
                const newStatus = action === 'approve' ? 'approved' : 'declined';
                setVenues(prevVenues =>
                    prevVenues.map(venue =>
                        selectedVenues.has(venue.id) ? { ...venue, status: newStatus } : venue
                    )
                );
            }

            // Clear selection
            setSelectedVenues(new Set());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to perform bulk action');
            console.error('Error performing bulk action:', err);
        } finally {
            setBulkActionLoading(false);
        }
    };

    // Handle bulk actions for events
    const handleEventBulkAction = async (action: 'approve' | 'decline' | 'remove') => {
        if (selectedEvents.size === 0) return;

        setBulkActionLoading(true);
        try {
            const promises = Array.from(selectedEvents).map(async (eventId) => {
                if (action === 'remove') {
                    // Remove event entirely
                    const response = await fetch(`/api/events/${eventId}`, {
                        method: 'DELETE',
                    });
                    if (!response.ok) {
                        throw new Error(`Failed to remove event ${eventId}`);
                    }
                } else {
                    // Update status
                    const newStatus = action === 'approve' ? 'public_approved' : 'private_approved';
                    const response = await fetch(`/api/events/${eventId}/status`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ status: newStatus }),
                    });
                    if (!response.ok) {
                        throw new Error(`Failed to ${action} event ${eventId}`);
                    }
                }
            });

            await Promise.all(promises);

            // Update local state
            if (action === 'remove') {
                setEvents(prevEvents => 
                    prevEvents.filter(event => !selectedEvents.has(event.id))
                );
            } else {
                const newStatus = action === 'approve' ? 'public_approved' : 'private_approved';
                setEvents(prevEvents =>
                    prevEvents.map(event =>
                        selectedEvents.has(event.id) ? { ...event, event_status: newStatus } : event
                    )
                );
            }

            // Clear selection
            setSelectedEvents(new Set());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to perform bulk action on events');
            console.error('Error performing bulk action on events:', err);
        } finally {
            setBulkActionLoading(false);
        }
    };

    // Handle individual venue selection
    const handleVenueSelect = (venueId: string, selected: boolean) => {
        setSelectedVenues(prev => {
            const newSet = new Set(prev);
            if (selected) {
                newSet.add(venueId);
            } else {
                newSet.delete(venueId);
            }
            return newSet;
        });
    };

    // Handle individual event selection
    const handleEventSelect = (eventId: string, selected: boolean) => {
        setSelectedEvents(prev => {
            const newSet = new Set(prev);
            if (selected) {
                newSet.add(eventId);
            } else {
                newSet.delete(eventId);
            }
            return newSet;
        });
    };

    // Handle select all for pending venues
    const handleSelectAllPending = (selected: boolean) => {
        if (selected) {
            const pendingIds = pendingVenues.map(venue => venue.id);
            setSelectedVenues(new Set(pendingIds));
        } else {
            setSelectedVenues(new Set());
        }
    };

    // Handle select all for pending events
    const handleSelectAllPendingEvents = (selected: boolean) => {
        if (selected) {
            const pendingIds = pendingEvents.map(event => event.id);
            setSelectedEvents(new Set(pendingIds));
        } else {
            setSelectedEvents(new Set());
        }
    };

    // Function to refetch data
    const fetchData = async () => {
        try {
            setLoading(true);
            
            // Fetch venues
            const venuesResponse = await fetch('/api/venues');
            if (!venuesResponse.ok) {
                throw new Error('Failed to fetch venues');
            }
            const venuesData = await venuesResponse.json();
            const venuesWithStatus = venuesData.map((venue: AdminVenue) => ({
                ...venue,
                status: venue.status || 'pending'
            }));
            setVenues(venuesWithStatus);

            // Fetch events
            const eventsResponse = await fetch('/api/events');
            if (!eventsResponse.ok) {
                throw new Error('Failed to fetch events');
            }
            const eventsData = await eventsResponse.json();
            setEvents(eventsData);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filter venues by status
    const pendingVenues = venues.filter(venue => venue.status === 'pending');
    const approvedVenues = venues.filter(venue => venue.status === 'approved');
    const declinedVenues = venues.filter(venue => venue.status === 'declined');

    // Filter events by status
    const pendingEvents = events.filter(event => 
        event.event_status === 'private_pending' || event.event_status === 'public_pending'
    );
    const approvedEvents = events.filter(event => 
        event.event_status === 'private_approved' || event.event_status === 'public_approved'
    );

    // Check if all pending venues are selected
    const allPendingSelected = pendingVenues.length > 0 && pendingVenues.every(venue => selectedVenues.has(venue.id));
    const somePendingSelected = pendingVenues.some(venue => selectedVenues.has(venue.id));

    // Check if all pending events are selected
    const allPendingEventsSelected = pendingEvents.length > 0 && pendingEvents.every(event => selectedEvents.has(event.id));
    const somePendingEventsSelected = pendingEvents.some(event => selectedEvents.has(event.id));

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white">
                <NavBar />
                <div className="container mx-auto px-4 py-8">
                    <div className="bg-red-50 p-4 rounded-md">
                        <h2 className="text-xl font-semibold text-red-700">Error</h2>
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={fetchData}
                            className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <NavBar />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-amber-900 mb-2">Admin Dashboard</h1>
                    <p className="text-gray-600">Manage spaces and events</p>
                </div>

                {/* Tab Navigation */}
                <div className="relative flex rounded-full border border-amber-600 overflow-hidden max-w-fit mb-8">
                    {/* Animated background indicator */}
                    <div 
                        className={`absolute top-0 bottom-0 bg-amber-600 transition-all duration-300 ease-in-out rounded-full ${
                            view === 'spaces' 
                                ? 'left-0 w-1/2' 
                                : 'left-1/2 w-1/2'
                        }`}
                    />
                    
                    <Link
                        href="/admin/dashboard?view=spaces"
                        className={`relative z-10 py-1.5 px-3 md:px-6 md:py-1.5 text-sm font-medium transition-all duration-300 ease-in-out whitespace-nowrap transform hover:scale-105 ${
                            view === 'spaces'
                                ? 'text-white'
                                : 'text-amber-900 hover:text-amber-700'
                        }`}
                    >
                        Spaces
                    </Link>
                    <Link
                        href="/admin/dashboard?view=events"
                        className={`relative z-10 py-1.5 px-3 md:px-6 md:py-1.5 text-sm font-medium transition-all duration-300 ease-in-out whitespace-nowrap transform hover:scale-105 ${
                            view === 'events'
                                ? 'text-white'
                                : 'text-amber-900 hover:text-amber-700'
                        }`}
                    >
                        Events
                    </Link>
                </div>

                {view === 'spaces' ? (
                    <>
                        {/* VENUES/SPACES SECTION */}
                        {/* Pending Spaces Section */}
                        <div className="mb-12">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-semibold text-amber-800">Pending Spaces ({pendingVenues.length})</h2>
                                
                                {pendingVenues.length > 0 && (
                                    <div className="flex items-center gap-4">
                                        {/* Select All Checkbox */}
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={allPendingSelected}
                                                ref={(el) => {
                                                    if (el) el.indeterminate = somePendingSelected && !allPendingSelected;
                                                }}
                                                onChange={(e) => handleSelectAllPending(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">
                                                Select All ({selectedVenues.size})
                                            </span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Bulk Action Buttons */}
                            {selectedVenues.size > 0 && (
                                <div className="flex gap-3 mb-6 p-4 bg-amber-50 rounded-lg">
                                    <span className="text-sm font-medium text-amber-800 self-center">
                                        {selectedVenues.size} selected:
                                    </span>
                                    <button
                                        onClick={() => handleBulkAction('approve')}
                                        disabled={bulkActionLoading}
                                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {bulkActionLoading ? 'Processing...' : 'Approve All'}
                                    </button>
                                    <button
                                        onClick={() => handleBulkAction('decline')}
                                        disabled={bulkActionLoading}
                                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {bulkActionLoading ? 'Processing...' : 'Decline All'}
                                    </button>
                                    <button
                                        onClick={() => handleBulkAction('remove')}
                                        disabled={bulkActionLoading}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {bulkActionLoading ? 'Processing...' : 'Remove All'}
                                    </button>
                                </div>
                            )}

                            {pendingVenues.length === 0 ? (
                                <p className="text-gray-500">No pending spaces found.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {pendingVenues.map(venue => (
                                        <VenueCard
                                            key={venue.id}
                                            venue={venue}
                                            isSelected={selectedVenues.has(venue.id)}
                                            onSelect={(selected) => handleVenueSelect(venue.id, selected)}
                                            actionButtons={
                                                <>
                                                    <button
                                                        onClick={() => handleStatusChange(venue.id, 'approved')}
                                                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(venue.id, 'declined')}
                                                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                                                    >
                                                        Decline
                                                    </button>
                                                </>
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Active Spaces Section */}
                        <div className="mb-12">
                            <h2 className="text-2xl font-semibold text-amber-800 mb-4">Active Spaces ({approvedVenues.length})</h2>
                            {approvedVenues.length === 0 ? (
                                <p className="text-gray-500">No active spaces found.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {approvedVenues.map(venue => (
                                        <VenueCard
                                            key={venue.id}
                                            venue={venue}
                                            actionButtons={
                                                <button
                                                    onClick={() => handleStatusChange(venue.id, 'declined')}
                                                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                                                >
                                                    Deactivate
                                                </button>
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Declined Spaces Section */}
                        <div className="mb-16">
                            <h2 className="text-2xl font-semibold text-amber-800 mb-4">Declined Spaces ({declinedVenues.length})</h2>
                            {declinedVenues.length === 0 ? (
                                <p className="text-gray-500">No declined spaces found.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {declinedVenues.map(venue => (
                                        <VenueCard
                                            key={venue.id}
                                            venue={venue}
                                            actionButtons={
                                                <button
                                                    onClick={() => handleStatusChange(venue.id, 'approved')}
                                                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
                                                >
                                                    Activate
                                                </button>
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {/* EVENTS SECTION */}
                        {/* Pending Events Section */}
                        <div className="mb-12">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-semibold text-amber-800">Pending Events ({pendingEvents.length})</h2>
                                
                                {pendingEvents.length > 0 && (
                                    <div className="flex items-center gap-4">
                                        {/* Select All Checkbox */}
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={allPendingEventsSelected}
                                                ref={(el) => {
                                                    if (el) el.indeterminate = somePendingEventsSelected && !allPendingEventsSelected;
                                                }}
                                                onChange={(e) => handleSelectAllPendingEvents(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">
                                                Select All ({selectedEvents.size})
                                            </span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Bulk Action Buttons */}
                            {selectedEvents.size > 0 && (
                                <div className="flex gap-3 mb-6 p-4 bg-amber-50 rounded-lg">
                                    <span className="text-sm font-medium text-amber-800 self-center">
                                        {selectedEvents.size} selected:
                                    </span>
                                    <button
                                        onClick={() => handleEventBulkAction('approve')}
                                        disabled={bulkActionLoading}
                                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {bulkActionLoading ? 'Processing...' : 'Approve All'}
                                    </button>
                                    <button
                                        onClick={() => handleEventBulkAction('decline')}
                                        disabled={bulkActionLoading}
                                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {bulkActionLoading ? 'Processing...' : 'Decline All'}
                                    </button>
                                    <button
                                        onClick={() => handleEventBulkAction('remove')}
                                        disabled={bulkActionLoading}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {bulkActionLoading ? 'Processing...' : 'Remove All'}
                                    </button>
                                </div>
                            )}

                            {pendingEvents.length === 0 ? (
                                <p className="text-gray-500">No pending events found.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {pendingEvents.map(event => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            isSelected={selectedEvents.has(event.id)}
                                            onSelect={(selected) => handleEventSelect(event.id, selected)}
                                            actionButtons={
                                                <>
                                                    <button
                                                        onClick={() => handleEventStatusChange(event.id, 'public_approved')}
                                                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleEventStatusChange(event.id, 'private_approved')}
                                                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                                                    >
                                                        Decline
                                                    </button>
                                                </>
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Active Events Section */}
                        <div className="mb-12">
                            <h2 className="text-2xl font-semibold text-amber-800 mb-4">Active Events ({approvedEvents.length})</h2>
                            {approvedEvents.length === 0 ? (
                                <p className="text-gray-500">No active events found.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {approvedEvents.map(event => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            actionButtons={
                                                <button
                                                    onClick={() => handleEventStatusChange(event.id, 'private_approved')}
                                                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                                                >
                                                    Deactivate
                                                </button>
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        }>
            <AdminDashboardContent />
        </Suspense>
    );
}

// Venue Card Component for the Admin Dashboard
function VenueCard({ 
    venue, 
    actionButtons, 
    isSelected, 
    onSelect 
}: { 
    venue: AdminVenue;
    actionButtons: React.ReactNode;
    isSelected?: boolean;
    onSelect?: (selected: boolean) => void;
}) {
    return (
        <div className={`flex flex-col rounded-xl overflow-hidden shadow-md bg-white relative ${isSelected ? 'ring-2 ring-amber-500' : ''}`}>
            {/* Selection checkbox for pending venues */}
            {onSelect && (
                <div className="absolute top-3 right-3 z-10">
                    <input
                        type="checkbox"
                        checked={isSelected || false}
                        onChange={(e) => onSelect(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500 bg-white shadow-sm"
                    />
                </div>
            )}

            <div className="relative w-full h-48">
                {venue.image_url ? (
                    <Image
                        src={venue.image_url}
                        alt={venue.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    />
                ) : (
                    <div className="w-full h-full bg-amber-100 flex items-center justify-center">
                        <span className="text-amber-800">No Image</span>
                    </div>
                )}

                {/* Price badge */}
                <div className="absolute bottom-3 left-3 bg-amber-500/90 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {venue.collaboration_type}
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                    <h3 className="font-medium text-lg text-amber-950">{venue.name}</h3>

                    {venue.avg_rating && (
                        <div className="flex items-center gap-1 text-amber-700">
                            <span>★</span>
                            <span className="text-sm">{venue.avg_rating.toFixed(1)}</span>
                        </div>
                    )}
                </div>

                <p className="text-sm text-gray-500 mb-2">
                    {venue.city}{venue.state ? `, ${venue.state}` : ''}
                </p>

                <p className="text-sm text-gray-700 mt-1 mb-4 flex-grow">
                    {venue.description || 'No description available'}
                </p>

                {/* Status indicator */}
                <div className={`inline-flex self-start mb-4 items-center px-3 py-1 rounded-full text-sm font-medium ${venue.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    venue.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                    {venue.status === 'pending' ? 'Pending' :
                        venue.status === 'approved' ? 'Approved' : 'Declined'}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-auto">
                    {actionButtons}
                </div>
            </div>
        </div>
    );
}

// Event Card Component for the Admin Dashboard
function EventCard({ 
    event, 
    actionButtons, 
    isSelected, 
    onSelect 
}: { 
    event: AdminEvent;
    actionButtons: React.ReactNode;
    isSelected?: boolean;
    onSelect?: (selected: boolean) => void;
}) {
    // Get the first event image
    const eventImage = event.event_images && event.event_images.length > 0 
        ? event.event_images[0].image_url 
        : null;

    // Format date
    const eventDate = new Date(event.selected_date).toLocaleDateString();

    // Format capacity
    const capacityText = event.expected_capacity_min && event.expected_capacity_max
        ? `${event.expected_capacity_min}-${event.expected_capacity_max} guests`
        : 'Capacity not specified';

    return (
        <div className={`flex flex-col rounded-xl overflow-hidden shadow-md bg-white relative ${isSelected ? 'ring-2 ring-amber-500' : ''}`}>
            {/* Selection checkbox for pending events */}
            {onSelect && (
                <div className="absolute top-3 right-3 z-10">
                    <input
                        type="checkbox"
                        checked={isSelected || false}
                        onChange={(e) => onSelect(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500 bg-white shadow-sm"
                    />
                </div>
            )}

            <div className="relative w-full h-48">
                {eventImage ? (
                    <Image
                        src={eventImage}
                        alt={event.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    />
                ) : (
                    <div className="w-full h-full bg-amber-100 flex items-center justify-center">
                        <span className="text-amber-800">No Image</span>
                    </div>
                )}

                {/* Event type badge */}
                <div className="absolute bottom-3 left-3 bg-amber-500/90 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {event.event_type}
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-lg text-amber-950">{event.title}</h3>
                </div>

                <p className="text-sm text-gray-500 mb-2">
                    {eventDate}
                    {event.selected_time && ` at ${event.selected_time}`}
                </p>

                <p className="text-sm text-gray-500 mb-2">
                    {event.city ? `${event.city}${event.state ? `, ${event.state}` : ''}` : event.address || 'Location not specified'}
                </p>

                <p className="text-sm text-gray-500 mb-2">
                    {capacityText}
                </p>

                <p className="text-sm text-gray-700 mt-1 mb-4 flex-grow">
                    {event.description || 'No description available'}
                </p>

                {/* Status indicator */}
                <div className={`inline-flex self-start mb-4 items-center px-3 py-1 rounded-full text-sm font-medium ${
                    event.event_status === 'private_pending' || event.event_status === 'public_pending' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                    {event.event_status === 'private_pending' ? 'Private Pending' :
                        event.event_status === 'public_pending' ? 'Public Pending' :
                        event.event_status === 'private_approved' ? 'Private Approved' : 'Public Approved'}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-auto">
                    {actionButtons}
                </div>
            </div>
        </div>
    );
}

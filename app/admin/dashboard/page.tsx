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
            <div className="min-h-screen bg-white">
                <NavBar />
                <div className="flex justify-center items-center min-h-[60vh]">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#06048D]"></div>
                        <p className="mt-4 text-gray-600">Loading dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white">
                <NavBar />
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-md mx-auto">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                            <div className="text-red-400 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Dashboard</h2>
                            <p className="text-red-600 mb-4">{error}</p>
                            <button
                                onClick={fetchData}
                                className="px-4 py-2 bg-[#06048D] text-white rounded-md hover:bg-[#050370] transition font-medium"
                            >
                                Try Again
                            </button>
                        </div>
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
                    <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                    <p className="text-gray-600">Manage spaces and events</p>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg w-fit">
                    <Link
                        href="/admin/dashboard?view=spaces"
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                            view === 'spaces'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Spaces
                    </Link>
                    <Link
                        href="/admin/dashboard?view=events"
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                            view === 'events'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
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
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-semibold text-gray-800">Pending Spaces ({pendingVenues.length})</h2>
                                
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
                                                className="w-4 h-4 rounded border-gray-300 text-[#06048D] focus:ring-[#06048D]"
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
                                <div className="flex gap-3 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <span className="text-sm font-medium text-gray-800 self-center">
                                        {selectedVenues.size} selected:
                                    </span>
                                    <button
                                        onClick={() => handleBulkAction('approve')}
                                        disabled={bulkActionLoading}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                    >
                                        {bulkActionLoading ? 'Processing...' : 'Approve All'}
                                    </button>
                                    <button
                                        onClick={() => handleBulkAction('decline')}
                                        disabled={bulkActionLoading}
                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                    >
                                        {bulkActionLoading ? 'Processing...' : 'Decline All'}
                                    </button>
                                    <button
                                        onClick={() => handleBulkAction('remove')}
                                        disabled={bulkActionLoading}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                    >
                                        {bulkActionLoading ? 'Processing...' : 'Remove All'}
                                    </button>
                                </div>
                            )}

                            {pendingVenues.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-gray-400 mb-4">
                                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">No pending spaces</h3>
                                    <p className="text-gray-500">All spaces have been reviewed</p>
                                </div>
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
                                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm font-medium flex-1"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(venue.id, 'declined')}
                                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm font-medium flex-1"
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
                            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Active Spaces ({approvedVenues.length})</h2>
                            {approvedVenues.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-gray-400 mb-4">
                                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7m14 0V5a2 2 0 00-2-2H7a2 2 0 00-2 2v2m14 0H3" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">No active spaces</h3>
                                    <p className="text-gray-500">Approved spaces will appear here</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {approvedVenues.map(venue => (
                                        <VenueCard
                                            key={venue.id}
                                            venue={venue}
                                            actionButtons={
                                                <button
                                                    onClick={() => handleStatusChange(venue.id, 'declined')}
                                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm font-medium w-full"
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
                            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Declined Spaces ({declinedVenues.length})</h2>
                            {declinedVenues.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-gray-400 mb-4">
                                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">No declined spaces</h3>
                                    <p className="text-gray-500">Declined spaces will appear here</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {declinedVenues.map(venue => (
                                        <VenueCard
                                            key={venue.id}
                                            venue={venue}
                                            actionButtons={
                                                <button
                                                    onClick={() => handleStatusChange(venue.id, 'approved')}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm font-medium w-full"
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
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-semibold text-gray-800">Pending Events ({pendingEvents.length})</h2>
                                
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
                                                className="w-4 h-4 rounded border-gray-300 text-[#06048D] focus:ring-[#06048D]"
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
                                <div className="flex gap-3 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <span className="text-sm font-medium text-gray-800 self-center">
                                        {selectedEvents.size} selected:
                                    </span>
                                    <button
                                        onClick={() => handleEventBulkAction('approve')}
                                        disabled={bulkActionLoading}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                    >
                                        {bulkActionLoading ? 'Processing...' : 'Approve All'}
                                    </button>
                                    <button
                                        onClick={() => handleEventBulkAction('decline')}
                                        disabled={bulkActionLoading}
                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                    >
                                        {bulkActionLoading ? 'Processing...' : 'Decline All'}
                                    </button>
                                    <button
                                        onClick={() => handleEventBulkAction('remove')}
                                        disabled={bulkActionLoading}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                    >
                                        {bulkActionLoading ? 'Processing...' : 'Remove All'}
                                    </button>
                                </div>
                            )}

                            {pendingEvents.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-gray-400 mb-4">
                                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">No pending events</h3>
                                    <p className="text-gray-500">All events have been reviewed</p>
                                </div>
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
                                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm font-medium flex-1"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleEventStatusChange(event.id, 'private_approved')}
                                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm font-medium flex-1"
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
                            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Active Events ({approvedEvents.length})</h2>
                            {approvedEvents.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-gray-400 mb-4">
                                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">No active events</h3>
                                    <p className="text-gray-500">Approved events will appear here</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {approvedEvents.map(event => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            actionButtons={
                                                <button
                                                    onClick={() => handleEventStatusChange(event.id, 'private_approved')}
                                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm font-medium w-full"
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
    // Get the primary venue image
    const venueImage = venue.venue_images && venue.venue_images.length > 0
        ? venue.venue_images.sort((a: { sort_order?: number }, b: { sort_order?: number }) => (a.sort_order || 0) - (b.sort_order || 0))[0].image_url
        : venue.image_url;

    return (
        <div className={`bg-[#F6F8FC] rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden relative ${isSelected ? 'ring-2 ring-[#06048D]' : ''}`}>
            {/* Selection checkbox for pending venues */}
            {onSelect && (
                <div className="absolute top-3 right-3 z-10">
                    <input
                        type="checkbox"
                        checked={isSelected || false}
                        onChange={(e) => onSelect(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-[#06048D] focus:ring-[#06048D] bg-white shadow-sm"
                    />
                </div>
            )}

            <div className="relative w-full h-48">
                {venueImage ? (
                    <Image
                        src={venueImage}
                        alt={venue.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">No Image</span>
                    </div>
                )}

                {/* Collaboration type badge */}
                <div className="absolute bottom-3 left-3 bg-[#273287] text-white px-3 py-1 rounded-full text-sm font-medium">
                    {venue.collaboration_type}
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-lg text-gray-900">{venue.name}</h3>

                    {venue.avg_rating && (
                        <div className="flex items-center gap-1 text-yellow-500">
                            <span>★</span>
                            <span className="text-sm text-gray-600">{venue.avg_rating.toFixed(1)}</span>
                        </div>
                    )}
                </div>

                <p className="text-sm text-gray-500 mb-2">
                    {venue.city}{venue.state ? `, ${venue.state}` : ''}
                </p>

                <p className="text-sm text-gray-700 mt-1 mb-4 flex-grow line-clamp-3">
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
        <div className={`bg-[#F6F8FC] rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden relative ${isSelected ? 'ring-2 ring-[#06048D]' : ''}`}>
            {/* Selection checkbox for pending events */}
            {onSelect && (
                <div className="absolute top-3 right-3 z-10">
                    <input
                        type="checkbox"
                        checked={isSelected || false}
                        onChange={(e) => onSelect(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-[#06048D] focus:ring-[#06048D] bg-white shadow-sm"
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
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">No Image</span>
                    </div>
                )}

                {/* Event type badge */}
                <div className="absolute bottom-3 left-3 bg-[#273287] text-white px-3 py-1 rounded-full text-sm font-medium">
                    {event.event_type}
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-lg text-gray-900">{event.title}</h3>
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

                <p className="text-sm text-gray-700 mt-1 mb-4 flex-grow line-clamp-3">
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

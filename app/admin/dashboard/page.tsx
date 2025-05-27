'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Venue } from '@/types/Venue';
import NavBar from '@/app/components/NavBar';

// Extended Venue type with status
interface AdminVenue extends Venue {
    status?: 'pending' | 'approved' | 'declined';
}

export default function AdminDashboard() {
    const [venues, setVenues] = useState<AdminVenue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch all venues on component mount
    useEffect(() => {
        async function fetchVenues() {
            try {
                setLoading(true);
                const response = await fetch('/api/venues');

                if (!response.ok) {
                    throw new Error('Failed to fetch venues');
                }

                const data = await response.json();
                // Add default status if not present
                const venuesWithStatus = data.map((venue: AdminVenue) => ({
                    ...venue,
                    status: venue.status || 'pending'
                }));

                setVenues(venuesWithStatus);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                console.error('Error fetching venues:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchVenues();
    }, []);

    // Handle status change
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
                fetchVenues();
                return prevVenues;
            });
        }
    };

    // Function to refetch venues
    const fetchVenues = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/venues');

            if (!response.ok) {
                throw new Error('Failed to fetch venues');
            }

            const data = await response.json();
            const venuesWithStatus = data.map((venue: AdminVenue) => ({
                ...venue,
                status: venue.status || 'pending'
            }));

            setVenues(venuesWithStatus);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error fetching venues:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filter venues by status
    const pendingVenues = venues.filter(venue => venue.status === 'pending');
    const approvedVenues = venues.filter(venue => venue.status === 'approved');
    const declinedVenues = venues.filter(venue => venue.status === 'declined');

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
                            onClick={fetchVenues}
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
                <h1 className="text-3xl font-bold text-amber-900 mb-8">Admin Dashboard</h1>

                {/* Pending Spaces Section */}
                <div className="mb-12">
                    <h2 className="text-2xl font-semibold text-amber-800 mb-4">Pending Spaces ({pendingVenues.length})</h2>
                    {pendingVenues.length === 0 ? (
                        <p className="text-gray-500">No pending spaces found.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pendingVenues.map(venue => (
                                <VenueCard
                                    key={venue.id}
                                    venue={venue}
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
                <div>
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
            </div>
        </div>
    );
}

// Venue Card Component for the Admin Dashboard
function VenueCard({ venue, actionButtons }: { venue: AdminVenue, actionButtons: React.ReactNode }) {
    // Format price display


    return (
        <div className="flex flex-col rounded-xl overflow-hidden shadow-md bg-white">
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

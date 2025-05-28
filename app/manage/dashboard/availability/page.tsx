'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../../../context/UserContext';
import { useVenues } from '../../../lib/queries';
import NavBar from '../../../components/NavBar';
import Link from 'next/link';
import AvailabilityCalendar from '../../../components/AvailabilityCalendar';

export default function VenueAvailabilityPage() {
    const { user, isLoading: userLoading } = useUser();
    const { data: venues = [], isLoading: venuesLoading } = useVenues();
    const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);

    // Get only venues owned by the current user
    const userVenues = venues.filter(venue => venue.owner_id === user?.id);

    // Set the first venue as selected by default when venues are loaded
    useEffect(() => {
        if (userVenues.length > 0 && !selectedVenueId) {
            setSelectedVenueId(userVenues[0].id);
        }
    }, [userVenues, selectedVenueId]);

    if (userLoading || venuesLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ca0013]"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <h1 className="text-2xl font-bold mb-4">Please sign in to view your dashboard</h1>
                <Link href="/auth/sign-in" className="bg-black text-white px-6 py-2 rounded-md">
                    Sign in
                </Link>
            </div>
        );
    }

    // Check if the user has any venues
    if (userVenues.length === 0) {
        return (
            <div className="flex flex-col min-h-screen">
                <NavBar />
                <div className="container mx-auto px-4 py-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">Venue Availability</h1>
                        <p className="text-gray-600">Manage your venue&apos;s availability calendar</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <h3 className="text-lg font-medium mb-2">You don&apos;t have any venues yet</h3>
                        <p className="text-gray-600 mb-4">Add a venue to manage its availability.</p>
                        <Link
                            href="/submit-venue"
                            className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800"
                        >
                            Add a Venue
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <NavBar />

            <div className="container mx-auto px-4 py-8">
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Venue Availability</h1>
                    <p className="text-gray-600 text-sm md:text-base hidden md:block">Manage your venue&apos;s availability calendar</p>
                </div>

                <div className="mb-4 md:mb-6">
                    <label htmlFor="venue-select" className="block text-sm font-medium text-gray-700 mb-1">
                        Select Venue
                    </label>
                    <select
                        id="venue-select"
                        value={selectedVenueId || ''}
                        onChange={(e) => setSelectedVenueId(Number(e.target.value))}
                        className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {userVenues.map((venue) => (
                            <option key={venue.id} value={venue.id}>
                                {venue.name}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedVenueId ? (
                    <AvailabilityCalendar venueId={selectedVenueId} />
                ) : (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <p className="text-gray-600">Please select a venue to view its availability.</p>
                    </div>
                )}
            </div>
        </div>
    );
} 
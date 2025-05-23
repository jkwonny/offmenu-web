'use client';

import { useSearchParams } from 'next/navigation';
import { useUser } from '../../context/UserContext';
import { useVenues, useEvents } from '../../lib/queries';
import NavBar from '../../components/NavBar';
import Link from 'next/link';
import Image from 'next/image';
import { LuMapPin } from 'react-icons/lu';
import { Suspense } from 'react';

// Define types
interface VenueImage {
    image_url: string;
    sort_order?: number;
}

interface Event {
    id: string;
    title: string;
    event_type: string;
    selected_date: string;
    selected_time?: string;
    description?: string;
    assets_needed?: string[];
    expected_capacity_min?: number;
    expected_capacity_max?: number;
    image_url: string;
    event_photos?: VenueImage[];
    address: string;
    pricing_type: string;
    price?: number;
    user_id?: string;
    owner_id?: string;
    status?: string;
}

function DashboardTabs({ view }: { view: string }) {
    return (
        <div className="flex overflow-hidden rounded-full">
            <Link
                href="/manage/dashboard?view=spaces"
                className={`px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${view === 'spaces'
                    ? 'bg-[#06048D] text-white'
                    : 'bg-white text-black'
                    }`}
            >
                Spaces
            </Link>
            <Link
                href="/manage/dashboard?view=popups"
                className={`px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${view === 'popups'
                    ? 'bg-[#06048D] text-white'
                    : 'bg-white text-black'
                    }`}
            >
                Pop-ups
            </Link>
        </div>
    );
}

function DashboardContent() {
    const searchParams = useSearchParams();
    const { user, isLoading: userLoading } = useUser();
    const view = searchParams.get('view') || 'spaces';

    // Fetch venues and events data
    const { data: venues = [], isLoading: venuesLoading } = useVenues();
    const { data: events = [], isLoading: eventsLoading } = useEvents<Event[]>();

    // Filter venues and events to show only those owned by the current user
    const userVenues = venues.filter(venue => venue.owner_id === user?.id);
    const userEvents = events.filter(event => event.owner_id === user?.id || event.user_id === user?.id);

    const isLoading = userLoading || (view === 'spaces' ? venuesLoading : eventsLoading);

    if (userLoading) {
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

    return (
        <div className="flex flex-col min-h-screen">
            <NavBar />

            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
                    <p className="text-gray-600">Manage your spaces and pop-ups</p>
                </div>

                <div className="mb-6 flex justify-center">
                    <DashboardTabs view={view} />
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ca0013]"></div>
                    </div>
                ) : view === 'spaces' ? (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">My Spaces ({userVenues.length})</h2>
                            <Link
                                href="/submit-space"
                                className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
                            >
                                + Add New Space
                            </Link>
                        </div>

                        {userVenues.length === 0 ? (
                            <div className="bg-gray-50 rounded-lg p-8 text-center">
                                <h3 className="text-lg font-medium mb-2">You don&apos;t have any spaces yet</h3>
                                <p className="text-gray-600 mb-4">Start hosting by adding your first space.</p>
                                <Link
                                    href="/submit-space"
                                    className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800"
                                >
                                    Add a Space
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {userVenues.map((venue) => {
                                    const venueImages = venue.venue_images && venue.venue_images.length > 0
                                        ? venue.venue_images
                                        : [{ image_url: venue.image_url }];

                                    const imageUrl = typeof venueImages[0] === 'string'
                                        ? venueImages[0]
                                        : venueImages[0].image_url;

                                    return (
                                        <div
                                            key={venue.id}
                                            className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                                        >
                                            <div className="aspect-[4/3] relative">
                                                <Image
                                                    src={imageUrl}
                                                    alt={venue.name}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-medium text-lg mb-1">{venue.name}</h3>
                                                <div className="flex items-center text-gray-600 text-sm mb-2">
                                                    <LuMapPin className="mr-1" />
                                                    <span>{venue.address}</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-4">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${venue.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                        venue.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {venue.status?.charAt(0).toUpperCase() + venue.status?.slice(1)}
                                                    </span>
                                                    <div className="flex space-x-2">
                                                        <Link
                                                            href={`/venue/${venue.id}`}
                                                            className="text-black hover:underline text-sm"
                                                        >
                                                            View
                                                        </Link>
                                                        <Link
                                                            href="/manage/dashboard/availability"
                                                            className="text-black hover:underline text-sm"
                                                        >
                                                            Availability
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">My Pop-ups ({userEvents.length})</h2>
                            <Link
                                href="/submit-event"
                                className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
                            >
                                + Create New Pop-up
                            </Link>
                        </div>

                        {userEvents.length === 0 ? (
                            <div className="bg-gray-50 rounded-lg p-8 text-center">
                                <h3 className="text-lg font-medium mb-2">You don&apos;t have any pop-ups yet</h3>
                                <p className="text-gray-600 mb-4">Create your first event pop-up to get started.</p>
                                <Link
                                    href="/submit-event"
                                    className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800"
                                >
                                    Create a Pop-up
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {userEvents.map((event) => {
                                    const eventImage = event.event_photos && event.event_photos.length > 0
                                        ? event.event_photos[0].image_url
                                        : event.image_url || '/event-placeholder.jpg';

                                    return (
                                        <div
                                            key={event.id}
                                            className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                                        >
                                            <div className="aspect-[4/3] relative">
                                                <Image
                                                    src={eventImage}
                                                    alt={event.title}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-medium text-lg mb-1">{event.title}</h3>
                                                <div className="flex items-center text-gray-600 text-sm mb-2">
                                                    <LuMapPin className="mr-1" />
                                                    <span>{event.address}</span>
                                                </div>
                                                <div className="text-sm text-gray-600 mb-2">
                                                    <p>{event.selected_date} {event.selected_time ? `• ${event.selected_time}` : ''}</p>
                                                </div>
                                                <div className="flex justify-between items-center mt-4">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${event.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                        event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            event.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                                                event.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Draft'}
                                                    </span>
                                                    <Link
                                                        href={`/events/${event.id}`}
                                                        className="text-black hover:underline text-sm"
                                                    >
                                                        View Details
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Dashboard() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ca0013]"></div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
'use client';

import { useSearchParams } from 'next/navigation';
import { useUser } from '../../context/UserContext';
import { useVenues, useEvents, useClaimableVenues } from '../../lib/queries';
import { useBookingRequests } from '../../lib/queries/chat';
import NavBar from '../../components/NavBar';
import Link from 'next/link';
import Image from 'next/image';
import { LuMapPin, LuCalendar, LuUser, LuMessageCircle, LuCheck, LuX } from 'react-icons/lu';
import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Event } from '@/app/types/event';
import { supabase } from '../../lib/supabase';

function DashboardContent() {
    const searchParams = useSearchParams();
    const { user, isLoading: userLoading } = useUser();
    const view = searchParams.get('view') || 'spaces';
    const router = useRouter();
    const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
    const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    // Fetch venues and events data
    const { data: venues = [], isLoading: venuesLoading } = useVenues();
    const { data: events = [], isLoading: eventsLoading } = useEvents<Event[]>();
    const { data: claimableVenues = []} = useClaimableVenues(user?.email);

    // Filter venues and events to show only those owned by the current user
    const userVenues = venues.filter(venue => venue.owner_id === user?.id);
    const userEvents = events.filter(event => event.owner_id === user?.id || event.user_id === user?.id);

    // Get venue IDs for booking requests
    const userVenueIds = userVenues.map(venue => parseInt(venue.id));
    const { data: bookingRequests = [], isLoading: requestsLoading } = useBookingRequests(userVenueIds);

    // Filter requests based on selected tab
    const filteredRequests = bookingRequests.filter(request => {
        if (requestFilter === 'all') return true;
        if (requestFilter === 'pending') return request.status === 'pending';
        if (requestFilter === 'approved') return request.status === 'approved';
        if (requestFilter === 'rejected') return request.status === 'rejected';
        return true;
    });

    const isLoading = userLoading || (view === 'spaces' ? venuesLoading : eventsLoading);

    const handleRequestAction = async (requestId: string, action: 'approved' | 'rejected') => {
        setProcessingRequests(prev => new Set(prev).add(requestId));

        try {
            const response = await fetch('/api/booking/approve', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    booking_request_id: requestId,
                    status: action
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update request');
            }

            // Refresh the booking requests data
            window.location.reload(); // Simple refresh for now
        } catch (error) {
            console.error('Error updating request:', error);
            alert('Failed to update request. Please try again.');
        } finally {
            setProcessingRequests(prev => {
                const newSet = new Set(prev);
                newSet.delete(requestId);
                return newSet;
            });
        }
    };

    const handleClaimVenue = async (venueId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('Please sign in to claim venues');
                return;
            }

            const response = await fetch('/api/venues/claim', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ venueId }),
            });

            const result = await response.json();

            if (response.ok) {
                alert('Venue claimed successfully!');
                window.location.reload(); // Refresh to show updated data
            } else {
                alert(result.error || 'Failed to claim venue');
            }
        } catch (error) {
            console.error('Error claiming venue:', error);
            alert('Failed to claim venue. Please try again.');
        }
    };

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

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ca0013]"></div>
                    </div>
                ) : view === 'spaces' ? (
                    <div>
                        {/* Booking Requests Section */}
                        {userVenueIds.length > 0 && (
                            <div className="mb-8">
                                {requestsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ca0013]"></div>
                                        <span className="ml-2 text-gray-600">Loading requests...</span>
                                    </div>
                                ) : bookingRequests.length > 0 ? (
                                    <>
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-xl font-semibold text-[#ca0013]">
                                                📋 Booking Requests ({bookingRequests.length})
                                            </h2>
                                        </div>

                                        {/* Filter Tabs */}
                                        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
                                            <button
                                                onClick={() => setRequestFilter('all')}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${requestFilter === 'all'
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                            >
                                                All ({bookingRequests.length})
                                            </button>
                                            <button
                                                onClick={() => setRequestFilter('pending')}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${requestFilter === 'pending'
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                            >
                                                Pending ({bookingRequests.filter(r => r.status === 'pending').length})
                                            </button>
                                            <button
                                                onClick={() => setRequestFilter('approved')}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${requestFilter === 'approved'
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                            >
                                                Upcoming ({bookingRequests.filter(r => r.status === 'approved').length})
                                            </button>
                                            <button
                                                onClick={() => setRequestFilter('rejected')}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${requestFilter === 'rejected'
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                            >
                                                Declined ({bookingRequests.filter(r => r.status === 'rejected').length})
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                                            {filteredRequests.map((request) => (
                                                <div
                                                    key={request.id}
                                                    className="bg-white rounded-lg border-2 border-gray-200 border-opacity-20 p-4 hover:shadow-lg transition-shadow cursor-pointer"
                                                    onClick={() => request.room_id && router.push(`/chat?chatRoomId=${request.room_id}`)}
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center">
                                                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                                                                <LuUser className="w-4 h-4 text-gray-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm">{request.sender_name}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    Date Requested: {new Date(request.created_at).toLocaleDateString('en-US', {
                                                                        timeZone: 'America/New_York',
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: 'numeric'
                                                                    })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-xs px-2 py-1 rounded-full ${request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                                request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {request.status === 'pending' ? 'Pending' :
                                                                request.status === 'approved' ? 'Approved' :
                                                                    request.status === 'rejected' ? 'Declined' :
                                                                        request.status}
                                                        </span>
                                                    </div>

                                                    <div className="mb-3">
                                                        <p className="text-sm font-medium mb-1">Wants to book: {request.venue_name}</p>
                                                        <div className="flex items-center text-xs text-gray-600 mb-1">
                                                            <LuCalendar className="w-3 h-3 mr-1" />
                                                            <span>
                                                                {(() => {
                                                                    if (request.selected_date) {
                                                                        const dateStr = request.selected_date;
                                                                        const timeStr = request.selected_time || '00:00:00';

                                                                        const dateTime = new Date(`${dateStr}T${timeStr}`);

                                                                        return dateTime.toLocaleDateString('en-US', {
                                                                            timeZone: 'America/New_York',
                                                                            weekday: 'short',
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        }) + (request.selected_time ? ` • ${dateTime.toLocaleTimeString('en-US', {
                                                                            timeZone: 'America/New_York',
                                                                            hour: 'numeric',
                                                                            minute: '2-digit',
                                                                            hour12: true
                                                                        })}` : '');
                                                                    }

                                                                    if (request.event_date) {
                                                                        const eventDate = new Date(request.event_date);
                                                                        return eventDate.toLocaleDateString('en-US', {
                                                                            timeZone: 'America/New_York',
                                                                            weekday: 'short',
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        });
                                                                    }

                                                                    return 'Date TBD';
                                                                })()}
                                                            </span>
                                                            {request.guest_count && (
                                                                <>
                                                                    <span className="mx-2">•</span>
                                                                    <LuUser className="w-3 h-3 mr-1" />
                                                                    <span>{request.guest_count} guests</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        {request.message && (
                                                            <p className="text-xs text-gray-600 overflow-hidden" style={{
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical'
                                                            }}>
                                                                &quot;{request.message.substring(0, 80)}...&quot;
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                                        {request.status === 'pending' ? (
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRequestAction(request.id, 'approved');
                                                                    }}
                                                                    disabled={processingRequests.has(request.id)}
                                                                    className="flex items-center px-3 py-1 bg-green-100 text-green-800 text-xs rounded-md hover:bg-green-200 disabled:opacity-50"
                                                                >
                                                                    <LuCheck className="w-3 h-3 mr-1" />
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRequestAction(request.id, 'rejected');
                                                                    }}
                                                                    disabled={processingRequests.has(request.id)}
                                                                    className="flex items-center px-3 py-1 bg-red-100 text-red-800 text-xs rounded-md hover:bg-red-200 disabled:opacity-50"
                                                                >
                                                                    <LuX className="w-3 h-3 mr-1" />
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-gray-500">
                                                                {request.status === 'approved' ? '✅ Approved' :
                                                                    request.status === 'rejected' ? '❌ Declined' : ''}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center text-xs text-gray-500">
                                                            <LuMessageCircle className="w-3 h-3 mr-1" />
                                                            Chat →
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Empty state for filtered results */}
                                        {filteredRequests.length === 0 && (
                                            <div className="bg-gray-50 rounded-lg p-8 text-center">
                                                <h3 className="text-lg font-medium mb-2">
                                                    {requestFilter === 'pending' ? 'No pending requests' :
                                                        requestFilter === 'approved' ? 'No upcoming bookings' :
                                                            requestFilter === 'rejected' ? 'No declined requests' :
                                                                'No requests found'}
                                                </h3>
                                                <p className="text-gray-600">
                                                    {requestFilter === 'pending' ? 'New booking requests will appear here.' :
                                                        requestFilter === 'approved' ? 'Approved bookings will appear here.' :
                                                            requestFilter === 'rejected' ? 'Declined requests will appear here.' :
                                                                'Booking requests will appear here when users contact you.'}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                                        <h3 className="text-lg font-medium mb-2">No booking requests yet</h3>
                                        <p className="text-gray-600 mb-4">Booking requests will appear here when users contact you about your spaces.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Claimable Venues Section */}
                        {claimableVenues.length > 0 && (
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-semibold text-blue-600">
                                        🏢 Venues Available to Claim ({claimableVenues.length})
                                    </h2>
                                </div>
                                
                                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                                    <p className="text-blue-800 text-sm">
                                        <strong>Good news!</strong> We found venues that were submitted for your email address. 
                                        Click &quot;Claim Venue&quot; to take ownership and start managing them.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {claimableVenues.map((venue: { id: string; name: string; venue_images?: { image_url: string }[]; address?: string; city: string }) => {
                                        const venueImage = venue.venue_images && venue.venue_images.length > 0
                                            ? venue.venue_images[0].image_url
                                            : null;

                                        return (
                                            <div key={venue.id} className="bg-white rounded-lg overflow-hidden shadow-md border-2 border-blue-200">
                                                {venueImage && (
                                                    <div className="aspect-[4/3] relative">
                                                        <Image
                                                            src={venueImage}
                                                            alt={venue.name}
                                                            fill
                                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <div className="p-4">
                                                    <h3 className="font-medium text-lg mb-1">{venue.name}</h3>
                                                    <div className="flex items-center text-gray-600 text-sm mb-3">
                                                        <LuMapPin className="mr-1" />
                                                        <span>{venue.address || venue.city}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleClaimVenue(venue.id)}
                                                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                                                    >
                                                        Claim Venue
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* My Spaces Section */}
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
                                                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                                                onClick={() => router.push(`/spaces/${venue.id}`)}
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
                                                                href={`/spaces/${venue.id}`}
                                                                className="text-black hover:underline text-sm p-2 rounded-md bg-gray-100"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                Manage
                                                            </Link>
                                                            <Link
                                                                href="/manage/dashboard/availability"
                                                                className="text-black hover:underline text-sm p-2 rounded-md bg-gray-100"
                                                                onClick={(e) => e.stopPropagation()}
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
                                    const eventImage = event.event_images && event.event_images.length > 0
                                        ? event.event_images[0].image_url
                                        : ""

                                    const privateEvent = event.event_status === 'private_pending' || event.event_type === 'private_approved'
                                    const pendingEvent = event.event_status === 'private_pending' || event.event_status === 'public_approved'
                                    return (
                                        <div
                                            key={event.id}
                                            className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                                            onClick={() => router.push(`/event/${event.id}`)}
                                        >
                                            {eventImage.length > 0 && <div className="aspect-[4/3] relative">
                                                <Image
                                                    src={eventImage as string}
                                                    alt={event.title}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                    className="object-cover"
                                                />
                                            </div>}
                                            <div className="p-4">
                                                <h3 className="font-medium text-lg mb-1">{event.title}</h3>
                                                <div className="flex items-center text-gray-600 text-sm mb-2">
                                                    <LuMapPin className="mr-1" />
                                                    <span>{event.address ??
                                                        "TBD"}</span>
                                                </div>
                                                <div className="flex items-center text-gray-600 text-sm mb-2">
                                                    <LuCalendar className="mr-1" />
                                                    <span>
                                                        {event.selected_date && new Date(event.selected_date).toLocaleDateString('en-US', {
                                                            weekday: 'short',
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                        {event.selected_time && ` • ${new Date(`2000-01-01T${event.selected_time}`).toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                            hour12: true
                                                        })}`}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center mt-4">
                                                    {!privateEvent && <span className={`p-2 text-xs rounded-full ${pendingEvent ? 'bg-yellow-200 text-black' : 'bg-green-100 text-green-800'}`}>
                                                        {pendingEvent ? 'Pending' : 'Approved'}
                                                    </span>}

                                                    {privateEvent && <span className={`p-2 text-xs rounded-full ${privateEvent ? 'bg-[#AFDAFF] text-black' : 'bg-green-100 text-green-800'}`}>
                                                        {privateEvent ? 'Private Event' : 'Public Event'}
                                                    </span>}
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
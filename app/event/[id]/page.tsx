'use client'

import { ChevronLeft, Clock, MapPin, Edit, Trash2, CheckCircle } from 'lucide-react';
import { useUser } from '@/app/context/UserContext';
import { useEffect, useState, use } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import NavBar from '@/app/components/NavBar';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import VenueRequestsList from './components/VenueRequestsList';
import { Event } from '@/app/types/event';

interface EventPageProps {
    params: Promise<{ id: string }>;
}

export default function EventPage({ params: paramsPromise }: EventPageProps) {
    const params = use(paramsPromise);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [eventData, setEventData] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const { user } = useUser();
    
    const privateEvent = eventData?.event_status === 'private_pending' || eventData?.event_type === 'private_approved'
    const pendingEvent = eventData?.event_status === 'private_pending' || eventData?.event_status === 'public_approved'
    const isOwner = eventData && user && eventData.user_id == user.id;

    // Check if event has venue requests (no confirmed address)
    const hasVenueRequests = eventData && (!eventData.address || eventData.address === 'Address TBD.');

    // Handle success parameters from URL
    const successParam = searchParams.get('success');
    const venuesParam = searchParams.get('venues');

    console.log('eventData', eventData);
    console.log('user', user);

    useEffect(() => {
        // Show success message if redirected from submit form
        if (successParam === 'created' && venuesParam) {
            setShowSuccessMessage(true);
            // Auto-hide after 5 seconds
            const timer = setTimeout(() => {
                setShowSuccessMessage(false);
                // Clean up URL parameters
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }, 5000);
            
            return () => clearTimeout(timer);
        }
    }, [successParam, venuesParam]);

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!eventData) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/events/${params.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error: ${response.status}`);
            }

            // On successful deletion, redirect to dashboard events view
            router.push('/manage/dashboard?view=events');
            // Note: We don't show success message here since we're redirecting
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
                alert(`Failed to delete event: ${err.message}`);
            } else {
                setError('An unknown error occurred while deleting the event.');
                alert('An unknown error occurred while deleting the event.');
            }
            console.error("Failed to delete event:", err);
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
    };

    const fetchEvent = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/events/${params.id}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error: ${response.status}`);
            }
            const data = await response.json();
            setEventData(data);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred');
            }
            console.error("Failed to fetch event:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (params.id) {
            fetchEvent();
        }
    }, [params.id]);

    // Callback to refresh event data when venue is accepted
    const handleEventUpdate = () => {
        fetchEvent();
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-100 flex justify-center items-center"><p>Loading event details...</p></div>;
    }

    if (error) {
        return <div className="min-h-screen bg-gray-100 flex justify-center items-center"><p>Error loading event: {error}</p></div>;
    }

    if (!eventData) {
        return <div className="min-h-screen bg-gray-100 flex justify-center items-center"><p>Event not found.</p></div>;
    }

    const formatDateTime = () => {
        if (!eventData.selected_date) return 'Date not available';
        let dateStr = new Date(eventData.selected_date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        if (eventData.selected_time) {
            dateStr += `, ${eventData.selected_time}`;
        }
        return dateStr;
    };

    //     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
    //     {/* Number of guests card */}
    //     <div className="bg-stone-100 p-6 rounded-xl shadow flex justify-between items-center">
    //         <div>
    //             <p className="text-sm text-gray-600 mb-1">Number of guests</p>
    //             <p className="text-3xl font-semibold text-gray-900">{eventData.expected_capacity_max || 'N/A'}</p>
    //         </div>
    //         <Users size={32} className="text-blue-500" />
    //     </div>
    //     {/* Free places left card */}
    //     <div className="bg-stone-100 p-6 rounded-xl shadow flex justify-between items-center">
    //         <div>
    //             <p className="text-sm text-gray-600 mb-1">Free places left</p>
    //             <p className="text-3xl font-semibold text-gray-900">N/A</p>
    //         </div>
    //         {/* Placeholder for seat icon */}
    //         <div className="w-8 h-8 bg-blue-500 rounded"></div>
    //     </div>
    // </div>
    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <NavBar />

            {/* Success Message */}
            {showSuccessMessage && venuesParam && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4">
                    <div className="p-4 rounded-lg bg-green-50 text-green-800 border border-green-200 shadow-lg">
                        <div className="flex items-center">
                            <CheckCircle size={20} className="mr-3 text-green-600" />
                            <div>
                                <h4 className="font-semibold">Event Created Successfully!</h4>
                                <p className="text-sm">
                                    Your event has been created and messages sent to {venuesParam} venues. 
                                    Check the &quot;List of Spaces&quot; below to track responses.
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowSuccessMessage(false)}
                            className="mt-2 text-sm underline hover:no-underline"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 flex-grow">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-gray-600 hover:text-gray-800 mb-6 cursor-pointer"
                >
                    <ChevronLeft size={20} className="mr-1" />
                    Back
                </button>

                {/* Event Status Tags */}
                <div className="flex space-x-2 mb-4">
                    <div className="flex justify-between items-center mt-4">
                        {!privateEvent && <span className={`p-2 text-xs rounded-full ${pendingEvent ? 'bg-yellow-200 text-black' : 'bg-green-100 text-green-800'}`}>
                            {pendingEvent ? 'Pending' : 'Approved'}
                        </span>}

                        {privateEvent && <span className={`p-2 text-xs rounded-full ${privateEvent ? 'bg-[#AFDAFF] text-black' : 'bg-green-100 text-green-800'}`}>
                            {privateEvent ? 'Private Event' : 'Public Event'}
                        </span>}
                    </div>
                </div>

                {/* Event Name */}
                <h2 className="text-4xl font-bold text-gray-900 mb-3">{eventData.title}</h2>

                {/* Event Links */}
                {(eventData.website || eventData.instagram_handle) && (
                    <div className="flex items-center gap-4 mb-3">
                        {eventData.instagram_handle && (
                            <a
                                href={`https://instagram.com/${eventData.instagram_handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                                title={`@${eventData.instagram_handle}`}
                            >
                                <div className="rounded-full p-2 bg-[linear-gradient(315deg,_#FBE18A_0.96%,_#FCBB45_21.96%,_#F75274_38.96%,_#D53692_52.96%,_#8F39CE_74.96%,_#5B4FE9_100.96%)]">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                    </svg>
                                </div>
                            </a>
                        )}

                        {eventData.website && (
                            <a
                                href={eventData.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                                title="Visit Website"
                            >
                                <div className="rounded-full p-2 bg-gradient-to-br from-gray-100 to-gray-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" className="w-5 h-5">
                                        <path d="M21.721 12.752a9.711 9.711 0 00-.945-5.003 12.754 12.754 0 01-4.339 2.708 18.991 18.991 0 01-.214 4.772 17.165 17.165 0 005.498-2.477zM14.634 15.55a17.324 17.324 0 00.332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 00.332 4.647 17.385 17.385 0 005.268 0zM9.772 17.119a18.963 18.963 0 004.456 0A17.182 17.182 0 0112 21.724a17.18 17.18 0 01-2.228-4.605zM7.777 15.23a18.87 18.87 0 01-.214-4.774 12.753 12.753 0 01-4.34-2.708 9.711 9.711 0 00-.944 5.004 17.165 17.165 0 005.498 2.477zM21.356 14.752a9.765 9.765 0 01-7.478 6.817 18.64 18.64 0 001.988-4.718 18.627 18.627 0 005.49-2.098zM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 001.988 4.718 9.765 9.765 0 01-7.478-6.816zM13.878 2.43a9.755 9.755 0 016.116 3.986 11.267 11.267 0 01-3.746 2.504 18.63 18.63 0 00-2.37-6.49zM12 2.276a17.152 17.152 0 012.805 7.121c-.897.23-1.837.353-2.805.353-.968 0-1.908-.122-2.805-.353A17.151 17.151 0 0112 2.276zM10.122 2.43a18.629 18.629 0 00-2.37 6.49 11.266 11.266 0 01-3.746-2.504 9.754 9.754 0 016.116-3.985z" />
                                    </svg>
                                </div>
                            </a>
                        )}
                    </div>
                )}

                {/* Event Description */}
                <p className="text-gray-700 mb-6">{eventData.description || 'No description available.'}</p>

                {/* Event Date/Time and Address */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-700">
                        <Clock size={20} className="mr-2 text-gray-500" />
                        <span>{formatDateTime()}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                        <MapPin size={20} className="mr-2 text-gray-500" />
                        <span>{eventData.address || 'Address TBD.'}</span>
                    </div>
                </div>

                {/* General Tags */}
                {eventData.assets_needed && eventData.assets_needed.length > 0 && (
                    <div className="flex space-x-2 mb-8">
                        {eventData.assets_needed.map((tag) => (
                            <span
                                key={tag}
                                className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Image Gallery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    {eventData.image_url && eventData.image_url.map((image, index) => (
                        <div key={image.id} className="relative aspect-[4/3] rounded-lg overflow-hidden">
                            <Image src={image.image_url || ''} alt={`${eventData.title || 'Event image'} ${index + 1}`} width={400} height={300} className="object-cover w-full h-full" />
                        </div>
                    ))}
                    {eventData.event_images && eventData.event_images.map((image, index) => (
                        <div key={image.id} className="relative aspect-[4/3] rounded-lg overflow-hidden">
                            <Image src={image.image_url} alt={`${eventData.title || 'Event image'} gallery ${index + 1}`} width={400} height={300} className="object-cover w-full h-full" />
                        </div>
                    ))}
                </div>

                {/* Venue Requests Section */}
                {hasVenueRequests && isOwner && (
                    <div className="mb-8">
                        <VenueRequestsList 
                            eventId={params.id} 
                            isOwner={isOwner}
                            onEventUpdate={handleEventUpdate}
                        />
                    </div>
                )}

                {/* Action Buttons */}
                {isOwner && (
                    <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4 pb-8">
                        <div className="flex space-x-3">
                            <button className="cursor-pointer bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg flex items-center" onClick={() => router.push(`/event/${params.id}/edit`)}>
                                <Edit size={18} className="mr-2" />
                                Edit Pop-up
                            </button>
                            <button
                                onClick={handleDeleteClick}
                                className="cursor-pointer text-red-600 hover:text-red-800 font-medium py-2 px-4 rounded-lg flex items-center"
                            >
                                <Trash2 size={18} className="mr-2" />
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {showDeleteModal && (
                <ConfirmationModal
                    isOpen={showDeleteModal}
                    onClose={handleDeleteCancel}
                    onConfirm={handleDeleteConfirm}
                    title="Delete Event"
                    message="Are you sure you want to delete this event? This action cannot be undone."
                    confirmText="Delete Event"
                    cancelText="Cancel"
                    isLoading={isDeleting}
                />
            )}
        </div>
    );
}

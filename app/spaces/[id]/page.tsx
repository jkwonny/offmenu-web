'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import NavBar from '@/app/components/NavBar';
import { Venue } from '@/types/Venue';
import RequestSpaceModal from '@/app/components/RequestSpaceModal';
import VenueCollaborationCalendar from '@/app/components/VenueCollaborationCalendar';
import { useUser } from '@/app/context/UserContext';
import { Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FaCheck } from 'react-icons/fa';
import { CollaborationTypes } from '@/constants/CollaborationTypes';
import { RiMapPin2Fill } from 'react-icons/ri';

export default function VenuePage() {
    const params = useParams();
    const { user } = useUser();
    const [venue, setVenue] = useState<Venue | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const isOwner = user?.id === venue?.owner_id;
    const router = useRouter();

    const toggleModal = () => {
        setIsModalOpen(!isModalOpen);
    };

    useEffect(() => {
        const fetchVenue = async () => {
            try {
                const response = await fetch(`/api/venues/${params.id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch venue');
                }
                const data = await response.json();
                setVenue(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchVenue();
        }
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen">
                <NavBar />
                <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen">
                <NavBar />
                <div className="p-4">
                    <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-4">
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    if (!venue) {
        return (
            <div className="min-h-screen">
                <NavBar />
                <div className="p-4">
                    <div className="bg-amber-50 text-amber-600 border border-amber-200 rounded-lg p-4">
                        Venue not found
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <NavBar />

            {/* Image Gallery */}
            <div className="relative w-full p-4 md:p-4">
                {venue?.venue_images && Array.isArray(venue.venue_images) && venue.venue_images.length > 0 ? (
                    <div className="relative w-full overflow-hidden">
                        {/* Mobile Carousel - Simple without side images */}
                        <div className="block md:hidden">
                            <div className="relative w-full h-[40vh] bg-gray-100 rounded-lg">
                                <Image
                                    src={venue.venue_images[currentImageIndex].image_url}
                                    alt={venue.name}
                                    fill
                                    className="object-contain rounded-lg"
                                    priority
                                />
                                {/* Tags on active image */}
                                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                    {venue?.tags && venue.tags.map((tag, index) => (
                                        <span key={`carousel-tag-${index}`} className="text-sm font-medium bg-white/90 text-black px-3 py-1 rounded-full capitalize">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {venue.venue_images.length > 1 && (
                                <>
                                    <button
                                        onClick={() => {
                                            setCurrentImageIndex((prevIndex) =>
                                                (prevIndex - 1 + venue.venue_images!.length) % venue.venue_images!.length
                                            );
                                        }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-white/90 z-10 w-10 h-10 flex items-center justify-center"
                                        aria-label="Previous image"
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M15 18L9 12L15 6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCurrentImageIndex((prevIndex) =>
                                                (prevIndex + 1) % venue.venue_images!.length
                                            );
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-white/90 z-10 w-10 h-10 flex items-center justify-center"
                                        aria-label="Next image"
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9 6L15 12L9 18" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                        {venue.venue_images.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentImageIndex(i)}
                                                className={`w-3 h-3 rounded-full transition-all ${i === currentImageIndex
                                                    ? 'bg-white scale-100'
                                                    : 'bg-white/50 scale-75 hover:bg-white/70'
                                                    }`}
                                                aria-label={`Go to image ${i + 1}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Desktop Carousel - With side images */}
                        <div className="hidden md:block">
                            <div className="flex items-center gap-4">
                                {venue.venue_images.length > 1 && (
                                    <div className="relative w-1/4 h-[40vh] opacity-50 bg-gray-100 rounded-lg">
                                        <Image
                                            src={venue.venue_images[(currentImageIndex - 1 + venue.venue_images.length) % venue.venue_images.length].image_url}
                                            alt={venue.name}
                                            fill
                                            className="object-contain rounded-lg"
                                        />
                                    </div>
                                )}
                                <div className="relative w-full h-[40vh] flex-grow bg-gray-100 rounded-lg">
                                    <Image
                                        src={venue.venue_images[currentImageIndex].image_url}
                                        alt={venue.name}
                                        fill
                                        className="object-contain rounded-lg"
                                        priority
                                    />
                                    {/* Tags on active image */}
                                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                        {venue?.tags && venue.tags.map((tag, index) => (
                                            <span key={`carousel-tag-${index}`} className="text-sm font-medium bg-white/90 text-black px-3 py-1 rounded-full capitalize">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {venue.venue_images.length > 1 && (
                                    <div className="relative w-1/4 h-[40vh] opacity-50 bg-gray-100 rounded-lg">
                                        <Image
                                            src={venue.venue_images[(currentImageIndex + 1) % venue.venue_images.length].image_url}
                                            alt={venue.name}
                                            fill
                                            className="object-contain rounded-lg"
                                        />
                                    </div>
                                )}
                            </div>

                            {venue.venue_images.length > 1 && (
                                <>
                                    <button
                                        onClick={() => {
                                            setCurrentImageIndex((prevIndex) =>
                                                (prevIndex - 1 + venue.venue_images!.length) % venue.venue_images!.length
                                            );
                                        }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-white/90 z-10 w-10 h-10 flex items-center justify-center"
                                        aria-label="Previous image"
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M15 18L9 12L15 6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCurrentImageIndex((prevIndex) =>
                                                (prevIndex + 1) % venue.venue_images!.length
                                            );
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-white/90 z-10 w-10 h-10 flex items-center justify-center"
                                        aria-label="Next image"
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9 6L15 12L9 18" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                        {venue.venue_images.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentImageIndex(i)}
                                                className={`w-3 h-3 rounded-full transition-all ${i === currentImageIndex
                                                    ? 'bg-white scale-100'
                                                    : 'bg-white/50 scale-75 hover:bg-white/70'
                                                    }`}
                                                aria-label={`Go to image ${i + 1}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-[60vh] bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">No images available</span>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-4 lg:px-8 py-4 md:py-8 md:w-[70%] pb-24 md:pb-8">
                <div className='flex justify-between items-start mb-6'>
                    <div className="flex flex-col gap-2">
                        <h1 className="text-4xl font-bold mb-2">{venue.name}</h1>
                        <div className="flex items-center gap-1">
                            <RiMapPin2Fill className='w-6 h-6' color='#06048D' />
                            <span>{venue.address}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {venue.instagram_handle && (
                            <a
                                href={`https://instagram.com/${venue.instagram_handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                                title={`@${venue.instagram_handle}`}
                            >
                                <div className="rounded-full p-2 bg-[linear-gradient(315deg,_#FBE18A_0.96%,_#FCBB45_21.96%,_#F75274_38.96%,_#D53692_52.96%,_#8F39CE_74.96%,_#5B4FE9_100.96%)]">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                    </svg>
                                </div>
                            </a>
                        )}

                        {venue.website && (
                            <a
                                href={venue.website}
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
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Info */}
                    <div className="lg:col-span-2">
                        {/* Description */}
                        <div className="mb-6">
                            <div className='py-4'>
                                <h2 className="text-xl font-semibold mb-4">About</h2>
                                <p className="whitespace-pre-line">{venue.description}</p>
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                                {venue.max_guests && (
                                    <div className="flex items-center gap-2">
                                        <span>👥</span>
                                        <span>Max {venue.max_guests} guests</span>
                                    </div>
                                )}
                                {venue.rental_type && venue.rental_type.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span>🏠</span>
                                        <span>
                                            {venue.rental_type
                                                .map(type =>
                                                    type.split('_')
                                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                        .join(' ')
                                                )
                                                .join(', ')}
                                        </span>
                                    </div>
                                )}

                            </div>

                        </div>
                        <div className="border-t border-gray-200 pt-6 mb-6">
                            <h2 className="text-xl font-semibold mb-4">Services</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {venue.services && venue.services.map((service, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div className='bg-[#06048D] rounded-full p-2'>
                                            <FaCheck className='w-3 h-3 text-white' />
                                        </div>
                                        <span>{service}</span>
                                    </div>
                                ))}

                            </div>
                        </div>

                        {/* Collaboration Calendar */}
                        {!isOwner && (
                            <div className="border-t border-gray-200 pt-6 mb-6">
                                <h2 className="text-xl font-semibold mb-4">Collaboration Availability</h2>
                                <VenueCollaborationCalendar
                                    venueId={params.id as string}
                                    onDateSelect={(date, collaborationTypes) => {
                                        console.log('Selected date:', date, 'Available types:', collaborationTypes);
                                    }}
                                />
                            </div>
                        )}

                    </div>

                    {/* Right Column - Booking Info (Desktop Only) */}
                    <div className="hidden lg:block lg:col-span-1 text-black">
                        <div className="sticky top-8 border border-gray-200 rounded-lg p-6 bg-white border-gray-200">
                            <div className="text-2xl font-semibold mb-4 text-black">
                                {venue.collaboration_type && (
                                    <span className='capitalize'>{CollaborationTypes[venue.collaboration_type as keyof typeof CollaborationTypes]}</span>
                                )}
                            </div>
                            {user ? (
                                <button
                                    className="w-full cursor-pointer py-3 px-4 rounded-full font-medium transition-colors bg-[#88ADEB]"
                                    onClick={toggleModal}
                                >
                                    Contact Space
                                </button>
                            ) : (
                                <a
                                    href={`/auth/sign-in?redirect=${encodeURIComponent(`/spaces/${params.id}`)}`}
                                    className="w-full cursor-pointer py-3 px-4 rounded-full font-medium transition-colors bg-[#88ADEB] text-center block"
                                >
                                    Sign in to Contact Space
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                {isOwner && (
                    <div className="flex flex-col sm:flex-row justify-between items-center w-full space-y-4 sm:space-y-0 sm:space-x-4 pb-8">
                        <div className="flex space-x-3 justify-between mt-3">
                            <button className="cursor-pointer bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg flex items-center" onClick={() => router.push(`/spaces/${params.id}/edit`)}>
                                <Edit size={18} className="mr-2" />
                                Edit Space
                            </button>
                            <button
                                // onClick={handleDelete}
                                className="text-red-600 hover:text-red-800 font-medium py-2 px-4 rounded-lg flex items-center"
                            >
                                <Trash2 size={18} className="mr-2" />
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Sticky Contact Container */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <div className="text-lg font-semibold text-black">
                            {venue.collaboration_type && (
                                <span className='capitalize'>{CollaborationTypes[venue.collaboration_type as keyof typeof CollaborationTypes]}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        {user ? (
                            <button
                                className="cursor-pointer py-3 px-6 rounded-full font-medium transition-colors bg-[#88ADEB] text-black"
                                onClick={toggleModal}
                            >
                                Contact Space
                            </button>
                        ) : (
                            <a
                                href={`/auth/sign-in?redirect=${encodeURIComponent(`/spaces/${params.id}`)}`}
                                className="cursor-pointer py-3 px-6 rounded-full font-medium transition-colors bg-[#88ADEB] text-center block text-black"
                            >
                                Sign in to Contact
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Contact Modal */}
            {isModalOpen && (
                <RequestSpaceModal
                    toggleModal={toggleModal}
                    venue={venue}
                />
            )}
        </div>
    );
} 
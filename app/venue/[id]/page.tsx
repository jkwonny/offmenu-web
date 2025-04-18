'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import NavBar from '@/app/components/NavBar';
import { Venue } from '@/types/Venue';

export default function VenuePage() {
    const params = useParams();
    const [venue, setVenue] = useState<Venue | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    console.log('venue', venue);
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
            <div className="min-h-screen bg-[#FFF9F5]">
                <NavBar />
                <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#FFF9F5]">
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
            <div className="min-h-screen bg-[#FFF9F5]">
                <NavBar />
                <div className="p-4">
                    <div className="bg-amber-50 text-amber-600 border border-amber-200 rounded-lg p-4">
                        Venue not found
                    </div>
                </div>
            </div>
        );
    }

    // Format price display
    const formatPrice = () => {
        if (!venue.price) return 'Price upon request';

        if (venue.pricing_type === 'hourly' && venue.min_hours) {
            return `$${venue.price}/hr · ${venue.min_hours} hr min`;
        } else if (venue.pricing_type === 'flat') {
            return `$${venue.price} flat rate`;
        } else if (venue.pricing_type === 'minimum_spend') {
            return `$${venue.price} minimum spend`;
        }

        return `$${venue.price}`;
    };

    return (
        <div className="min-h-screen bg-[#FFF9F5]">
            <NavBar />

            {/* Image Gallery */}
            <div className="relative w-full h-[40vh] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {venue?.venue_images && Array.isArray(venue.venue_images) && venue.venue_images.length > 0 ? (
                    <div className="relative w-full h-full">
                        <Image
                            src={venue.venue_images[currentImageIndex].image_url}
                            alt={venue.name}
                            fill
                            className="object-cover rounded-lg"
                            priority
                        />
                        {venue.venue_images.length > 1 && (
                            <>
                                <button
                                    onClick={() => {
                                        setCurrentImageIndex((prevIndex) =>
                                            (prevIndex - 1 + venue.venue_images!.length) % venue.venue_images!.length
                                        );
                                    }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white z-10"
                                    aria-label="Previous image"
                                >
                                    &#8592;
                                </button>
                                <button
                                    onClick={() => {
                                        setCurrentImageIndex((prevIndex) =>
                                            (prevIndex + 1) % venue.venue_images!.length
                                        );
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white z-10"
                                    aria-label="Next image"
                                >
                                    &#8594;
                                </button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                    {venue.venue_images.map((_, i) => (
                                        <span
                                            key={i}
                                            className={`inline-block w-2 h-2 rounded-full ${i === currentImageIndex ? 'bg-amber-600' : 'bg-white border border-amber-600'
                                                }`}
                                        ></span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
                        <span className="text-gray-500">No images available</span>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Info */}
                    <div className="lg:col-span-2">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-amber-950 mb-2">{venue.name}</h1>
                                <div className="flex items-center gap-4 text-amber-800">
                                    <span>{venue.address}, {venue.city}, {venue.state}</span>
                                    {venue.avg_rating && (
                                        <span className="flex items-center">
                                            ★ {venue.avg_rating.toFixed(1)}
                                            {venue.review_count && (
                                                <span className="ml-1">({venue.review_count})</span>
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Instagram and Website Links */}
                            <div className="flex items-center gap-4 mt-3 md:mt-0">
                                {venue.instagram_handle && (
                                    <a
                                        href={`https://instagram.com/${venue.instagram_handle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-amber-700 hover:text-amber-800"
                                        title={`@${venue.instagram_handle}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                        </svg>
                                    </a>
                                )}

                                {venue.website && (
                                    <a
                                        href={venue.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-amber-700 hover:text-amber-800"
                                        title="Visit Website"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path d="M21.721 12.752a9.711 9.711 0 00-.945-5.003 12.754 12.754 0 01-4.339 2.708 18.991 18.991 0 01-.214 4.772 17.165 17.165 0 005.498-2.477zM14.634 15.55a17.324 17.324 0 00.332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 00.332 4.647 17.385 17.385 0 005.268 0zM9.772 17.119a18.963 18.963 0 004.456 0A17.182 17.182 0 0112 21.724a17.18 17.18 0 01-2.228-4.605zM7.777 15.23a18.87 18.87 0 01-.214-4.774 12.753 12.753 0 01-4.34-2.708 9.711 9.711 0 00-.944 5.004 17.165 17.165 0 005.498 2.477zM21.356 14.752a9.765 9.765 0 01-7.478 6.817 18.64 18.64 0 001.988-4.718 18.627 18.627 0 005.49-2.098zM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 001.988 4.718 9.765 9.765 0 01-7.478-6.816zM13.878 2.43a9.755 9.755 0 016.116 3.986 11.267 11.267 0 01-3.746 2.504 18.63 18.63 0 00-2.37-6.49zM12 2.276a17.152 17.152 0 012.805 7.121c-.897.23-1.837.353-2.805.353-.968 0-1.908-.122-2.805-.353A17.151 17.151 0 0112 2.276zM10.122 2.43a18.629 18.629 0 00-2.37 6.49 11.266 11.266 0 01-3.746-2.504 9.754 9.754 0 016.116-3.985z" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Amenities */}
                        <div className="border-t border-amber-200 pt-6 mb-6">
                            <h2 className="text-xl font-semibold text-amber-950 mb-4">Amenities</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {venue.alcohol_served && (
                                    <div className="flex items-center gap-2">
                                        <span>🍸</span>
                                        <span>Alcohol Served</span>
                                    </div>
                                )}
                                {venue.outside_cake_allowed && (
                                    <div className="flex items-center gap-2">
                                        <span>🍰</span>
                                        <span>Outside Cake Allowed</span>
                                    </div>
                                )}
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

                        {/* Description */}
                        <div className="border-t border-amber-200 pt-6 mb-6">
                            <h2 className="text-xl font-semibold text-amber-950 mb-4">About this venue</h2>
                            <p className="text-amber-900 whitespace-pre-line">{venue.description}</p>
                        </div>
                    </div>

                    {/* Right Column - Booking Info */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 border border-amber-200 rounded-lg p-6 bg-white">
                            <div className="text-2xl font-semibold text-amber-950 mb-4">
                                {formatPrice()}
                            </div>
                            <button className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-amber-700 transition-colors">
                                Contact Venue
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 
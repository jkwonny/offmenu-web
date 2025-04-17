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
                        <h1 className="text-3xl font-bold text-amber-950 mb-2">{venue.name}</h1>
                        <div className="flex items-center gap-4 text-amber-800 mb-4">
                            <span>{venue.city}, {venue.state}</span>
                            {venue.avg_rating && (
                                <span className="flex items-center">
                                    ★ {venue.avg_rating.toFixed(1)}
                                    {venue.review_count && (
                                        <span className="ml-1">({venue.review_count})</span>
                                    )}
                                </span>
                            )}
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
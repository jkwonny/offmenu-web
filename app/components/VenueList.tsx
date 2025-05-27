'use client';

import { useRef, useEffect } from 'react';
import Image from 'next/image';
import { Venue } from '@/types/Venue';

interface VenueListProps {
    venues: Venue[];
    selectedVenueId: string | null;
    onVenueClick: (venueId: string) => void;
    onVenueHover: (venueId: string) => void;
}

const categoryMap: Record<string, string> = {
    'restaurant': 'Restaurant',
    'event_space': 'Event Space',
    'bar': 'Bar',
    'hotel': 'Hotel'
};

export default function VenueList({
    venues,
    selectedVenueId,
    onVenueClick,
    onVenueHover,
}: VenueListProps) {
    const selectedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedVenueId && selectedRef.current) {
            selectedRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [selectedVenueId]);

    const handleWebsiteClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.stopPropagation(); // Prevent the venue card click event from firing
    };

    return (
        <div className="h-full overflow-y-auto text-black">
            <div className="p-4">
                <h2 className="text-2xl font-bold mb-4 text-amber-950">Venues</h2>
                <div className="space-y-4">
                    {venues.map((venue) => (
                        <div
                            key={venue.id}
                            ref={selectedVenueId === venue.id ? selectedRef : null}
                            className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedVenueId === venue.id
                                ? 'bg-amber-50 border-2 border-amber-500'
                                : 'border border-amber-200 bg-white'
                                }`}
                            onClick={() => {
                                onVenueClick(venue.id);
                            }}
                            onMouseEnter={() => onVenueHover(venue.id)}
                        >
                            <div className="flex gap-4">
                                <div className="relative w-24 h-24 flex-shrink-0">
                                    {venue.image_url ? (
                                        <Image
                                            src={venue.image_url}
                                            alt={venue.name}
                                            fill
                                            className="object-cover rounded-lg"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                                            <span className="text-gray-500 text-xs">No Image</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-lg">{venue.name}</h3>
                                        <div className="flex space-x-2">
                                            {venue.instagram_handle && (
                                                <a
                                                    href={`https://instagram.com/${venue.instagram_handle}/`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={handleWebsiteClick}
                                                    className="text-amber-600 hover:text-amber-800"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                                    </svg>
                                                </a>
                                            )}
                                            {venue.website && (
                                                <a
                                                    href={venue.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={handleWebsiteClick}
                                                    className="text-amber-600 hover:text-amber-800"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-gray-600">{venue.city}{venue.state ? `, ${venue.state}` : ''}</p>
                                    <p className="text-sm text-gray-500 mb-2">{categoryMap[venue.category] || venue.category}</p>

                                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                                        <div className="flex items-center text-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                            </svg>
                                            <span>{venue.collaboration_type}</span>
                                        </div>

                                        <div className="flex items-center text-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M8 22h8M7 10h10M12 14v8M6 5c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2l-2 9H8L6 5z" />
                                            </svg>
                                            <span>{venue.alcohol_served ? 'Alcohol: Yes' : 'Alcohol: No'}</span>
                                        </div>

                                        <div className="flex items-center text-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 16h18M3 20h18M12 4a3 3 0 0 0-3 3c0 1.5 2 5 3 6.5 1-1.5 3-5 3-6.5a3 3 0 0 0-3-3zM7 8a2 2 0 0 0-2 2c0 1 1.5 3 2 4 .5-1 2-3 2-4a2 2 0 0 0-2-2zM17 8a2 2 0 0 0-2 2c0 1 1.5 3 2 4 .5-1 2-3 2-4a2 2 0 0 0-2-2z" />
                                            </svg>
                                            <span>{venue.outside_cake_allowed ? 'Outside Cake: Yes' : 'Outside Cake: No'}</span>
                                        </div>

                                        {venue.max_guests && (
                                            <div className="flex items-center text-sm">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                    <circle cx="9" cy="7" r="4"></circle>
                                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                                </svg>
                                                <span>Max Guests: {venue.max_guests}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 
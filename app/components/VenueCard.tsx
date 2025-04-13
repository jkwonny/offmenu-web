'use client';

import Image from 'next/image';
import { Venue } from '@/types/Venue';

interface VenueCardProps {
    venue: Venue;
    isSelected: boolean;
    onClick: () => void;
}

export default function VenueCard({ venue, isSelected, onClick }: VenueCardProps) {
    // Format price display
    const formatPrice = (venue: Venue) => {
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

    // Get venue description based on category & features
    const getVenueDescription = (venue: Venue) => {
        const descriptions: Record<string, string> = {
            'restaurant': 'Culinary venue perfect for food-focused gatherings',
            'event_space': 'Versatile space for your special occasion',
            'bar': 'Cozy bar with vibrant atmosphere',
            'hotel': 'Elegant hotel space with professional service'
        };

        if (venue.description) return venue.description;
        return descriptions[venue.category] || 'Perfect spot for your next event';
    };

    // Get key amenities as badges
    const getAmenityBadges = () => {
        const badges = [];

        if (venue.alcohol_served) {
            badges.push({ icon: '🍸', text: 'Alcohol' });
        }

        if (venue.outside_cake_allowed) {
            badges.push({ icon: '🍰', text: 'BYOC' });
        }

        // Add rental type if available
        if (venue.rental_type && venue.rental_type.length > 0) {
            badges.push({ icon: '🏠', text: venue.rental_type[0] });
        }

        return badges;
    };

    return (
        <div
            className={`flex flex-col rounded-xl overflow-hidden shadow-md transition-all duration-300 cursor-pointer
                 ${isSelected
                    ? 'ring-2 ring-amber-500 shadow-lg transform scale-[1.02]'
                    : 'hover:shadow-lg hover:transform hover:scale-[1.01]'
                }`}
            onClick={onClick}
        >
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
                    {formatPrice(venue)}
                </div>
            </div>

            <div className="p-4 bg-white flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                    <h3 className="font-medium text-lg text-amber-950">{venue.name}</h3>

                    {venue.avg_rating && (
                        <div className="flex items-center gap-1 text-amber-700">
                            <span>★</span>
                            <span className="text-sm">{venue.avg_rating.toFixed(1)}</span>
                        </div>
                    )}
                </div>

                <p className="text-sm text-gray-500 mb-2">{venue.city}{venue.state ? `, ${venue.state}` : ''}</p>

                <p className="text-sm text-gray-700 mt-1 flex-grow">
                    {getVenueDescription(venue)}
                </p>

                {/* Amenity badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                    {getAmenityBadges().map((badge, index) => (
                        <div key={index} className="inline-flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full text-xs text-amber-800">
                            <span>{badge.icon}</span>
                            <span>{badge.text}</span>
                        </div>
                    ))}

                    {venue.max_guests && (
                        <div className="inline-flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full text-xs text-amber-800">
                            <span>👥</span>
                            <span>Up to {venue.max_guests}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 
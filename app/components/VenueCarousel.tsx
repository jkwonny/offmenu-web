'use client';

import { useRef, useState, useEffect } from 'react';
import { Venue } from '@/types/Venue';
import VenueCard from './VenueCard';

interface VenueCarouselProps {
    venues: Venue[];
    selectedVenueId: string | null;
    onVenueClick: (venueId: string) => void;
}

export default function VenueCarousel({ venues, selectedVenueId, onVenueClick }: VenueCarouselProps) {
    const carouselRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Auto-scroll to selected venue
    useEffect(() => {
        if (selectedVenueId && carouselRef.current) {
            const selectedCardEl = carouselRef.current.querySelector(`[data-venue-id="${selectedVenueId}"]`);
            if (selectedCardEl) {
                selectedCardEl.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [selectedVenueId]);

    // Handling mouse/touch drag for carousel scrolling
    const handleMouseDown = (e: React.MouseEvent) => {
        if (carouselRef.current) {
            setIsDragging(true);
            setStartX(e.pageX - carouselRef.current.offsetLeft);
            setScrollLeft(carouselRef.current.scrollLeft);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !carouselRef.current) return;
        e.preventDefault();
        const x = e.pageX - carouselRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed multiplier
        carouselRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <div className="w-full bg-gradient-to-t from-white/95 via-white/90 to-transparent pb-6 pt-4 backdrop-blur-sm venue-carousel-overlay">
            <div className="container mx-auto px-4">
                <h2 className="text-xl font-medium text-amber-900 mb-4">
                    Here are some places that would love to host your event ✨
                </h2>

                <div
                    ref={carouselRef}
                    className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide"
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {venues.map(venue => (
                        <div
                            key={venue.id}
                            data-venue-id={venue.id}
                            className="min-w-[280px] max-w-[280px] snap-center"
                        >
                            <VenueCard
                                venue={venue}
                                isSelected={venue.id === selectedVenueId}
                                onClick={() => onVenueClick(venue.id)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

interface ImageCarouselProps {
    images?: string[];
    height?: number;
    width?: number;
    objectFit?: 'cover' | 'contain' | 'fill';
    showControls?: boolean;
    showIndicators?: boolean;
    className?: string;
    alt?: string;
}

export default function ImageCarousel({
    images,
    height = 200,
    width = 400,
    objectFit = 'cover',
    showControls = true,
    showIndicators = true,
    className = '',
    alt = 'Image'
}: ImageCarouselProps) {
    const [current, setCurrent] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Use useMemo to prevent validImages from being recreated on each render
    const validImages = useMemo(() => {
        return Array.isArray(images) && images.length > 0
            ? images
            : ["https://placehold.co/400x250?text=No+Image"];
    }, [images]);

    const total = validImages.length;

    // Preload images
    useEffect(() => {
        validImages.forEach((src) => {
            const img = new window.Image();
            img.src = src;
        });
    }, [validImages]);

    const goLeft = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrent((prev) => {
            const newIndex = (prev - 1 + total) % total;
            return newIndex;
        });
        setTimeout(() => setIsTransitioning(false), 300);
    };

    const goRight = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrent((prev) => {
            const newIndex = (prev + 1) % total;
            return newIndex;
        });
        setTimeout(() => setIsTransitioning(false), 300);
    };

    return (
        <div className={`relative w-full h-${height} bg-gray-100 ${className}`} style={{ height }}>
            {validImages.map((src, index) => (
                <div key={index} className="absolute inset-0">
                    <Image
                        src={src}
                        alt={`${alt} ${index + 1}`}
                        width={width}
                        height={height}
                        className={`w-full h-full object-${objectFit} transition-opacity duration-300 ${index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                        priority={index === 0 || index === current || index === (current + 1) % total || index === (current - 1 + total) % total}
                    />
                </div>
            ))}

            {total > 1 && showControls && (
                <>
                    <button
                        onClick={goLeft}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-8 h-8 flex items-center justify-center shadow hover:bg-white z-20 disabled:opacity-50"
                        aria-label="Previous image"
                        disabled={isTransitioning}
                    >
                        &#8592;
                    </button>
                    <button
                        onClick={goRight}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-8 h-8 flex items-center justify-center shadow hover:bg-white z-20 disabled:opacity-50"
                        aria-label="Next image"
                        disabled={isTransitioning}
                    >
                        &#8594;
                    </button>
                </>
            )}

            {total > 1 && showIndicators && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                    {validImages.map((_, i) => (
                        <span
                            key={i}
                            className={`inline-block w-2 h-2 rounded-full ${i === current ? 'bg-amber-600' : 'bg-white border border-amber-600'
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
} 
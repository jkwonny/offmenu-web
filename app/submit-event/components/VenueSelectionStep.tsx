"use client";

import { useState, useEffect, useRef } from "react";
import { Venue } from "@/types/Venue";
import { useVenues, VenueFilters } from "../../lib/queries";
import { useUser } from "../../context/UserContext";
import Image from "next/image";
import { LuMapPin } from "react-icons/lu";
import { FaRegHandshake } from "react-icons/fa";
import { collaborationTypeLookUp } from "@/utils/collaborationTypeLookUp";
import { CollaborationType } from "../../types/collaboration_types";

interface VenueImage {
    id?: string;
    image_url: string;
    sort_order?: number;
}

interface VenueSelectionStepProps {
    selectedVenues: Venue[];
    onVenueSelect: (venue: Venue) => void;
    onVenueDeselect: (venueId: string) => void;
}

const getImageUrl = (image: VenueImage): string => {
    return image.image_url;
};

export default function VenueSelectionStep({
    selectedVenues,
    onVenueSelect,
    onVenueDeselect,
}: VenueSelectionStepProps) {
    const { user } = useUser();
    
    // Filter states
    const [capacityFilter, setCapacityFilter] = useState<string>("");
    const [showCapacityMenu, setShowCapacityMenu] = useState(false);
    
    // UI states
    const [currentImageIndices, setCurrentImageIndices] = useState<Record<string, number>>({});
    const [detailsVenue, setDetailsVenue] = useState<Venue | null>(null);
    
    const capacityMenuRef = useRef<HTMLDivElement>(null);

    // Create filters object for optimized query
    const filters: VenueFilters = {
        capacity: capacityFilter ? (capacityFilter === "75+" ? 75 : parseInt(capacityFilter.split("-")[1])) : undefined,
        limit: 50, // Load 50 venues at a time for better performance
    };

    // Use optimized venue query with filters
    const { data: allVenues = [], isLoading: venuesLoading, error: venuesError } = useVenues(filters);

    // Filter out venues owned by the current user (client-side filter for user-specific logic)
    const venues = allVenues.filter(venue => venue.owner_id !== user?.id && venue.status === "approved");

    const isVenueSelected = (venueId: string) => {
        return selectedVenues.some(venue => venue.id === venueId);
    };

    const handleVenueToggle = (venue: Venue) => {
        if (isVenueSelected(venue.id)) {
            onVenueDeselect(venue.id);
        } else {
            onVenueSelect(venue);
        }
    };

    const handleImageNav = (
        event: React.MouseEvent,
        venueId: string,
        direction: "prev" | "next",
        maxIndex: number
    ) => {
        event.stopPropagation();
        
        setCurrentImageIndices((prev) => {
            const currentIndex = prev[venueId] || 0;
            if (direction === "prev" && currentIndex > 0) {
                return { ...prev, [venueId]: currentIndex - 1 };
            } else if (direction === "next" && currentIndex < maxIndex) {
                return { ...prev, [venueId]: currentIndex + 1 };
            }
            return prev;
        });
    };

    const handleVenueDetails = (event: React.MouseEvent, venue: Venue) => {
        event.stopPropagation();
        setDetailsVenue(venue);
    };

    const handleCapacityFilterChange = (newCapacity: string) => {
        setCapacityFilter(newCapacity);
        setShowCapacityMenu(false);
    };

    // Close menus when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (capacityMenuRef.current && !capacityMenuRef.current.contains(event.target as Node)) {
                setShowCapacityMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (venuesLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading venues...</p>
                </div>
            </div>
        );
    }

    if (venuesError) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg max-w-md text-center">
                    <h3 className="font-semibold mb-2">Error Loading Venues</h3>
                    <p className="text-sm mb-4">We couldn&apos;t load the venues. Please try again.</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full py-4 relative">
            <div className="mx-auto max-w-6xl px-4">
                <h1 className="text-3xl font-bold font-heading mb-8 text-center text-gray-800">
                    Select Venues to Contact
                </h1>
                
                <p className="text-center text-gray-600 mb-8">
                    This is optional, you may enter venue address later
                </p>
                
                {/* Selected venues count */}
                {selectedVenues.length > 0 && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800 font-medium">
                            {selectedVenues.length} venue{selectedVenues.length !== 1 ? "s" : ""} selected
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {selectedVenues.map(venue => (
                                <span key={venue.id} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2">
                                    {venue.name}
                                    <button 
                                        onClick={() => onVenueDeselect(venue.id)}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="mb-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Filter Venues</h2>
                    <div className="flex flex-wrap gap-4">
                        {/* Capacity Filter */}
                        <div className="relative" ref={capacityMenuRef}>
                            <button
                                onClick={() => setShowCapacityMenu(!showCapacityMenu)}
                                className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-2 min-w-[150px] justify-between"
                            >
                                <span>
                                    {capacityFilter ? `${capacityFilter} guests` : "Any capacity"}
                                </span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {showCapacityMenu && (
                                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                                    <button
                                        onClick={() => handleCapacityFilterChange("")}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg"
                                    >
                                        Any capacity
                                    </button>
                                    <button
                                        onClick={() => handleCapacityFilterChange("1-15")}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-50"
                                    >
                                        1-15 guests
                                    </button>
                                    <button
                                        onClick={() => handleCapacityFilterChange("16-30")}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-50"
                                    >
                                        16-30 guests
                                    </button>
                                    <button
                                        onClick={() => handleCapacityFilterChange("31-50")}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-50"
                                    >
                                        31-50 guests
                                    </button>
                                    <button
                                        onClick={() => handleCapacityFilterChange("51-75")}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-50"
                                    >
                                        51-75 guests
                                    </button>
                                    <button
                                        onClick={() => handleCapacityFilterChange("75+")}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-50 last:rounded-b-lg"
                                    >
                                        75+ guests
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Clear filters button */}
                        {capacityFilter && (
                            <button
                                onClick={() => {
                                    setCapacityFilter("");
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                    {/* Results count */}
                    <div className="mt-4 text-sm text-gray-600">
                        Showing {venues.length} venue{venues.length !== 1 ? "s" : ""}
                        {capacityFilter && ` with capacity for ${capacityFilter} guests`}
                    </div>
                </div>

                {/* Venues Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {venues.length > 0 ? (
                        venues.map((venue) => {
                            const venueImages = venue.venue_images && venue.venue_images.length > 0
                                ? venue.venue_images.map((img: VenueImage) => getImageUrl(img))
                                : [venue.image_url || "/images/default-venue-image.jpg"];

                            const currentIndex = currentImageIndices[venue.id] || 0;
                            const isFirstImage = currentIndex === 0;
                            const isLastImage = currentIndex === venueImages.length - 1;
                            const isSelected = isVenueSelected(venue.id);

                            return (
                                <div
                                    key={venue.id}
                                    className={`cursor-pointer bg-[#F6F8FC] p-2 rounded-lg transition-all hover:opacity-90 relative ${isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
                                    onClick={() => handleVenueToggle(venue)}
                                >
                                    {/* Selection checkbox */}
                                    <div className="absolute top-4 right-4 z-10">
                                        <div
                                            className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                                isSelected
                                                    ? "bg-blue-500 border-blue-500 text-white"
                                                    : "bg-white border-gray-300"
                                            }`}
                                        >
                                            {isSelected && (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>

                                    {/* Details button */}
                                    <button
                                        onClick={(e) => handleVenueDetails(e, venue)}
                                        className="absolute top-4 left-4 z-10 bg-white bg-opacity-90 p-2 rounded-full text-gray-700 hover:bg-opacity-100 transition-all shadow-sm"
                                        title="View details"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </button>

                                    <div className="aspect-[4/3] lg:aspect-square w-full overflow-hidden rounded-xl relative group">
                                        <Image
                                            src={venueImages[currentIndex]}
                                            alt={venue.name}
                                            className="h-full w-full object-cover transition-all duration-500"
                                            width={300}
                                            height={300}
                                            loading="lazy" // Add lazy loading for better performance
                                            placeholder="blur"
                                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                                        />

                                        {/* Navigation buttons */}
                                        {!isFirstImage && (
                                            <button
                                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white p-1.5 rounded-full opacity-0 group-hover:opacity-80 transition-opacity shadow-md z-10"
                                                onClick={(e) => handleImageNav(e, venue.id, "prev", venueImages.length - 1)}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                                </svg>
                                            </button>
                                        )}

                                        {!isLastImage && (
                                            <button
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white p-1.5 rounded-full opacity-0 group-hover:opacity-80 transition-opacity shadow-md z-10"
                                                onClick={(e) => handleImageNav(e, venue.id, "next", venueImages.length - 1)}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                                </svg>
                                            </button>
                                        )}

                                        {/* Image indicators */}
                                        {venueImages.length > 1 && (
                                            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1">
                                                {venueImages.map((_, index) => (
                                                    <div
                                                        key={index}
                                                        className={`w-2 h-2 rounded-full transition-colors ${
                                                            index === currentIndex ? "bg-white" : "bg-white/50"
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="py-3 px-3">
                                        <h3 className="font-medium text-xl text-base">{venue.name}</h3>
                                        <p className="text-gray-500 text-sm mt-0.5 flex items-center">
                                            <LuMapPin className="w-4 h-4 mr-1" />
                                            {venue.neighborhood}
                                        </p>
                                        {venue.capacity && (
                                            <p className="text-gray-500 text-sm mt-0.5">
                                                Capacity: {venue.capacity} guests
                                            </p>
                                        )}
                                        <p className="text-sm mt-1 font-medium flex items-center">
                                            <FaRegHandshake className="w-4 h-4 mr-1" />
                                            {venue.collaboration_type && Array.isArray(venue.collaboration_type) ? 
                                                venue.collaboration_type.map((type: CollaborationType) => 
                                                    collaborationTypeLookUp[type as keyof typeof collaborationTypeLookUp]
                                                ).join(", ") : 
                                                venue.collaboration_type ? collaborationTypeLookUp[venue.collaboration_type as keyof typeof collaborationTypeLookUp] : ''
                                            }
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-3 flex flex-col items-center justify-center py-10 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No venues found</h3>
                            <p className="text-gray-500 mb-4">Try adjusting your filters to see more results</p>
                            {capacityFilter && (
                                <button
                                    onClick={() => setCapacityFilter("")}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Clear capacity filter
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Venue Details Sidebar */}
                {detailsVenue && (
                    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
                        <div className="h-full flex flex-col">
                            {/* Header */}
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="text-xl font-semibold">{detailsVenue.name}</h2>
                                <button
                                    onClick={() => setDetailsVenue(null)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {/* Venue image */}
                                <div className="aspect-video w-full mb-4 rounded-lg overflow-hidden">
                                    <Image
                                        src={detailsVenue.venue_images?.[0] ? getImageUrl(detailsVenue.venue_images[0]) : detailsVenue.image_url || "/images/default-venue-image.jpg"}
                                        alt={detailsVenue.name}
                                        width={400}
                                        height={225}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Venue details */}
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-medium text-gray-900 mb-1">Location</h3>
                                        <p className="text-gray-600 flex items-center">
                                            <LuMapPin className="w-4 h-4 mr-1" />
                                            {detailsVenue.address}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="font-medium text-gray-900 mb-1">Collaboration Type</h3>
                                        <p className="text-gray-600 flex items-center">
                                            <FaRegHandshake className="w-4 h-4 mr-1" />
                                            {detailsVenue.collaboration_type && Array.isArray(detailsVenue.collaboration_type) ? 
                                                detailsVenue.collaboration_type.map((type: CollaborationType) => 
                                                    collaborationTypeLookUp[type as keyof typeof collaborationTypeLookUp]
                                                ).join(", ") : 
                                                detailsVenue.collaboration_type ? collaborationTypeLookUp[detailsVenue.collaboration_type as keyof typeof collaborationTypeLookUp] : ''
                                            }
                                        </p>
                                    </div>

                                    {detailsVenue.capacity && (
                                        <div>
                                            <h3 className="font-medium text-gray-900 mb-1">Capacity</h3>
                                            <p className="text-gray-600">{detailsVenue.capacity} guests</p>
                                        </div>
                                    )}

                                    {detailsVenue.description && (
                                        <div>
                                            <h3 className="font-medium text-gray-900 mb-1">Description</h3>
                                            <p className="text-gray-600">{detailsVenue.description}</p>
                                        </div>
                                    )}

                                    {detailsVenue.tags && detailsVenue.tags.length > 0 && (
                                        <div>
                                            <h3 className="font-medium text-gray-900 mb-2">Features</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {detailsVenue.tags.map((tag, index) => (
                                                    <span
                                                        key={index}
                                                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                                                    >
                                                        {tag.replace(/_/g, " ")}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer with add/remove button */}
                            <div className="p-4 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        handleVenueToggle(detailsVenue);
                                        setDetailsVenue(null);
                                    }}
                                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                                        isVenueSelected(detailsVenue.id)
                                            ? "bg-red-500 hover:bg-red-600 text-white"
                                            : "bg-blue-500 hover:bg-blue-600 text-white"
                                    }`}
                                >
                                    {isVenueSelected(detailsVenue.id) ? "Remove from Selection" : "Add to Selection"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Overlay when sidebar is open */}
                {detailsVenue && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-40"
                        onClick={() => setDetailsVenue(null)}
                    />
                )}
            </div>
        </div>
    );
} 
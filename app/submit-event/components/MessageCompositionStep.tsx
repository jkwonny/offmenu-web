"use client";

import { useState } from "react";
import Image from "next/image";
import { Venue } from "@/types/Venue";
import { EventFormData } from "./EventDetailsStep";
import { LuMapPin, LuCalendar, LuUsers } from "react-icons/lu";
import { FaRegHandshake } from "react-icons/fa";
import { collaborationTypeLookUp } from "@/utils/collaborationTypeLookUp";
import { CollaborationType } from "../../types/collaboration_types";

interface VenueImage {
    image_url: string;
    sort_order?: number;
}

interface MessageCompositionStepProps {
    eventData: EventFormData;
    selectedVenues: Venue[];
    message: string;
    onMessageChange: (message: string) => void;
}

const getImageUrl = (image: VenueImage): string => {
    return image.image_url;
};

const formatEventType = (type: string): string => {
    return type.replace(/([A-Z])/g, ' $1').trim();
};

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
};

const formatTime = (timeString: string): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
};

export default function MessageCompositionStep({
    eventData,
    selectedVenues,
    message,
    onMessageChange,
}: MessageCompositionStepProps) {
    const [expandedVenue, setExpandedVenue] = useState<string | null>(null);

    // Generate a suggested message based on event details
    const generateSuggestedMessage = () => {
        const guestRange = `${eventData.expected_capacity_min}-${eventData.expected_capacity_max}`;
        const assetsText = eventData.assets_needed.length > 0 
            ? `\n\nWe'll need the following: ${eventData.assets_needed.join(', ')}.`
            : '';
        
        const suggested = `Hi there!

I'm planning a ${eventData.event_type.toLowerCase()} event and would love to collaborate with your space.

Event Details:
• ${eventData.title}
• ${formatDate(eventData.selected_date)}${eventData.selected_time ? ` at ${formatTime(eventData.selected_time)}` : ''}
• ${guestRange} guests expected
• Duration: ${eventData.duration} hour${eventData.duration !== 1 ? 's' : ''}${assetsText}

${eventData.description ? `\nEvent Description:\n${eventData.description}\n` : ''}
Would you be interested in hosting this event? I&apos;d love to discuss the details and see how we can work together.

Looking forward to hearing from you!`;

        onMessageChange(suggested);
    };

    const toggleVenueDetails = (venueId: string) => {
        setExpandedVenue(expandedVenue === venueId ? null : venueId);
    };

    return (
        <div className="min-h-screen w-full py-4">
            <div className="mx-auto max-w-4xl px-4">
                <h1 className="text-3xl font-bold font-heading mb-8 text-center text-gray-800">
                    Review & Send Messages
                </h1>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Event Summary & Venues */}
                    <div className="space-y-6">
                        {/* Event Summary Card */}
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Event Summary</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">{eventData.title}</h3>
                                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mt-1">
                                        {formatEventType(eventData.event_type)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                    <div className="flex items-center text-gray-600">
                                        <LuCalendar className="w-4 h-4 mr-2" />
                                        <div>
                                            <p className="text-sm font-medium">{formatDate(eventData.selected_date)}</p>
                                            {eventData.selected_time && (
                                                <p className="text-xs">{formatTime(eventData.selected_time)}</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center text-gray-600">
                                        <LuUsers className="w-4 h-4 mr-2" />
                                        <div>
                                            <p className="text-sm font-medium">
                                                {eventData.expected_capacity_min}-{eventData.expected_capacity_max} guests
                                            </p>
                                            <p className="text-xs">{eventData.duration} hour{eventData.duration !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                </div>

                                {eventData.description && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <p className="text-sm text-gray-600 leading-relaxed">{eventData.description}</p>
                                    </div>
                                )}

                                {eventData.assets_needed.length > 0 && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <p className="text-sm font-medium text-gray-700 mb-2">Required Services/Features:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {eventData.assets_needed.map((asset, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                                                >
                                                    {asset}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selected Venues */}
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                Selected Venues ({selectedVenues.length})
                            </h2>
                            
                            <div className="space-y-3">
                                {selectedVenues.map((venue) => {
                                    const isExpanded = expandedVenue === venue.id;
                                    const venueImage = venue.venue_images?.[0] 
                                        ? getImageUrl(venue.venue_images[0])
                                        : venue.image_url || '/images/default-venue-image.jpg';
                                    
                                    return (
                                        <div key={venue.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                            <div 
                                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                                onClick={() => toggleVenueDetails(venue.id)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                                            <Image
                                                                src={venueImage}
                                                                alt={venue.name}
                                                                width={48}
                                                                height={48}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-medium text-gray-900">{venue.name}</h3>
                                                            <p className="text-sm text-gray-500 flex items-center">
                                                                <LuMapPin className="w-3 h-3 mr-1" />
                                                                {venue.neighborhood}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <svg 
                                                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                        fill="none" 
                                                        stroke="currentColor" 
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                            
                                            {isExpanded && (
                                                <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                                                    <div className="pt-3 space-y-2">
                                                        <p className="text-sm text-gray-600 flex items-center">
                                                            <FaRegHandshake className="w-3 h-3 mr-2" />
                                                            {venue.collaboration_type && Array.isArray(venue.collaboration_type) ? 
                                                                venue.collaboration_type.map((type: CollaborationType) => 
                                                                    collaborationTypeLookUp[type as keyof typeof collaborationTypeLookUp]
                                                                ).join(', ') : 
                                                                venue.collaboration_type ? collaborationTypeLookUp[venue.collaboration_type as keyof typeof collaborationTypeLookUp] : ''
                                                            }
                                                        </p>
                                                        {venue.capacity && (
                                                            <p className="text-sm text-gray-600 flex items-center">
                                                                <LuUsers className="w-3 h-3 mr-2" />
                                                                Capacity: {venue.capacity} guests
                                                            </p>
                                                        )}
                                                        {venue.address && (
                                                            <p className="text-sm text-gray-600 flex items-center">
                                                                <LuMapPin className="w-3 h-3 mr-2" />
                                                                {venue.address}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Message Composition */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-800">Your Message</h2>
                                <button
                                    onClick={generateSuggestedMessage}
                                    className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                >
                                    Generate Template
                                </button>
                            </div>
                            
                            <div className="mb-4">
                                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                                    Message to all {selectedVenues.length} venues
                                </label>
                                <textarea
                                    id="message"
                                    value={message}
                                    onChange={(e) => onMessageChange(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[300px] resize-y transition-shadow"
                                    placeholder="Write your message to venue owners..."
                                    rows={12}
                                />
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-xs text-gray-500">
                                        This message will be sent to all selected venues along with your event details.
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {message.length} characters
                                    </p>
                                </div>
                            </div>

                            {/* Message Preview */}
                            {message && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                                    <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        {message}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* What happens next */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h3 className="text-sm font-semibold text-blue-800 mb-2">What happens next?</h3>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Your event will be created</li>
                                <li>• Messages will be sent to all {selectedVenues.length} venues</li>
                                <li>• You&apos;ll be redirected to your event page</li>
                                <li>• Track responses in your event dashboard</li>
                                <li>• Venue owners can accept/decline your request</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 
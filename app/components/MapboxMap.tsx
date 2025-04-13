'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Venue } from '@/types/Venue';

interface MapboxMapProps {
    venues: Venue[];
    selectedVenueId: string | null;
    onMarkerClick: (venueId: string) => void;
}

export default function MapboxMap({ venues, selectedVenueId, onMarkerClick }: MapboxMapProps) {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
    const popupRef = useRef<mapboxgl.Popup | null>(null);
    const nodeRef = useRef<HTMLDivElement | null>(null);
    const mapInitializedRef = useRef<boolean>(false);

    useEffect(() => {
        console.log('MapboxMap received venues data:', venues?.length || 0, 'venues');
    }, [venues]);

    // Function to center the map on a venue
    const centerMapOnVenue = useCallback((venue: Venue) => {
        if (!mapRef.current || typeof venue.latitude !== 'number' || typeof venue.longitude !== 'number') {
            return;
        }

        console.log('Centering map on venue:', venue.id, 'at', [venue.longitude, venue.latitude]);

        mapRef.current.flyTo({
            center: [venue.longitude, venue.latitude],
            zoom: 14,
            duration: 1000
        });
    }, []);

    // Effect to handle selectedVenueId changes
    useEffect(() => {
        console.log('selectedVenueId effect triggered:', selectedVenueId);

        if (!mapRef.current) {
            console.log('Map not initialized yet');
            return;
        }

        if (!selectedVenueId) {
            console.log('No venue selected, clearing popup');
            // Clear popup if no venue is selected
            if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
            }
            return;
        }

        // Find the selected venue
        const selectedVenue = venues.find(venue => venue.id === selectedVenueId);
        if (!selectedVenue) {
            console.log('Selected venue not found in venues list');
            return;
        }

        console.log('Found selected venue:', selectedVenue);

        // Ensure latitude and longitude are defined
        if (typeof selectedVenue.latitude !== 'number' || typeof selectedVenue.longitude !== 'number') {
            console.error('Selected venue has invalid coordinates:', selectedVenue);
            return;
        }

        // Center map on the selected venue
        centerMapOnVenue(selectedVenue);

        // Find the marker for the selected venue
        const marker = markersRef.current[selectedVenueId];

        if (marker) {
            console.log('Found marker for selected venue, toggling popup');

            // Close existing popup if it's not for this marker
            if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
            }

            // Show the popup for this marker
            marker.togglePopup();

            // Store reference to the active popup
            const popup = marker.getPopup();
            if (popup) {
                popupRef.current = popup;
            }

            console.log('Popup toggled for marker');
        } else {
            console.log('No marker found for selected venue');
        }

        // Update all marker styles
        venues.forEach(venue => {
            const marker = markersRef.current[venue.id];
            if (marker) {
                const element = marker.getElement();
                const priceTag = element.querySelector('.price-tag');

                if (priceTag) {
                    if (venue.id === selectedVenueId) {
                        priceTag.classList.add('selected');
                    } else {
                        priceTag.classList.remove('selected');
                    }
                }
            }
        });
    }, [selectedVenueId, venues, centerMapOnVenue]);

    const mapContainer = useCallback((node: HTMLDivElement | null) => {
        nodeRef.current = node;

        if (node === null || mapInitializedRef.current) return;

        console.log('MapContainer callback triggered:', { node, venuesLength: venues?.length || 0 });

        // Set the mapbox token
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        console.log('Mapbox token available:', !!token);

        if (!token) {
            setError('Mapbox token is not configured');
            setIsLoading(false);
            return;
        }

        try {
            mapboxgl.accessToken = token;

            // Create the map
            const map = new mapboxgl.Map({
                container: node,
                // style: 'mapbox://styles/mapbox/light-v11',
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [-73.9880154, 40.7209735],
                zoom: 12,
                attributionControl: false,
            });

            // Add custom controls
            map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
            map.addControl(new mapboxgl.AttributionControl({
                compact: true
            }), 'bottom-left');

            // Store map reference
            mapRef.current = map;

            map.on('load', () => {
                // Add a warm filter to the map
                map.addLayer({
                    id: 'warm-overlay',
                    type: 'background',
                    paint: {
                        'background-color': '#FBBF24',
                        'background-opacity': 0.1
                    }
                });

                console.log('Map loaded successfully with warm overlay. Ready for markers when venue data arrives.');
                setIsLoading(false);
                mapInitializedRef.current = true;

                // If venues are already available when map loads, update markers
                if (venues && venues.length > 0) {
                    console.log('Venues already available when map loaded, adding markers');
                    updateMarkers(venues);
                }
            });

            map.on('error', (e) => {
                console.error('Map error:', e);
                setError('Error loading map: ' + e.error.message);
                setIsLoading(false);
            });

            // Cleanup on unmount
            return () => {
                map.remove();
                mapRef.current = null;
                markersRef.current = {};
                mapInitializedRef.current = false;
                setError(null);
                setIsLoading(true);
            };
        } catch (err) {
            console.error('Map initialization error:', err);
            setError('Failed to initialize map: ' + (err instanceof Error ? err.message : String(err)));
            setIsLoading(false);
        }
    }, []);

    // Function to update markers
    const updateMarkers = useCallback((venues: Venue[]) => {
        console.log('Updating markers for', venues.length, 'venues');
        if (!mapRef.current) {
            console.log('Map not initialized yet, cannot update markers');
            return;
        }

        // Close existing popup if any
        if (popupRef.current) {
            console.log('Removing existing popup during marker update');
            popupRef.current.remove();
            popupRef.current = null;
        }

        // Clear existing markers
        console.log('Clearing', Object.keys(markersRef.current).length, 'existing markers');
        Object.values(markersRef.current).forEach(marker => marker.remove());
        markersRef.current = {};

        // Add markers for each venue
        const markers: { [key: string]: mapboxgl.Marker } = {};

        venues.forEach(venue => {
            // Skip venues with invalid coordinates
            if (typeof venue.latitude !== 'number' || typeof venue.longitude !== 'number') {
                console.warn('Skipping venue with invalid coordinates:', venue);
                return;
            }

            // Create price tag container
            const container = document.createElement('div');
            container.className = 'marker-container';
            container.setAttribute('data-venue-id', venue.id);

            // Create price tag element
            const priceTag = document.createElement('div');
            priceTag.className = 'price-tag';

            // Use actual price instead of random price
            let markerPrice = 'TBD';
            if (venue.price) {
                if (venue.pricing_type === 'hourly' && venue.min_hours) {
                    // For hourly pricing, show total price (hourly rate × minimum hours)
                    const totalCost = venue.price * venue.min_hours;
                    markerPrice = `$${totalCost.toFixed(0)}`;
                } else {
                    markerPrice = `$${venue.price}`;
                }
            }
            priceTag.innerHTML = `<span>${markerPrice}</span>`;

            container.appendChild(priceTag);

            // Style for selected state
            if (venue.id === selectedVenueId) {
                console.log('Marking marker as selected for venue', venue.id);
                priceTag.classList.add('selected');
            }

            // Create the popup for this marker but don't show it yet
            const popup = createVenuePopup(venue);

            // Add the marker to the map
            const marker = new mapboxgl.Marker(container)
                .setLngLat([venue.longitude, venue.latitude])
                .setPopup(popup) // Associate popup with marker
                .addTo(mapRef.current!);

            // If this is the selected venue and popup should be shown
            if (venue.id === selectedVenueId && mapRef.current) {
                // Store the popup reference
                popupRef.current = popup;

                // Show the popup for the selected venue
                marker.togglePopup();
                console.log('Opened popup for selected venue:', venue.id);
            }

            // Store marker reference
            markers[venue.id] = marker;

            // Add click event to marker
            container.addEventListener('click', (e) => {
                console.log('Marker clicked for venue', venue.id);
                e.stopPropagation();
                onMarkerClick(venue.id);
            });
        });

        console.log('Created', Object.keys(markers).length, 'new markers');
        markersRef.current = markers;
    }, [selectedVenueId, onMarkerClick]);

    // Helper function to create a popup for a venue
    const createVenuePopup = useCallback((venue: Venue) => {
        // Format price display for popup
        let priceDisplay = 'Price upon request';
        if (venue.price) {
            if (venue.pricing_type === 'hourly' && venue.min_hours) {
                // For hourly pricing, calculate total cost
                const totalCost = venue.price * venue.min_hours;
                priceDisplay = `$${totalCost.toFixed(0)} for ${venue.min_hours} hour${venue.min_hours > 1 ? 's' : ''}`;
            } else if (venue.pricing_type === 'flat') {
                priceDisplay = `$${venue.price} flat rate`;
            } else if (venue.pricing_type === 'minimum_spend') {
                priceDisplay = `$${venue.price} minimum spend`;
            } else {
                priceDisplay = `$${venue.price}`;
            }
        }

        // Create the popup content
        const popupHTML = `
            <div class="relative bg-white rounded-lg overflow-hidden">
                <!-- Close and heart buttons -->
                <div class="absolute right-2 flex gap-2 z-10">
                    <button class="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md hover:bg-amber-50">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                    <button id="popup-close-btn-${venue.id}" class="close-popup w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md hover:bg-amber-50">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <!-- Image -->
                <div class="w-full">
                    <img src="${venue.image_url}" alt="${venue.name}" class="h-full w-full object-cover">
                </div>
                
                <!-- Content -->
                <div class="p-4">
                    <!-- Ratings -->
                    <div class="flex items-center mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                        <span class="ml-1 font-semibold text-black">${venue.avg_rating || '5.0'}</span>
                        <span class="ml-1 text-black">(${venue.review_count || 'New'})</span>
                    </div>
                    
                    <!-- Venue name -->
                    <h3 class="font-medium text-base text-amber-950">${venue.name}</h3>
                    
                    <!-- Location -->
                    <p class="text-sm text-gray-600 mb-2">
                        ${venue.city}${venue.state ? ', ' + venue.state : ''}
                    </p>
                    
                    <!-- Price -->
                    <div class="mt-2">
                        <span class="font-semibold text-amber-800">${priceDisplay}</span>
                    </div>
                </div>
            </div>
        `;

        // Create popup with custom options
        const popup = new mapboxgl.Popup({
            closeOnClick: true,
            closeButton: false,
            className: 'airbnb-style-popup',
            offset: [0, -30],
        });

        // Set popup content
        popup.setHTML(popupHTML);

        // Add event listener to close button once the popup is added to DOM
        popup.on('open', () => {
            setTimeout(() => {
                const closeBtn = document.getElementById(`popup-close-btn-${venue.id}`);
                if (closeBtn) {
                    closeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        popup.remove();
                        if (popupRef.current === popup) {
                            popupRef.current = null;
                        }
                    });
                }
            }, 10);
        });

        return popup;
    }, []);

    // Effect to initialize markers when map and venues are available
    useEffect(() => {
        console.log('Markers effect triggered:', {
            mapInitialized: mapInitializedRef.current,
            venuesLength: venues?.length || 0
        });

        if (!mapRef.current || !venues?.length) return;

        console.log('Updating markers with', venues.length, 'venues');
        updateMarkers(venues);
    }, [venues, selectedVenueId, onMarkerClick, updateMarkers]);

    // Add debugging for when markers are clicked in VenueList component
    useEffect(() => {
        if (selectedVenueId) {
            console.log('Selected venue ID changed to:', selectedVenueId);
        }
    }, [selectedVenueId]);

    useEffect(() => {
        // Add custom CSS for the popup and markers
        const style = document.createElement('style');
        style.textContent = `
            .airbnb-style-popup {
                z-index: 999 !important;
                pointer-events: auto !important;
            }
            
            .mapboxgl-popup {
                z-index: 999 !important;
                display: block !important;
                visibility: visible !important;
                pointer-events: auto !important;
            }
            
            .airbnb-style-popup .mapboxgl-popup-content {
                padding: 0;
                border-radius: 12px;
                overflow: hidden;
                width: 280px;
                box-shadow: 0 2px 20px rgba(0,0,0,0.2);
                pointer-events: auto !important;
            }
            
            .airbnb-style-popup .mapboxgl-popup-tip {
                display: none;
            }
            
            .marker-container {
                cursor: pointer;
                z-index: 1;
            }
            
            .price-tag {
                background-color: white;
                border-radius: 24px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                color: #222;
                font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-size: 14px;
                font-weight: 600;
                padding: 6px 12px;
                text-align: center;
                transition: transform 0.2s;
                min-width: 50px;
                white-space: nowrap;
            }
            
            .price-tag.selected {
                background-color: #B45309;
                color: white;
                transform: scale(1.1);
                z-index: 2;
            }
            
            .price-tag:hover {
                transform: scale(1.05);
                background-color: #FFF9F5;
                border: 1px solid #B45309;
            }
            
            .price-tag.selected:hover {
                background-color: #B45309;
                border: none;
            }
            
            .close-popup:focus, .close-popup:active {
                outline: none;
            }
            
            /* Ensure the popup container is properly positioned */
            .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip {
                border-top-color: white;
            }

            /* Fix z-index stacking for markers and overlay */
            .mapboxgl-marker {
                z-index: 1 !important;
            }
            
            /* Make the venue carousel overlay have a higher z-index */
            .venue-carousel-overlay {
                z-index: 5;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
            }
        };
    }, []);

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainer} className="w-full h-full" />
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#FFF9F5] bg-opacity-50">
                    <div className="text-amber-700">Loading map...</div>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-50">
                    <div className="text-red-600 p-4 bg-white rounded shadow">{error}</div>
                </div>
            )}
        </div>
    );
} 

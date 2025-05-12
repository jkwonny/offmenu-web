'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Venue } from '@/types/Venue';
import { createRoot } from 'react-dom/client';
import ImageCarousel from './ImageCarousel';

interface MapboxMapProps {
    venues: Venue[];
    selectedVenueId: string | null;
    onMarkerClick: (venueId: string) => void;
}

export default function MapboxMap({ venues, selectedVenueId, onMarkerClick }: MapboxMapProps) {
    const [error, setError] = useState<string | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
    const popupRef = useRef<mapboxgl.Popup | null>(null);
    const nodeRef = useRef<HTMLDivElement | null>(null);
    const mapInitializedRef = useRef<boolean>(false);
    const markerClickedRef = useRef<boolean>(false);
    const popupRootsRef = useRef<{ [key: string]: ReturnType<typeof createRoot> }>({});
    const venuesRef = useRef<Venue[]>(venues);

    // Update venuesRef when venues change to compare in effects
    useEffect(() => {
        venuesRef.current = venues;
    }, [venues]);

    // Helper function to create a popup for a venue
    const createVenuePopup = useCallback((venue: Venue): mapboxgl.Popup => {
        // Format price display for popup
        let priceDisplay = 'Price upon request';
        if (venue.price) {
            if (venue.pricing_type === 'hourly' && venue.min_hours) {
                // For hourly pricing, calculate total cost
                const totalCost = venue.price * venue.min_hours;
                priceDisplay = `$${totalCost.toFixed(0)} for ${venue.min_hours} hour${venue.min_hours > 1 ? 's' : ''}`;
            } else if (venue.pricing_type === 'flat') {
                priceDisplay = `$${venue.price} flat rate`;
            }
        }

        // Get venue images for carousel
        const venueImages = Array.isArray(venue.venue_images)
            ? venue.venue_images.map(img => img.image_url)
            : undefined;

        // Create a new popup with custom content rendered with React
        const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: false,
            maxWidth: '700px',
            className: 'venue-popup',
            closeOnClick: false,
            focusAfterOpen: false,
            anchor: 'bottom'
        });

        // Create a DOM element for the popup content
        const popupContainer = document.createElement('div');

        // Set inner HTML with a container for React to render into
        popupContainer.innerHTML = `
            <div class="p-0 w-[300px]">
                <div id="carousel-container-${venue.id}" class="relative w-full h-64 cursor-pointer" onclick="window.open('/venue/${venue.id}', '_blank')"></div>
                <div class="p-3">
                    <h3 class="font-bold text-lg mb-1 font-heading">${venue.name}</h3>
                    <p class="text-sm text-amber-700 mb-2">${venue.neighborhood}</p>
                    <p class="text-sm text-amber-700 mb-2">${priceDisplay}</p>
                    <a href="/venue/${venue.id}" target="_blank" rel="noopener noreferrer" 
                       class="text-sm text-amber-600 hover:text-amber-700 underline">
                        View Details
                    </a>
                </div>
            </div>
        `;

        // Add the popup element to the DOM so React can render into it
        popup.setDOMContent(popupContainer);

        // When the popup opens, render the React ImageCarousel component into the container
        popup.on('open', () => {
            const carouselContainer = popupContainer.querySelector(`#carousel-container-${venue.id}`);
            if (carouselContainer) {
                // Check if we already have a root for this venue's popup
                if (!popupRootsRef.current[venue.id]) {
                    const root = createRoot(carouselContainer);
                    popupRootsRef.current[venue.id] = root;

                    root.render(
                        <ImageCarousel
                            images={venueImages}
                            height={256}
                            width={256}
                            alt={venue.name}
                        />
                    );
                } else {
                    // Reuse existing root and re-render the carousel
                    popupRootsRef.current[venue.id].render(
                        <ImageCarousel
                            images={venueImages}
                            height={256}
                            width={256}
                            alt={venue.name}
                        />
                    );
                }
            }
        });

        popup.on('close', () => {
            // We'll handle unmounting in our cleanup functions instead of here
            // to avoid issues with React rendering cycles
        });

        return popup;
    }, []);

    // Function to safely unmount a React root
    const unmountRoot = useCallback((venueId: string) => {
        if (popupRootsRef.current[venueId]) {
            try {
                popupRootsRef.current[venueId].unmount();
            } catch (e) {
                console.error('Error unmounting popup root:', e);
            }
            delete popupRootsRef.current[venueId];
        }
    }, []);

    // Function to update markers - only recreate markers if venues change
    const updateMarkers = useCallback((venues: Venue[]): void => {
        if (!mapRef.current) {
            return;
        }

        // Close existing popup if any
        if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
        }

        // Get existing venue IDs and new venue IDs for comparison
        const existingVenueIds = Object.keys(markersRef.current);
        const newVenueIds = venues.map(venue => venue.id);

        // Remove markers that are no longer needed
        existingVenueIds.forEach(id => {
            if (!newVenueIds.includes(id)) {
                // Remove the marker
                markersRef.current[id].remove();
                delete markersRef.current[id];

                // Clean up React root
                unmountRoot(id);
            }
        });

        // Add or update markers for each venue
        venues.forEach(venue => {
            // Skip venues with invalid coordinates
            if (typeof venue.latitude !== 'number' || typeof venue.longitude !== 'number') {
                return;
            }

            // Check if we already have a marker for this venue
            if (markersRef.current[venue.id]) {
                // Update the marker position if needed
                markersRef.current[venue.id].setLngLat([venue.longitude, venue.latitude]);
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

            // Create the popup for this marker but don't show it yet
            const popup = createVenuePopup(venue);

            // Add the marker to the map
            const marker = new mapboxgl.Marker(container)
                .setLngLat([venue.longitude, venue.latitude])
                .setPopup(popup) // Associate popup with marker
                .addTo(mapRef.current!);

            // Store marker reference
            markersRef.current[venue.id] = marker;

            // Add click event to marker
            container.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault(); // Prevent any default behavior

                // Set the flag before calling onMarkerClick to ensure it's set before any effects run
                markerClickedRef.current = true;

                // Get the popup and ensure it's positioned correctly
                const popup = marker.getPopup();
                if (popup) {
                    // Close any existing popup
                    if (popupRef.current && popupRef.current !== popup) {
                        popupRef.current.remove();
                    }

                    // Open this popup manually
                    popup.setLngLat([venue.longitude, venue.latitude]);
                    if (!popup.isOpen()) {
                        popup.addTo(mapRef.current!);
                    }
                    popupRef.current = popup;
                }

                // Now call the click handler
                onMarkerClick(venue.id);

                // Reset after a short delay to ensure all effects complete
                setTimeout(() => {
                    markerClickedRef.current = false;
                }, 500);
            });
        });
    }, [createVenuePopup, onMarkerClick, unmountRoot]);

    // Function to center the map on a venue
    const centerMapOnVenue = useCallback((venue: Venue) => {
        if (!mapRef.current || typeof venue.latitude !== 'number' || typeof venue.longitude !== 'number') {
            return;
        }

        mapRef.current.flyTo({
            center: [venue.longitude, venue.latitude],
            zoom: 14,
            duration: 1000
        });
    }, []);

    const mapContainer = useCallback((node: HTMLDivElement | null) => {
        nodeRef.current = node;

        if (node === null || mapInitializedRef.current) return;

        // Set the mapbox token
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

        if (!token) {
            setError('Mapbox token is not configured');
            return;
        }

        try {
            mapboxgl.accessToken = token;

            // Create the map
            const map = new mapboxgl.Map({
                container: node,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [-73.9880154, 40.7209735],
                zoom: 12,
                attributionControl: false,
                preserveDrawingBuffer: true // Helps prevent white flashes
            });

            // Add custom controls
            map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
            map.addControl(new mapboxgl.AttributionControl({
                compact: true
            }), 'bottom-left');

            // Adjust the center point to account for the content container on the left
            // This ensures the center of the visible map portion is properly centered
            const adjustMapCenter = () => {
                const mapWidth = map.getContainer().offsetWidth;
                const contentWidth = window.innerWidth / 2; // Assuming content takes half the screen
                const offset = (contentWidth / mapWidth) * 0.5; // Calculate offset as a fraction of the map width

                // Apply padding to the left side of the map
                map.setPadding({ left: contentWidth / 2, top: 0, right: 0, bottom: 0 });
            };

            // Call once after map load
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
                mapInitializedRef.current = true;

                // Adjust center after map is loaded
                adjustMapCenter();
            });

            // Readjust on resize
            map.on('resize', adjustMapCenter);

            map.on('error', (e) => {
                console.error('Map error:', e);
                setError('Error loading map: ' + e.error.message);
            });

            // Store map reference
            mapRef.current = map;

            // Cleanup on unmount
            return () => {
                map.remove();
                mapRef.current = null;
                markersRef.current = {};
                mapInitializedRef.current = false;
                setError(null);
            };
        } catch (err) {
            console.error('Map initialization error:', err);
            setError('Failed to initialize map: ' + (err instanceof Error ? err.message : String(err)));
        }
    }, []);

    // Initialize markers when venues data loads (if map is already initialized)
    useEffect(() => {
        if (!mapRef.current || !venues?.length) return;

        // Update markers when venues data changes
        updateMarkers(venues);
    }, [venues, updateMarkers]);

    // Effect to update marker styles and show selected popup
    useEffect(() => {
        if (!mapRef.current || !venues?.length) return;

        // Update marker styles
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

        // Show popup for selected venue if not triggered by marker click
        if (selectedVenueId && markersRef.current[selectedVenueId] && !markerClickedRef.current) {
            const selectedMarker = markersRef.current[selectedVenueId];
            const popup = selectedMarker.getPopup();

            if (popup) {
                // Remove any existing popup first
                if (popupRef.current && popupRef.current !== popup) {
                    popupRef.current.remove();
                }

                // Only show popup if it's not already open
                if (!popup.isOpen()) {
                    popup.addTo(mapRef.current);
                }

                popupRef.current = popup;
            }
        }
    }, [selectedVenueId, venues]);

    // Effect to handle selectedVenueId changes
    useEffect(() => {
        if (!mapRef.current || !selectedVenueId) {
            return;
        }

        // Find the selected venue
        const selectedVenue = venues.find(venue => venue.id === selectedVenueId);
        if (!selectedVenue) {
            return;
        }

        // Ensure latitude and longitude are defined
        if (typeof selectedVenue.latitude !== 'number' || typeof selectedVenue.longitude !== 'number') {
            console.error('Selected venue has invalid coordinates:', selectedVenue);
            return;
        }

        // Only center the map if this wasn't triggered by a marker click
        if (!markerClickedRef.current) {
            centerMapOnVenue(selectedVenue);
        }
    }, [selectedVenueId, venues, centerMapOnVenue]);

    // Effect to clear popup when no venue is selected
    useEffect(() => {
        if (!mapRef.current) return;

        // If no venue is selected, clear any popup
        if (!selectedVenueId) {
            if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
            }
            return;
        }
    }, [selectedVenueId]);

    // Add custom CSS for the popup and markers
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .venue-popup .mapboxgl-popup-content {
                padding: 0;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 20px rgba(0,0,0,0.2);
            }
            
            .venue-popup .mapboxgl-popup-tip {
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
            
            /* Ensure the popup container is properly positioned */
            .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip {
                border-top-color: white;
            }

            /* Fix z-index stacking for markers and overlay */
            .mapboxgl-marker {
                z-index: 1 !important;
            }
            
            /* Style for clickable carousel */
            [id^="carousel-container-"] {
                position: relative;
            }
            
            [id^="carousel-container-"]:hover::after {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(180, 83, 9, 0.2);
                z-index: 2;
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
            // Safely unmount any React roots in popups
            if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
            }

            // Clean up all React roots
            Object.keys(popupRootsRef.current).forEach(unmountRoot);

            // Clean up the map instance
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }

            markersRef.current = {};
            mapInitializedRef.current = false;
            setError(null);
        };
    }, [unmountRoot]);

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainer} className="w-full h-full" />
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-50">
                    <div className="text-red-600 p-4 bg-white rounded shadow">{error}</div>
                </div>
            )}
        </div>
    );
} 

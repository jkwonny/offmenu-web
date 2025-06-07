'use client'
import { useFeaturedVenues } from "./lib/queries";
import { useRouter } from "next/navigation";
import { useEventDetails } from "./context/EventContext";
import React, { useState, useEffect } from "react";
import type { Venue } from "../types/Venue";
import NavBar from "./components/NavBar";
import Image from 'next/image';
import Footer from "./components/Footer";
import DateTimePicker from './components/DateTimePicker';
import { LuMapPin } from "react-icons/lu";
import { FaRegHandshake } from "react-icons/fa";
import { collaborationTypeLookUp } from '@/utils/collaborationTypeLookUp';
import { CollaborationType } from './types/collaboration_types';

// Define local VenueImage interface to avoid import case issues
interface VenueImage {
    image_url: string;
    sort_order?: number;
}

// Helper function to get image URL from VenueImage or string
const getImageUrl = (image: VenueImage | string): string => {
    return typeof image === 'string' ? image : image.image_url;
};

// Define the EventType as it appears in the context
type EventType = 'Pop Up' | 'Birthday' | 'Corporate' | 'Wedding' | 'Other';

export default function Page() {
  const router = useRouter();
  const { data: featuredListings = [], isLoading: loading, error } = useFeaturedVenues();
  const { setEventDetails } = useEventDetails();
  const [eventType, setEventType] = useState("");
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [guestRange, setGuestRange] = useState("");
  const [currentImageIndices, setCurrentImageIndices] = useState<Record<string, number>>({});
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(3);
  
  // Touch/swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Animated placeholder state
  const eventTypes = ['pop-up', 'birthday party', 'corporate event', 'wedding', 'dinner party'];
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [charIndex, setCharIndex] = useState(0);

  // Typewriter effect for placeholder
  useEffect(() => {
    const currentWord = eventTypes[currentPlaceholderIndex];
    
    const interval = setInterval(() => {
      if (isTyping) {
        // Typing phase
        if (charIndex < currentWord.length) {
          setCurrentPlaceholder(currentWord.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        } else {
          // Finished typing, wait then start clearing
          setTimeout(() => {
            setIsTyping(false);
          }, 1500); // Pause at full word for 1.5 seconds
        }
      } else {
        // Clearing phase
        if (charIndex > 0) {
          setCurrentPlaceholder(currentWord.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        } else {
          // Finished clearing, move to next word
          setCurrentPlaceholderIndex((prevIndex) => (prevIndex + 1) % eventTypes.length);
          setIsTyping(true);
        }
      }
    }, isTyping ? 100 : 50); // Type slower (100ms), clear faster (50ms)

    return () => clearInterval(interval);
  }, [currentPlaceholderIndex, charIndex, isTyping]);

  // Handle responsive items per view
  useEffect(() => {
    const getItemsPerView = () => {
      if (typeof window === 'undefined') return 3;
      if (window.innerWidth < 768) return 1; // Mobile
      if (window.innerWidth < 1024) return 2; // Tablet
      return 3; // Desktop
    };

    const updateItemsPerView = () => {
      setItemsPerView(getItemsPerView());
    };

    // Set initial value
    updateItemsPerView();

    // Add resize listener
    window.addEventListener('resize', updateItemsPerView);

    // Cleanup
    return () => window.removeEventListener('resize', updateItemsPerView);
  }, []);

  const handleSearch = () => {
    if (eventType && selectedDate && selectedTime && guestRange) {
      // Parse guest range to get an approximate guest count
      let guestCount = 15; // Default to max of first range
      if (guestRange === '16-30') guestCount = 30;
      if (guestRange === '31-50') guestCount = 50;
      if (guestRange === '51-75') guestCount = 75;
      if (guestRange === '75+') guestCount = 100;

      // Set event details in context
      setEventDetails({
        type: eventType as EventType,
        guestCount,
        date: `${selectedDate} at ${selectedTime}`,
        tags: [`${guestRange} guests`]
      });

      // Navigate to explore page with view=spaces and additional parameters
      const searchParams = new URLSearchParams({
        view: 'spaces',
        eventType: eventType,
        date: selectedDate,
        time: selectedTime,
        guests: guestRange
      });
      
      router.push(`/explore?${searchParams.toString()}`);
    }
  };

  const handleImageNav = (
    event: React.MouseEvent,
    venueId: string,
    direction: 'prev' | 'next',
    maxIndex: number
  ) => {
    event.stopPropagation(); // Prevent triggering the venue click

    setCurrentImageIndices((prev) => {
      const currentIndex = prev[venueId] || 0;
      if (direction === 'prev' && currentIndex > 0) {
        return { ...prev, [venueId]: currentIndex - 1 };
      } else if (direction === 'next' && currentIndex < maxIndex) {
        return { ...prev, [venueId]: currentIndex + 1 };
      }
      return prev;
    });
  };

  // Swipe detection functions
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleCarouselNav('next');
    } else if (isRightSwipe) {
      handleCarouselNav('prev');
    }
  };

  const handleCarouselNav = (direction: 'prev' | 'next') => {
    const maxIndex = Math.max(0, featuredListings.length - itemsPerView);
    
    if (direction === 'prev' && carouselIndex > 0) {
      setCarouselIndex(carouselIndex - 1);
    } else if (direction === 'next' && carouselIndex < maxIndex) {
      setCarouselIndex(carouselIndex + 1);
    }
  };

  return (
    <div className="relative min-h-screen bg-white">
      {/* Floating navbar with margin on all sides */}
      <div className="absolute top-0 left-0 right-0 m-2 md:m-3 z-[10]">
        <div className="bg-white rounded-lg shadow-lg">
          <NavBar />
        </div>
      </div>

      {/* Hero Section */}
      <section className="px-4 sm:px-8 md:px-12 lg:px-24 pt-24 pb-12 md:pt-40 md:pb-20 border-b border-gray-200 min-h-screen flex items-start" style={{ background: 'linear-gradient(to bottom, #89a7cc, #ddeedb)' }}>
        <div className="max-w-8xl mx-auto w-full">
          <div className="max-w-full">
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-2 md:mb-4 font-heading">
              Popups, meet spaces.
            </h1>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-6 md:mb-8 font-heading">
              Spaces, meet popups.
            </h1>
            <p className="text-base sm:text-lg md:text-xl mb-6 md:mb-8 text-[#06048D]">
            Discover venues that bring your pop-up to life.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
              <button className="border border-[#06048D] px-6 md:px-8 py-3 rounded-full font-semibold transition-colors shadow-md cursor-pointer hover:shadow-lg hover:scale-105 text-sm md:text-base" style={{ background: '#fff', color: 'var(--foreground)' }}
                onClick={() => router.push('/submit-event')}
              >
                List Your Event
              </button>
              <button className="bg-[#06048D] text-white px-6 md:px-8 py-3 rounded-full font-semibold transition-colors shadow-md cursor-pointer hover:shadow-lg hover:scale-105 text-sm md:text-base"
                onClick={() => router.push('/explore')}
              >
                Explore Venues
              </button>
            </div>

            {/* Mini Search Function */}
            <div className="px-4 sm:px-6 md:px-8 py-4 md:py-6 bg-white/50 backdrop-blur-md rounded-lg shadow-lg border border-white/20 mb-8 md:mb-12 w-full md:w-fit">
              <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3 md:gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm md:text-base font-medium whitespace-nowrap">I want to host a</span>
                  <input
                    type="text"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    placeholder={currentPlaceholder}
                    className="px-2 py-1 border-b border-gray-300 focus:border-amber-400 focus:outline-none text-center flex-1 md:flex-none text-sm md:text-base"
                    style={{ minWidth: '120px' }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm md:text-base font-medium whitespace-nowrap">on</span>
                  <div className="relative flex-1 md:flex-none">
                    <DateTimePicker
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      onDateSelect={setSelectedDate}
                      onTimeSelect={setSelectedTime}
                      onConfirm={() => setShowDateTimePicker(false)}
                      showPicker={showDateTimePicker}
                      togglePicker={() => setShowDateTimePicker(!showDateTimePicker)}
                      customButton={
                        <button
                          className="px-2 py-1 border-b border-gray-300 text-center flex items-center gap-1 justify-center w-full text-sm md:text-base"
                          style={{ minWidth: '150px' }}
                        >
                          <span className="mx-auto">
                            {selectedDate && selectedTime ?
                              `${new Date(selectedDate).toLocaleDateString()} at ${selectedTime}` :
                              "when"}
                          </span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={showDateTimePicker ? "rotate-180" : ""}>
                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm md:text-base font-medium whitespace-nowrap">for</span>
                  <div className="relative flex-1 md:flex-none">
                    <select
                      value={guestRange}
                      onChange={(e) => setGuestRange(e.target.value)}
                      className="px-2 py-1 border-b border-gray-300 focus:border-amber-400 focus:outline-none text-center appearance-none w-full text-sm md:text-base"
                      style={{ minWidth: '100px' }}
                    >
                      <option value="" disabled hidden>who</option>
                      <option value="1-15">1-15 guests</option>
                      <option value="16-30">16-30 guests</option>
                      <option value="31-50">31-50 guests</option>
                      <option value="51-75">51-75 guests</option>
                      <option value="75+">75+ guests</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>

                <button className="w-full md:w-auto md:ml-2 border border-[#06048D] px-6 md:px-8 py-2 rounded-full font-semibold transition-colors shadow-md cursor-pointer hover:shadow-lg hover:scale-105 mt-3 md:mt-2 text-sm md:text-base" style={{ background: '#fff', color: 'var(--foreground)' }}
                  onClick={handleSearch}
                >
                  Find my space
                </button>
              </div>
            </div>

            {/* Featured Listings Section */}
            <div className="w-full">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 md:mb-10 text-center font-heading text-white">Featured Listings</h2>
              {loading ? (
                <div className="text-center text-base md:text-lg text-white">Loading featured venues...</div>
              ) : error ? (
                <div className="text-center text-red-600 text-sm md:text-base">{error instanceof Error ? error.message : String(error)}</div>
              ) : featuredListings.length === 0 ? (
                <div className="text-center text-base md:text-lg text-white">No featured venues found.</div>
              ) : (
                <div className="relative">
                  {/* Carousel Navigation */}
                  {featuredListings.length > itemsPerView && (
                    <>
                      <button
                        onClick={() => handleCarouselNav('prev')}
                        disabled={carouselIndex === 0}
                        className="absolute left-0 md:-left-16 top-1/2 transform -translate-y-1/2 z-20 bg-white p-2 md:p-3 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-6 md:h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => handleCarouselNav('next')}
                        disabled={carouselIndex >= Math.max(0, featuredListings.length - itemsPerView)}
                        className="absolute right-0 md:-right-16 top-1/2 transform -translate-y-1/2 z-20 bg-white p-2 md:p-3 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-6 md:h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Carousel Container */}
                  <div className="overflow-hidden px-4 md:px-0">
                    <div 
                      className="flex transition-transform duration-300 ease-in-out gap-4 md:gap-6"
                      style={{ 
                        transform: `translateX(-${itemsPerView === 1 ? carouselIndex * 100 : carouselIndex * ((100) / (itemsPerView))}%)`,
                      }}
                      onTouchStart={onTouchStart}
                      onTouchMove={onTouchMove}
                      onTouchEnd={onTouchEnd}
                    >
                      {featuredListings.map((listing: Venue, idx: number) => {
                        const venueImages = listing.venue_images && listing.venue_images.length > 0
                          ? listing.venue_images.map((img: VenueImage) => getImageUrl(img))
                          : [listing.image_url || '/images/default-venue-image.jpg'];

                        const currentIndex = currentImageIndices[listing.id] || 0;
                        const isFirstImage = currentIndex === 0;
                        const isLastImage = currentIndex === venueImages.length - 1;

                        return (
                          <div
                            key={listing.id || idx}
                            className="cursor-pointer bg-[#F6F8FC] p-2 rounded-lg transition-all hover:opacity-90 flex-shrink-0"
                            style={{ 
                              width: itemsPerView === 1 ? '100%' : 
                                     itemsPerView === 2 ? 'calc(50% - 8px)' : 
                                     'calc(33.333% - 10.67px)'
                            }}
                            onClick={() => router.push(`/spaces/${listing.id}`)}
                          >
                            <div className="aspect-[3/2] lg:aspect-[3/2] w-full overflow-hidden rounded-xl relative group">
                              <Image
                                src={venueImages[currentIndex]}
                                alt={listing.name}
                                className="h-full w-full object-cover transition-all duration-500"
                                width={300}
                                height={300}
                              />

                              {/* Navigation buttons - only visible on hover and for larger screens */}
                              {!isFirstImage && (
                                <button
                                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white p-1.5 rounded-full opacity-0 group-hover:opacity-80 transition-opacity shadow-md hidden md:block"
                                  onClick={(e) => handleImageNav(e, listing.id, 'prev', venueImages.length - 1)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                  </svg>
                                </button>
                              )}

                              {!isLastImage && (
                                <button
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white p-1.5 rounded-full opacity-0 group-hover:opacity-80 transition-opacity shadow-md hidden md:block"
                                  onClick={(e) => handleImageNav(e, listing.id, 'next', venueImages.length - 1)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                  </svg>
                                </button>
                              )}

                              {/* Image indicators */}
                              {venueImages.length > 1 && (
                                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                                  {venueImages.map((_: string, index: number) => (
                                    <div
                                      key={index}
                                      className={`h-1.5 w-1.5 rounded-full ${currentIndex === index ? 'bg-white' : 'bg-white/50'}`}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="py-3 px-3">
                              <h3 className="font-medium text-lg md:text-xl text-base">{listing.name}</h3>
                              <p className="text-gray-500 text-xs md:text-sm mt-0.5 flex items-center">
                                <LuMapPin className="w-3 h-3 md:w-4 md:h-4 mr-1 flex-shrink-0" />
                                <span className="truncate">{listing.address}</span>
                              </p>
                              <p className="text-xs md:text-sm mt-1 font-medium flex items-center">
                                <FaRegHandshake className="w-3 h-3 md:w-4 md:h-4 mr-1 flex-shrink-0" />
                                <span className="truncate">
                                  {listing.collaboration_type && Array.isArray(listing.collaboration_type) ?
                                    listing.collaboration_type.map((type: CollaborationType) =>
                                      collaborationTypeLookUp[type as keyof typeof collaborationTypeLookUp]
                                    ).join(', ') :
                                    listing.collaboration_type ? collaborationTypeLookUp[listing.collaboration_type as keyof typeof collaborationTypeLookUp] : ''
                                  }
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Carousel Indicators */}
                  {featuredListings.length > itemsPerView && (
                    <div className="flex justify-center mt-4 md:mt-6 gap-2">
                      {Array.from({ length: Math.max(0, featuredListings.length - (itemsPerView - 1)) }).map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCarouselIndex(index)}
                          className={`h-2 w-2 rounded-full transition-all ${
                            carouselIndex === index ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
} 

'use client'
import { useFeaturedVenues } from "./lib/queries";
import { useRouter } from "next/navigation";
import { useEventDetails } from "./context/EventContext";
import React, { useState } from "react";
import type { Venue } from "../types/Venue";
import NavBar from "./components/NavBar";
import ImageCarousel from "./components/ImageCarousel";
import Footer from "./components/Footer";

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
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Format date without timezone issues
  const formatSelectedDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  const handleDateTimeClick = () => {
    setShowDateTimePicker(!showDateTimePicker);
  };

  const handleDateSelect = (date: string) => {
    console.log('Selected date:', date);
    setSelectedDate(date);
  };

  const handleTimeSelect = (time: string) => {
    console.log('Selected time:', time);
    setSelectedTime(time);
  };

  const handleDateTimeConfirm = () => {
    if (selectedDate && selectedTime) {
      setShowDateTimePicker(false);
    }
  };

  const handleSearch = () => {
    if (eventType && selectedDate && selectedTime) {
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

      // Navigate to explore page with parameters
      router.push(`/explore?eventType=${encodeURIComponent(eventType)}&date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(selectedTime)}&guests=${encodeURIComponent(guestRange)}`);
    }
  };

  // Calendar navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Generate calendar grid for current month
  const generateCalendarMonth = () => {
    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();

    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);

    // Day of week of first day (0 = Sunday, 6 = Saturday)
    const startDayOfWeek = firstDay.getDay();

    // Total days in month
    const daysInMonth = lastDay.getDate();

    // Create array for calendar grid (max 6 weeks * 7 days = 42 cells)
    const calendarDays = [];

    // Add empty cells for days before first of month
    for (let i = 0; i < startDayOfWeek; i++) {
      calendarDays.push(null);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      calendarDays.push({
        date,
        dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isToday: date.getTime() === today.getTime(),
        isPast: date < today,
        isAvailable: date >= today
      });
    }

    return calendarDays;
  };

  // Generate time slots from 12PM to 2AM in 30-minute increments
  const generateTimeSlots = () => {
    const slots = [];
    // 12PM to 11:30PM
    for (let hour = 12; hour < 24; hour++) {
      const hour12 = hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      slots.push(`${hour12}:00 ${ampm}`);
      slots.push(`${hour12}:30 ${ampm}`);
    }
    // 12AM to 2AM
    slots.push(`12:00 AM`);
    slots.push(`12:30 AM`);
    slots.push(`1:00 AM`);
    slots.push(`1:30 AM`);
    slots.push(`2:00 AM`);

    return slots;
  };

  console.log('selectedTime', selectedTime);

  console.log(featuredListings);
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <NavBar />
      {/* Hero Section */}
      <section className="px-4 pt-16 pb-12 md:pt-24 md:pb-20 border-b">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 font-heading">
            Popups, meet venues.
          </h1>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 font-heading">
            Venues, meet popups.
          </h1>
          <p className="text-lg md:text-xl mb-8" style={{ color: '#a80010' }}>
            Find a space to host, or discover who&apos;s looking for one.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 rounded-full font-semibold transition-colors shadow-md border cursor-pointer hover:bg-amber-100 hover:shadow-lg hover:scale-105" style={{ background: '#fff', color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
              onClick={() => router.push('/booking')}
            >
              List Your Event
            </button>
            <button className="px-8 py-3 rounded-full font-semibold transition-colors shadow-md border cursor-pointer hover:bg-amber-100 hover:shadow-lg hover:scale-105" style={{ background: '#fff', color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
              onClick={() => router.push('/explore')}
            >
              Explore Venues
            </button>
          </div>

          {/* Mini Search Function */}
          <div className="mt-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-base font-medium">I want to host a</span>
              <input
                type="text"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="dinner, party, pop-up..."
                className="px-2 py-1 border-b border-gray-300 focus:border-amber-400 focus:outline-none text-center"
                style={{ minWidth: '150px' }}
              />

              <span className="text-base font-medium">on</span>
              <div className="relative">
                <button
                  onClick={handleDateTimeClick}
                  className="px-2 py-1 border-b border-gray-300 text-center flex items-center gap-1 justify-center"
                  style={{ minWidth: '180px' }}
                >
                  {selectedDate && selectedTime ?
                    `${new Date(selectedDate).toLocaleDateString()} at ${selectedTime}` :
                    "when"}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={showDateTimePicker ? "rotate-180" : ""}>
                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {showDateTimePicker && (
                  <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden" style={{ width: '520px', left: '50%', transform: 'translateX(-50%)' }}>
                    <div className="flex border-b">
                      <div className="w-3/5 border-r">
                        <div className="flex justify-between items-center p-3 border-b">
                          <button onClick={prevMonth} className="p-1">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <div className="font-medium">
                            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </div>
                          <button onClick={nextMonth} className="p-1">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>

                        <div className="grid grid-cols-7 mb-1 border-b">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                            <div key={day} className="text-center py-2 text-sm font-medium">
                              {day}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 p-2">
                          {generateCalendarMonth().map((day, index) => (
                            <div key={index} className="p-1 text-center">
                              {day ? (
                                <button
                                  onClick={() => day.isAvailable && handleDateSelect(day.dateString)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                                    ${day.isToday ? 'border border-amber-500' : ''}
                                    ${day.isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                                    ${day.isAvailable && !day.isToday ? 'cursor-pointer' : ''}
                                    ${day.dateString === selectedDate ? 'bg-[#a80010] text-white border-2 border-[#a80010]' :
                                      (day.isAvailable && !day.isToday ? 'hover:bg-[#f5d6d8]' : '')}
                                  `}
                                  disabled={!day.isAvailable}
                                >
                                  {day.date.getDate()}
                                </button>
                              ) : (
                                <div className="w-8 h-8"></div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="w-2/5 flex flex-col">
                        <div className="p-3 border-b font-medium text-center">
                          Select Time
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[300px] p-2">
                          <div className="flex flex-col gap-1">
                            {generateTimeSlots().map((time) => (
                              <button
                                key={time}
                                onClick={() => handleTimeSelect(time)}
                                className={`text-sm py-2 px-3 rounded text-left
                                  ${selectedTime === time ? 'bg-[#a80010] text-white font-medium' : 'hover:bg-[#f5d6d8]'}
                                `}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t p-3 flex justify-between items-center">
                      <div className="text-sm">
                        {selectedDate ?
                          selectedTime ?
                            `Selected: ${formatSelectedDate(selectedDate)} at ${selectedTime}` :
                            `Selected: ${formatSelectedDate(selectedDate)} - Please select a time`
                          : "Please select a date and time"}
                      </div>
                      <button
                        onClick={handleDateTimeConfirm}
                        disabled={!selectedDate || !selectedTime}
                        className={`px-4 py-1 rounded-full text-sm font-medium ${selectedDate && selectedTime ?
                          'bg-[#a80010] text-white hover:bg-[#880010]' :
                          'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <span className="text-base font-medium">for</span>
              <div className="relative">
                <select
                  value={guestRange}
                  onChange={(e) => setGuestRange(e.target.value)}
                  className="px-2 py-1 border-b border-gray-300 focus:border-amber-400 focus:outline-none text-center appearance-none"
                  style={{ minWidth: '120px' }}
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

              <button className="px-8 py-3 rounded-full font-semibold transition-colors shadow-md border cursor-pointer hover:bg-amber-100 hover:shadow-lg hover:scale-105 mt-2" style={{ background: '#fff', color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
                onClick={handleSearch}
              // className="px-6 py-2 ml-2 rounded-full font-semibold transition-colors shadow-md border cursor-pointer hover:bg-amber-100 hover:shadow-lg mt-4"
              // style={{ background: '#fff', color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
              >
                Find my venue
              </button>

              {/* <button className="px-8 py-3 rounded-full font-semibold transition-colors shadow-md border cursor-pointer hover:bg-amber-100 hover:shadow-lg hover:scale-105" style={{ background: '#fff', color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
              onClick={() => router.push('/explore')}
            >
              Explore Venues
            </button> */}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-14 md:py-20 bg-[#fbfbfa]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center font-heading" style={{ color: 'var(--foreground)' }}>What are you planning?</h2>
          <p className="text-center text-lg mb-12">
            Whether you&apos;re hosting a pop-up, planning an event, or celebrating a special occasion,<br />
            OffMenu has the perfect venue for you.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 text-4xl">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Pop-Up</h3>
              <p className="text-base">
                Temporary restaurants, retail, or exhibitions in unique spaces
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-5 text-4xl">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Event</h3>
              <p className="text-base">
                Special gatherings, product launches, or networking mixers
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-5 text-4xl">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M6 21V19C6 16.7909 7.79086 15 10 15H14C16.2091 15 18 16.7909 18 19V21" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Birthday</h3>
              <p className="text-base">
                Private celebrations for you and your closest friends
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-5 text-4xl">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M15 8C15 6.34315 16.3431 5 18 5C19.6569 5 21 6.34315 21 8C21 9.65685 19.6569 11 18 11" stroke="currentColor" strokeWidth="2" />
                  <path d="M4 21V19C4 16.7909 5.79086 15 8 15H10C12.2091 15 14 16.7909 14 19V21" stroke="currentColor" strokeWidth="2" />
                  <path d="M13 15.5C13.8284 15.5 14.5 16.1716 14.5 17C14.5 17.8284 13.8284 18.5 13 18.5M18 15.5C18.8284 15.5 19.5 16.1716 19.5 17C19.5 17.8284 18.8284 18.5 18 18.5" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Corporate</h3>
              <p className="text-base">
                Team meetings, client dinners, or company celebrations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Listings Section */}
      <section className="px-4 py-14 md:py-20 border-y">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center font-heading">Why OffMenu?</h2>
          <p className="text-center text-lg mb-12">
            We make it easy to find and book the perfect venue for any occasion.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 p-4 bg-white rounded-full">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Unique Venues</h3>
              <p className="text-base">
                Discover hidden gems and trendy spaces that aren&apos;t available on typical booking platforms.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-5 p-4 bg-white rounded-full">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Simplified Booking</h3>
              <p className="text-base">
                From initial inquiry to final confirmation, our platform makes the booking process seamless.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-5 p-4 bg-white rounded-full">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 22C16 18 20 14.4183 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 14.4183 8 18 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Local Focus</h3>
              <p className="text-base">
                Starting with New York City&apos;s best spaces, we&apos;re highlighting what makes each neighborhood special.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center font-heading" style={{ color: 'var(--foreground)' }}>Featured Listings</h2>
          {loading ? (
            <div className="text-center text-lg">Loading featured venues...</div>
          ) : error ? (
            <div className="text-center text-red-600">{error instanceof Error ? error.message : String(error)}</div>
          ) : featuredListings.length === 0 ? (
            <div className="text-center text-lg">No featured venues found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredListings.map((listing: Venue, idx: number) => (
                <div key={listing.id || idx} className="rounded-xl shadow-sm flex flex-col overflow-hidden" style={{ background: 'var(--background)', borderColor: '#e0d8c3' }}>
                  <ImageCarousel
                    images={Array.isArray(listing.venue_images) ? listing.venue_images.map((img: { image_url: string }) => img.image_url) : undefined}
                    height={192}
                    alt={`${listing.name} image`}
                  />
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>{listing.name}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(listing.tags || []).map((tag: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-full text-xs font-medium capitalize" style={{ background: '#f5d6d8', color: '#a80010' }}>
                          {tag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => router.push(`/venue/${listing.id}`)}
                      className="mt-auto px-5 py-2 rounded-full font-semibold transition-colors cursor-pointer hover:bg-amber-100 hover:shadow-lg hover:scale-105"
                      style={{ background: '#fff', color: 'var(--foreground)', border: '1px solid var(--foreground)' }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
} 

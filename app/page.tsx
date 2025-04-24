'use client'
import React from "react";
import { useFeaturedVenues } from "./lib/queries";
import type { Venue } from "../types/Venue";
import { useRouter } from "next/navigation";
import NavBar from "./components/NavBar";
import ImageCarousel from "./components/ImageCarousel";
import Footer from "./components/Footer";

export default function Page() {
  const router = useRouter();
  const { data: featuredListings = [], isLoading: loading, error } = useFeaturedVenues();

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
              onClick={() => router.push('/booking/step1')}
            >
              List Your Event
            </button>
            <button className="px-8 py-3 rounded-full font-semibold transition-colors shadow-md border cursor-pointer hover:bg-amber-100 hover:shadow-lg hover:scale-105" style={{ background: '#fff', color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
              onClick={() => router.push('/booking/step1')}
            >
              Explore Venues
            </button>
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
                <div key={listing.id || idx} className="rounded-xl shadow-sm border flex flex-col overflow-hidden" style={{ background: 'var(--background)', borderColor: '#e0d8c3' }}>
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

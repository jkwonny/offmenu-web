'use client'
import React from "react";
import { useFeaturedVenues } from "./lib/queries";
import type { Venue } from "../types/Venue";
import { useRouter } from "next/navigation";
import NavBar from "./components/NavBar";
import Image from "next/image";
import ImageCarousel from "./components/ImageCarousel";

// Placeholder icons (replace with real icons as needed)
const IconPopUp = () => (
  <div className="bg-amber-100 text-amber-700 rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold">🎉</div>
);
const IconVenue = () => (
  <div className="bg-amber-100 text-amber-700 rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold">🏢</div>
);
const IconEvent = () => (
  <div className="bg-amber-100 text-amber-700 rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold">🔎</div>
);

export default function Page() {
  const router = useRouter();
  const { data: featuredListings = [], isLoading: loading, error } = useFeaturedVenues();

  return (
    <div className="font-sans min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <NavBar />
      {/* Hero Section */}
      <section className="px-4 pt-16 pb-12 md:pt-24 md:pb-20 border-b">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Popups, meet venues.
          </h1>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Venues, meet popups.
          </h1>
          <p className="text-lg md:text-xl mb-8" style={{ color: '#a80010' }}>
            Find a space to host, or discover who&apos;s looking for one.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 rounded-full font-semibold transition-colors shadow-md border cursor-pointer hover:bg-amber-100 hover:shadow-lg hover:scale-105" style={{ background: '#fff', color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
              onClick={() => router.push('/booking/step1')}
            >
              List Your Pop Up
            </button>
            <button className="px-8 py-3 rounded-full font-semibold border transition-colors shadow-md cursor-pointer hover:bg-amber-100 hover:shadow-lg hover:scale-105" style={{ background: '#fff', color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
              onClick={() => router.push('/submit-venue')}>
              List Your Venue
            </button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-14 md:py-20" style={{ background: 'var(--background)' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center" style={{ color: 'var(--foreground)' }}>How It Works</h2>
          <div className="flex flex-col md:flex-row gap-8 md:gap-0 justify-between items-center">
            {[
              {
                label: "Submit a pop-up or venue",
                icon: <span className="text-3xl">📝</span>,
              },
              {
                label: "Discover matches",
                icon: <span className="text-3xl">🔗</span>,
              },
              {
                label: "Message and connect",
                icon: <span className="text-3xl">💬</span>,
              },
            ].map((step, idx) => (
              <div key={step.label} className="flex flex-col items-center flex-1 relative">
                <div className="mb-3">{step.icon}</div>
                <div className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Step {idx + 1}</div>
                <div className="text-center text-base mb-2" style={{ color: '#a80010' }}>{step.label}</div>
                {idx < 2 && (
                  <div className="hidden md:block absolute right-0 top-1/2 transform -translate-y-1/2">
                    <div className="w-16 h-1" style={{ background: '#e0d8c3' }}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings Section */}
      <section className="px-4 py-14 md:py-20 border-y">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center" style={{ color: 'var(--foreground)' }}>Featured Listings</h2>
          {loading ? (
            <div className="text-center text-lg">Loading featured venues...</div>
          ) : error ? (
            <div className="text-center text-red-600">{error instanceof Error ? error.message : String(error)}</div>
          ) : featuredListings.length === 0 ? (
            <div className="text-center text-lg">No featured venues found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

      {/* Use Case Cards Section */}
      <section className="px-4 py-14 md:py-20" style={{ background: 'var(--background)' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center" style={{ color: 'var(--foreground)' }}>Who Is OffMenu For?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl shadow-sm border p-8 flex flex-col items-center text-center cursor-pointer transition-transform hover:shadow-lg hover:scale-105">
              <IconPopUp />
              <div className="text-lg font-bold mt-4 mb-2" style={{ color: 'var(--foreground)' }}>Pop-Up Organizers</div>
              <div className="text-base" style={{ color: '#a80010' }}>Find unique venues to bring your creative ideas to life.</div>
            </div>
            <div className="rounded-xl shadow-sm border p-8 flex flex-col items-center text-center cursor-pointer transition-transform hover:shadow-lg hover:scale-105">
              <IconVenue />
              <div className="text-lg font-bold mt-4 mb-2" style={{ color: 'var(--foreground)' }}>Venue Owners</div>
              <div className="text-base" style={{ color: '#a80010' }}>Connect with pop-up organizers and maximize your space&apos;s potential.</div>
            </div>
            <div className="rounded-xl shadow-sm border p-8 flex flex-col items-center text-center cursor-pointer transition-transform hover:shadow-lg hover:scale-105">
              <IconEvent />
              <div className="text-lg font-bold mt-4 mb-2" style={{ color: 'var(--foreground)' }}>Event Seekers</div>
              <div className="text-base" style={{ color: '#a80010' }}>Discover exciting pop-ups and events happening near you.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 

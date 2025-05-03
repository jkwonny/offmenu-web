'use client';

import Link from 'next/link';
import { useUser } from '../context/UserContext';
import { useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function TabsSection() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const isExplorePage = pathname === '/explore';
    const view = searchParams.get('view');

    if (!isExplorePage) return null;

    return (
        <div className="flex rounded-lg overflow-hidden shadow-sm">
            <Link
                href="/explore?view=spaces"
                className={`px-6 py-2 text-sm font-medium transition-colors ${view === 'spaces'
                    ? 'bg-[#ca0013] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
            >
                Spaces
            </Link>
            <Link
                href="/explore?view=popups"
                className={`px-6 py-2 text-sm font-medium transition-colors ${view === 'popups'
                    ? 'bg-[#ca0013] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
            >
                Popups
            </Link>
        </div>
    );
}

// Fallback UI while suspense is loading
function TabsSkeletonLoader() {
    return (
        <div className="flex rounded-lg overflow-hidden shadow-sm">
            <div className="px-6 py-2 bg-gray-200 animate-pulse w-24" />
            <div className="px-6 py-2 bg-gray-200 animate-pulse w-24" />
        </div>
    );
}

export default function NavBar() {
    const { user, userProfile, signOut, isLoading } = useUser();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const isSpacesHost = userProfile?.spaces_host || false;

    console.log('user in nav bar', user);

    return (
        <nav className="bg-[#fbfbfa] border-b border-gray-200 w-full py-3">
            <div className="grid grid-cols-3 px-4 md:px-10 py-2 items-center">
                {/* Left section - Logo */}
                <div className="flex items-center">
                    <Link href="/" className="text-xl font-bold font-heading">
                        OffMenu
                    </Link>
                </div>

                {/* Center section - Tabs (only visible on explore page) */}
                <div className="flex justify-center items-center">
                    {(
                        <Suspense fallback={<TabsSkeletonLoader />}>
                            <TabsSection />
                        </Suspense>
                    )}
                </div>

                {/* Right section - Navigation and Auth */}
                <div className="flex items-center justify-end gap-6">
                    {/* Hamburger menu button - visible on mobile only */}
                    <button
                        className="md:hidden flex flex-col space-y-1.5"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        <span className={`block w-6 h-0.5 bg-gray-800 transition-transform duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                        <span className={`block w-6 h-0.5 bg-gray-800 transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
                        <span className={`block w-6 h-0.5 bg-gray-800 transition-transform duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                    </button>

                    {/* Desktop navigation - hidden on mobile */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link href="/explore?view=spaces" className="text-gray-700 hover:text-black">
                            Explore
                        </Link>

                        <Link href="/submit-venue" className="text-gray-700 hover:text-black">
                            List your Venue
                        </Link>

                        {isLoading ? (
                            <div className="h-5 w-16 bg-gray-200 animate-pulse rounded"></div>
                        ) : user ? (
                            <div className="relative group">
                                <Link href="/profile" className="flex items-center text-gray-700 hover:text-black">
                                    My Account <span className="ml-1">&#9662;</span>
                                </Link>
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 invisible group-hover:visible">
                                    <div className="absolute h-2 w-full top-[-8px]"></div>
                                    <Link href="/chat" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        Messages
                                    </Link>

                                    {isSpacesHost && (
                                        <Link href="/host/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                            Host Dashboard
                                        </Link>
                                    )}

                                    <button
                                        onClick={() => signOut()}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Log out
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link
                                    href="/auth/sign-in"
                                    className="text-gray-700 hover:text-black"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    href="/auth/sign-up"
                                    className="bg-black text-white px-4 py-1.5 rounded-md hover:bg-gray-800"
                                >
                                    Sign up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile menu - shown when hamburger is clicked */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-200 px-4 py-3 space-y-4 shadow-lg">
                    <Link href="/explore" className="text-gray-700 hover:text-black">
                        Explore
                    </Link>

                    <Link
                        href="/submit-venue"
                        className="block py-2 text-gray-700 hover:text-black"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        List your Venue
                    </Link>

                    {isLoading ? (
                        <div className="h-5 w-16 bg-gray-200 animate-pulse rounded"></div>
                    ) : user ? (
                        <div className="space-y-3">
                            <Link
                                href="/profile"
                                className="block py-2 text-gray-700 hover:text-black"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                My Account
                            </Link>
                            <Link
                                href="/chat"
                                className="block py-2 text-gray-700 hover:text-black"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Messages
                            </Link>

                            {isSpacesHost && (
                                <Link
                                    href="/host/dashboard"
                                    className="block py-2 text-gray-700 hover:text-black"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Host Dashboard
                                </Link>
                            )}

                            <button
                                onClick={() => {
                                    signOut();
                                    setMobileMenuOpen(false);
                                }}
                                className="block w-full text-left py-2 text-gray-700 hover:text-black"
                            >
                                Log out
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col space-y-3 pt-2">
                            <Link
                                href="/auth/sign-in"
                                className="block text-gray-700 hover:text-black"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Sign in
                            </Link>
                            <Link
                                href="/auth/sign-up"
                                className="bg-black text-white px-4 py-1.5 rounded-md hover:bg-gray-800 inline-block text-center"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Sign up
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
} 
import Link from 'next/link';
import { useUser } from '../context/UserContext';
import { useState } from 'react';

export default function NavBar() {
    const { user, signOut, isLoading } = useUser();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="bg-[#fbfbfa] border-b border-gray-200 w-full py-3">
            <div className="flex justify-between px-4 md:px-10 py-2 items-center">
                <Link href="/" className="text-xl font-bold font-heading">
                    OffMenu
                </Link>

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
                    <Link href="/explore" className="text-gray-700 hover:text-black">
                        Venues
                    </Link>

                    <Link href="/events" className="text-gray-700 hover:text-black">
                        Events
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

            {/* Mobile menu - shown when hamburger is clicked */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-200 px-4 py-3 space-y-4 shadow-lg">
                    <Link
                        href="/explore"
                        className="block py-2 text-gray-700 hover:text-black"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        Venues
                    </Link>

                    <Link
                        href="/events"
                        className="block py-2 text-gray-700 hover:text-black"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        Events
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
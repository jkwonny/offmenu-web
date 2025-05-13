'use client';

import Link from 'next/link';
import { useUser } from '../context/UserContext';
import { useState, Suspense, useRef, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import FeedbackModal from './FeedbackModal';
import Image from 'next/image';
import { useProfilePictureUrl } from '../lib/queries/user';

function TabsSection() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const isExplorePage = pathname === '/explore';
    const view = searchParams.get('view');

    if (!isExplorePage) return null;

    return (
        <div className="flex overflow-hidden rounded-full">
            <Link
                href="/explore?view=spaces"
                className={`px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${!view || view === 'spaces'
                    ? 'bg-black text-white'
                    : 'bg-white text-black'
                    }`}
            >
                Spaces
            </Link>
            <Link
                href="/explore?view=popups"
                className={`px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${view === 'popups'
                    ? 'bg-black text-white'
                    : 'bg-white text-black'
                    }`}
            >
                Pop-ups
            </Link>
        </div>
    );
}

// Fallback UI while suspense is loading
function TabsSkeletonLoader() {
    return (
        <div className="flex rounded-lg overflow-hidden shadow-sm w-full max-w-[200px] mx-auto">
            <div className="px-3 md:px-6 py-2 bg-gray-200 animate-pulse w-full" />
            <div className="px-3 md:px-6 py-2 bg-gray-200 animate-pulse w-full" />
        </div>
    );
}

export default function NavBar() {
    const { user, userProfile, signOut, isLoading } = useUser();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const isSpacesHost = userProfile?.spaces_host || false;
    const isAdmin = userProfile?.role === 'admin';
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { data: profilePictureUrl } = useProfilePictureUrl(userProfile?.profile_picture);


    const openFeedbackModal = () => {
        setFeedbackModalOpen(true);
        // Close the dropdown menu when opening the modal
        setMobileMenuOpen(false);
        setDropdownOpen(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <nav className="w-full py-2 px-4 rounded-lg">
            <div className="grid grid-cols-3 items-center">
                {/* Left section - Logo */}
                <div className="flex items-center">
                    <Link href="/" className="text-xl font-bold font-heading">
                        OFFMENU
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
                <div className="flex items-center justify-end gap-2 md:gap-4">
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
                    <div className="hidden md:flex items-center gap-3 xl:gap-4">
                        {/* <button className="flex items-center gap-2 text-gray-700 hover:text-black">
                            <span>Change to list</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                        </button> */}

                        <Link href="/explore?view=spaces" className="text-gray-700 hover:text-black whitespace-nowrap">
                            Explore
                        </Link>


                        {isLoading ? (
                            <div className="h-5 w-16 bg-gray-200 animate-pulse rounded"></div>
                        ) : user ? (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center cursor-pointer border border-gray-300 rounded-full overflow-hidden p-2"
                                >
                                    <div className="flex items-center rounded-full overflow-hidden mr-2">
                                        {profilePictureUrl ? (
                                            <Image
                                                src={profilePictureUrl}
                                                alt="Profile"
                                                width={40}
                                                height={40}
                                                className="object-cover w-8 h-8 rounded-full"
                                            />
                                        ) : (
                                            <svg
                                                className="h-6 w-6 text-gray-400"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                        )}
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 origin-top-right transform transition-all duration-200 ease-out animate-menu-open">
                                        <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>
                                            Account
                                        </Link>
                                        <Link href="/submit-venue" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>
                                            Become a Host
                                        </Link>
                                        <Link href="/chat" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>
                                            Messages
                                        </Link>

                                        {isAdmin && (
                                            <Link href="/admin/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>
                                                Admin Dashboard
                                            </Link>
                                        )}

                                        {isSpacesHost && (
                                            <Link href="/manage/dashboard?view=spaces" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>
                                                Manager Dashboard
                                            </Link>
                                        )}

                                        <button
                                            onClick={openFeedbackModal}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Submit Feedback
                                        </button>

                                        <button
                                            onClick={() => {
                                                signOut();
                                                setDropdownOpen(false);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Log out
                                        </button>
                                    </div>
                                )}
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
                    {/* Add user info at the top of mobile menu */}
                    {user && !isLoading && (
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                            <div className="flex items-center border rounded-full overflow-hidden bg-gray-200">
                                {profilePictureUrl ? (
                                    <Image
                                        src={profilePictureUrl}
                                        alt="Profile"
                                        width={32}
                                        height={32}
                                        className="object-cover w-8 h-8"
                                    />
                                ) : (
                                    <svg
                                        className="h-16 w-16 text-gray-400"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                )}
                            </div>
                            <div className="text-sm text-gray-700 font-medium truncate">
                                {userProfile?.name || user.email}
                            </div>
                        </div>
                    )}

                    {/* Add TabsSection for mobile */}
                    <div className="mb-2 flex justify-center">
                        <Suspense fallback={<TabsSkeletonLoader />}>
                            <TabsSection />
                        </Suspense>
                    </div>

                    {isLoading ? (
                        <div className="h-5 w-16 bg-gray-200 animate-pulse rounded"></div>
                    ) : user ? (
                        <div className="space-y-3">
                            <Link href="/explore" className="block py-2 text-gray-700 hover:text-black">
                                Explore
                            </Link>
                            <Link
                                href="/profile"
                                className="block py-2 text-gray-700 hover:text-black"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Account
                            </Link>
                            <Link
                                href="/submit-venue"
                                className="block py-2 text-gray-700 hover:text-black"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Become a Host
                            </Link>
                            <Link
                                href="/chat"
                                className="block py-2 text-gray-700 hover:text-black"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Messages
                            </Link>
                            {isAdmin && (
                                <Link
                                    href="/admin/dashboard"
                                    className="block py-2 text-gray-700 hover:text-black"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Admin Dashboard
                                </Link>
                            )}
                            {isSpacesHost && (
                                <Link
                                    href="/manage/dashboard?view=spaces"
                                    className="block py-2 text-gray-700 hover:text-black"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Manager Dashboard
                                </Link>
                            )}

                            <button
                                onClick={openFeedbackModal}
                                className="block w-full text-left py-2 text-gray-700 hover:text-black"
                            >
                                Submit Feedback
                            </button>

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

            {/* Feedback Modal */}
            <FeedbackModal isOpen={feedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} />
        </nav>
    );
} 
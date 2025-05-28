'use client';

import { useUser } from '../context/UserContext';
import { useState, Suspense, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfilePictureUrl } from '../lib/queries/user';
import { BiSolidMessageRounded } from "react-icons/bi";
import { IoMdClose } from "react-icons/io";
import { TabsSection, TabsSkeletonLoader } from './Navbar/index';
import Link from 'next/link';
import FeedbackModal from './FeedbackModal';
import Image from 'next/image';
import { useChatRooms } from '../lib/hooks/useChatRooms';


export default function NavBar() {
    const { user, userProfile, signOut, isLoading } = useUser();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [chatDropdownOpen, setChatDropdownOpen] = useState(false);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const isAdmin = userProfile?.role === 'admin';
    const dropdownRef = useRef<HTMLDivElement>(null);
    const chatDropdownRef = useRef<HTMLDivElement>(null);
    const { data: profilePictureUrl } = useProfilePictureUrl(userProfile?.profile_picture);
    const router = useRouter();

    // Use the custom hook to fetch chat rooms
    const { rooms: chatRooms, isLoading: loadingChats } = useChatRooms(user?.id);

    const openFeedbackModal = () => {
        setFeedbackModalOpen(true);
        // Close the dropdown menu when opening the modal
        setMobileMenuOpen(false);
        setDropdownOpen(false);
    };

    const handleChatClick = () => {
        if (!user) {
            router.push('/auth/sign-in');
            return;
        }

        setChatDropdownOpen(!chatDropdownOpen);
    };

    const handleChatRoomClick = (roomId: string) => {
        router.push(`/chat?chatRoomId=${roomId}`);
        setChatDropdownOpen(false);
    };

    // Format date to display time or date
    const formatMessageDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date >= today) {
            // Today, show time
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (date >= yesterday) {
            // Yesterday
            return 'Yesterday';
        } else {
            // Show date
            return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
            if (chatDropdownRef.current && !chatDropdownRef.current.contains(event.target as Node)) {
                setChatDropdownOpen(false);
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

                        {/* Chat Icon with dropdown */}
                        <div className="relative" ref={chatDropdownRef}>
                            <button
                                onClick={handleChatClick}
                                className="flex items-center cursor-pointer text-gray-700 hover:text-black relative border border-gray-300 rounded-full overflow-hidden p-2"
                                aria-label="Messages"
                            >
                                <div className="relative w-6 h-6">
                                    <div className={`absolute inset-0 transition-all duration-300 ${chatDropdownOpen ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`}>
                                        <BiSolidMessageRounded className="w-6 h-6" />
                                    </div>
                                    <div className={`absolute inset-0 transition-all duration-300 ${chatDropdownOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-0'}`}>
                                        <IoMdClose className="w-6 h-6" />
                                    </div>
                                </div>
                                {/* {chatRooms.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                        {chatRooms.length > 9 ? '9+' : chatRooms.length}
                                    </span>
                                )} */}
                            </button>

                            {chatDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-20 origin-top-right animate-dropdown overflow-hidden">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
                                            <Link
                                                href="/chat"
                                                className="text-sm text-blue-600 hover:text-blue-800"
                                                onClick={() => setChatDropdownOpen(false)}
                                            >
                                                See all
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="max-h-80 overflow-y-auto">
                                        {loadingChats ? (
                                            <div className="flex justify-center items-center py-6">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                            </div>
                                        ) : chatRooms.length === 0 ? (
                                            <div className="py-4 px-4 text-center text-gray-500">
                                                No messages yet
                                            </div>
                                        ) : (
                                            chatRooms.map((room) => (
                                                <div
                                                    key={room.id}
                                                    onClick={() => handleChatRoomClick(room.id)}
                                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-start gap-3 border-b border-gray-100 last:border-b-0"
                                                >
                                                    <div className="w-10 h-10 bg-amber-100 rounded-full flex-shrink-0 flex items-center justify-center text-amber-600 uppercase">
                                                        {room.venue_name ? room.venue_name.charAt(0) : '?'}
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="font-medium text-gray-900 truncate max-w-[180px]">
                                                                {room.venue_name || room.venue.name || 'Unknown Venue'}
                                                            </h4>
                                                            {room.latest_message && (
                                                                <span className="text-xs text-gray-500">
                                                                    {formatMessageDate(room.latest_message.created_at)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-500 truncate">
                                                            {room.latest_message
                                                                ? `${room.latest_message.sender.name}: ${room.latest_message.content}`
                                                                : 'No messages yet'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>


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
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-30 origin-top-right transform transition-all duration-200 ease-out animate-menu-open">
                                        <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>
                                            Account
                                        </Link>
                                        <Link href="/submit-space" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>
                                            Become a Host
                                        </Link>

                                        {isAdmin && (
                                            <Link href="/admin/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>
                                                Admin Dashboard
                                            </Link>
                                        )}

                                        <Link href="/manage/dashboard?view=spaces" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>
                                            Manager Dashboard
                                        </Link>

                                        <Link
                                            href="/manage/dashboard/availability"
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Manage Availability
                                        </Link>

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
                                href="/submit-space"
                                className="block py-2 text-gray-700 hover:text-black"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Become a Host
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

                            <Link
                                href="/manage/dashboard?view=spaces"
                                className="block py-2 text-gray-700 hover:text-black"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Manager Dashboard
                            </Link>


                            <Link
                                href="/manage/dashboard/availability"
                                className="block py-2 text-gray-700 hover:text-black"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Manage Availability
                            </Link>

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
import Link from 'next/link';
import { useUser } from '../context/UserContext';

export default function NavBar() {
    const { user, signOut, isLoading } = useUser();

    return (
        <nav className="bg-white border-b border-gray-200 w-full py-3">
            <div className="flex justify-between px-10 py-2 items-center">
                <Link href="/" className="text-xl font-semibold">
                    OffMenu
                </Link>

                <div className="flex items-center gap-6">
                    <Link href="/explore" className="text-gray-700 hover:text-black">
                        Explore
                    </Link>

                    {isLoading ? (
                        <div className="h-5 w-16 bg-gray-200 animate-pulse rounded"></div>
                    ) : user ? (
                        <div className="flex items-center gap-4">
                            <Link href="/profile" className="text-gray-700 hover:text-black">
                                Profile
                            </Link>
                            <button
                                onClick={() => signOut()}
                                className="text-gray-700 hover:text-black"
                            >
                                Log out
                            </button>
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
        </nav>
    );
} 
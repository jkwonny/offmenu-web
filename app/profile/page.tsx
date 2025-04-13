"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBar from "../components/NavBar";
import { useUser } from "../context/UserContext";

export default function Profile() {
    const router = useRouter();
    const { user, isLoading } = useUser();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/auth/sign-in");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FFF9F5]">
                <NavBar />
                <div className="max-w-4xl mx-auto p-8 mt-8 flex justify-center">
                    <div className="animate-pulse h-6 w-24 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect in the useEffect
    }

    return (
        <div className="min-h-screen bg-[#FFF9F5]">
            <NavBar />

            <div className="max-w-4xl mx-auto p-8 mt-8">
                <h1 className="text-3xl font-bold text-amber-950 mb-8">Your Profile</h1>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-amber-100">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-1">Account Information</h2>
                        <div className="h-0.5 w-16 bg-amber-300 mb-4"></div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="text-gray-800">{user.email}</p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">User ID</p>
                                <p className="text-gray-800 font-mono text-sm">{user.id}</p>
                            </div>

                            {user.user_metadata && (
                                <div>
                                    <p className="text-sm text-gray-500">Registered</p>
                                    <p className="text-gray-800">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-gray-100">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Preferences</h2>
                        <p className="text-gray-500 italic">No preferences set yet.</p>
                    </div>
                </div>
            </div>
        </div>
    );
} 
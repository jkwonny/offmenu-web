"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import { useUser } from "../../context/UserContext";

// Component that uses useSearchParams must be wrapped in Suspense
function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signIn } = useUser();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get redirect URL from query params if available
    const redirectUrl = searchParams.get("redirect") || "/";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!email || !password) {
            setError("Please fill all fields");
            setLoading(false);
            return;
        }

        try {
            const { success, error } = await signIn(email, password);
            if (success) {
                router.push(redirectUrl);
            } else {
                setError(error?.message || "Invalid email or password");
            }
        } catch (err) {
            setError("An unexpected error occurred");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                        placeholder="you@example.com"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                        placeholder="••••••••"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`cursor-pointer w-full py-2 px-4 rounded-md text-white font-medium ${loading ? "bg-[#273287]" : "bg-[#273287] hover:bg-[#273287]/70"
                        } transition-colors`}
                >
                    {loading ? "Signing in..." : "Sign in"}
                </button>
            </form>
        </>
    );
}

// Loading fallback for Suspense
function SignInFormLoading() {
    return <div className="animate-pulse p-4 text-center">Loading sign-in form...</div>;
}

export default function SignIn() {
    return (
        <div className="min-h-screen">
            <NavBar />

            <div className="max-w-md mx-auto p-6 mt-16">
                <h1 className="text-3xl font-bold text-black mb-8 text-center">Sign In</h1>

                <Suspense fallback={<SignInFormLoading />}>
                    <SignInForm />
                </Suspense>

                <p className="mt-6 text-center text-gray-600">
                    Don&apos;t have an account?{" "}
                    <Link href="/auth/sign-up" className="text-black hover:text-gray-800">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
} 
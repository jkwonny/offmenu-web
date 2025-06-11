"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import Modal from "../../components/Modal";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../context/ToastContext";

// Component that uses useSearchParams must be wrapped in Suspense
function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signIn, resetPassword } = useUser();
    const { showToast } = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetLoading, setResetLoading] = useState(false);

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

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetLoading(true);

        if (!resetEmail) {
            showToast("Please enter your email address", "error");
            setResetLoading(false);
            return;
        }

        // Basic email validation
        if (!/\S+@\S+\.\S+/.test(resetEmail)) {
            showToast("Please enter a valid email address", "error");
            setResetLoading(false);
            return;
        }

        try {
            const { success, error } = await resetPassword(resetEmail);
            if (success) {
                showToast("Reset email sent successfully! Check your inbox.", "success");
                setShowForgotPassword(false);
                setResetEmail("");
            } else {
                showToast(error?.message || "Failed to send reset email", "error");
            }
        } catch (err) {
            showToast("An unexpected error occurred", "error");
            console.error(err);
        } finally {
            setResetLoading(false);
        }
    };

    const handleCloseForgotPassword = () => {
        setShowForgotPassword(false);
        setResetEmail("");
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

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-[#273287] hover:text-[#273287]/70 underline"
                    >
                        Forgot password?
                    </button>
                </div>
            </form>

            {/* Forgot Password Modal */}
            <Modal 
                isOpen={showForgotPassword} 
                onClose={handleCloseForgotPassword} 
                title="Reset Password"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Enter your email address and we&apos;ll send you a link to reset your password.
                    </p>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div>
                            <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                id="resetEmail"
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={handleCloseForgotPassword}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                disabled={resetLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={resetLoading}
                                className="flex-1 px-4 py-2 bg-[#273287] text-white rounded-md hover:bg-[#273287]/70 disabled:opacity-50"
                            >
                                {resetLoading ? "Sending..." : "Send Reset Email"}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
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
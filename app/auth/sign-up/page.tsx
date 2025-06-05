"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import { useUser } from "../../context/UserContext";

// Component that uses useSearchParams must be wrapped in Suspense
function SignUpForm() {
    const router = useRouter();
    const { signUp } = useUser();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!email || !password) {
            setError("Please fill all required fields");
            setLoading(false);
            return;
        }

        // Basic email validation
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError("Please enter a valid email address");
            setLoading(false);
            return;
        }

        // Password strength validation
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            setLoading(false);
            return;
        }

        // Validate US phone number if provided
        if (phone) {
            // Check if the phone follows the US format (after formatting: (XXX) XXX-XXXX)
            const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
            if (!phoneRegex.test(phone)) {
                setError("Please enter a valid US phone number");
                setLoading(false);
                return;
            }
        }

        try {
            const { success, error } = await signUp(email, password, name, phone);

            if (success) {
                setSuccessMessage("Sign-up successful! Please check your email to confirm your account.");
                setTimeout(() => {
                    router.push("/auth/sign-in");
                }, 2000);
            } else {
                setError(error?.message || "An error occurred during sign up");
            }
        } catch (err) {
            setError("An unexpected error occurred");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Function to format phone number input
    const formatPhoneNumber = (input: string) => {
        // Strip all non-numeric characters
        const phoneNumber = input.replace(/\D/g, '');

        // Limit to 10 digits (US phone number)
        const limitedNumber = phoneNumber.slice(0, 10);

        // Format the number based on its length
        if (limitedNumber.length <= 3) {
            return limitedNumber;
        } else if (limitedNumber.length <= 6) {
            return `(${limitedNumber.slice(0, 3)}) ${limitedNumber.slice(3)}`;
        } else {
            return `(${limitedNumber.slice(0, 3)}) ${limitedNumber.slice(3, 6)}-${limitedNumber.slice(6, 10)}`;
        }
    };

    // Handle phone input change with formatting
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedPhone = formatPhoneNumber(e.target.value);
        setPhone(formattedPhone);
    };

    return (
        <>
            {successMessage && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                    {successMessage}
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
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
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                        placeholder="John Doe"
                    />
                </div>

                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number (US format)
                    </label>
                    <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                        placeholder="(123) 456-7890"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password <span className="text-red-500">*</span>
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
                    {loading ? "Signing up..." : "Sign up"}
                </button>
            </form>
        </>
    );
}

// Loading fallback for Suspense
function SignUpFormLoading() {
    return <div className="animate-pulse p-4 text-center">Loading sign-up form...</div>;
}

export default function SignUp() {
    return (
        <div className="min-h-screen">
            <NavBar />

            <div className="max-w-md mx-auto p-6 mt-16">
                <h1 className="text-3xl font-bold text-black mb-8 text-center">Create an Account</h1>

                <Suspense fallback={<SignUpFormLoading />}>
                    <SignUpForm />
                </Suspense>

                <p className="mt-6 text-center text-gray-600">
                    Already have an account?{" "}
                    <Link href="/auth/sign-in" className="text-black hover:text-gray-800">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
} 
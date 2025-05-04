'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function VerificationPage() {
    const [status, setStatus] = useState('Verifying your email...');
    const [isVerified, setIsVerified] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const handleVerification = async () => {
            // Get URL hash for auth verification
            const hash = window.location.hash;

            if (!hash) {
                setStatus('No verification code found. Please check your email and click the link again.');
                return;
            }

            try {
                // Exchange the authorization code for a session
                const { data, error } = await supabase.auth.exchangeCodeForSession(hash);

                if (error) {
                    console.error('Verification error:', error);
                    setStatus('Verification failed. Please try signing in again.');
                    return;
                }

                setStatus('Email verified successfully!');
                setIsVerified(true);

                // Don't auto-redirect, give users a chance to see the success message
                // They'll sign in explicitly via the button
            } catch (err) {
                console.error('Verification error:', err);
                setStatus('Verification failed. Please try signing in again.');
            }
        };

        handleVerification();
    }, []);

    const handleContinue = () => {
        router.push('/auth/sign-in');
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#FFF9F5] p-4">
            <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-amber-950 mb-4 text-center">Email Verification</h1>

                <p className="text-lg text-gray-700 mb-6 text-center">{status}</p>

                {isVerified ? (
                    <div className="flex flex-col items-center">
                        <button
                            onClick={handleContinue}
                            className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md transition-colors"
                        >
                            Continue to Sign In
                        </button>
                    </div>
                ) : (
                    <div className="text-center mt-4">
                        <Link href="/auth/sign-in" className="text-amber-600 hover:text-amber-800">
                            Return to Sign In
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

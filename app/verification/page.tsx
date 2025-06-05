'use client';

import { useRouter } from 'next/navigation';
import NavBar from '../components/NavBar';

export default function VerificationPage() {
    const router = useRouter();

    const handleContinue = () => {
        router.push('/auth/sign-in');
    };

    return (
        <div className="min-h-screen">
            <NavBar />

            <div className="max-w-md mx-auto p-6 mt-16">
                <h1 className="text-3xl font-bold text-black mb-8 text-center">Email Verified</h1>

                <div className="space-y-4">
                    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-center">
                        Your email has been successfully verified!
                    </div>

                    <button
                        onClick={handleContinue}
                        className="cursor-pointer w-full py-2 px-4 rounded-md text-white font-medium bg-[#273287] hover:bg-[#273287]/70 transition-colors"
                    >
                        Continue to Sign In
                    </button>
                </div>
            </div>
        </div>
    );
}

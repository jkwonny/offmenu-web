'use client';

import { useRouter } from 'next/navigation';

export default function VerificationPage() {
    const router = useRouter();

    const handleContinue = () => {
        router.push('/auth/sign-in');
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen p-4">
            <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-amber-950 mb-4 text-center">Email Verified</h1>

                <div className="flex flex-col items-center">
                    <button
                        onClick={handleContinue}
                        className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md transition-colors"
                    >
                        Continue to Sign In
                    </button>
                </div>
            </div>
        </div>
    );
}

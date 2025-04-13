'use client';

interface FloatingButtonProps {
    onClick: () => void;
    className?: string;
}

export default function FloatingButton({ onClick, className = '' }: FloatingButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`fixed bottom-8 right-1/2 transform translate-x-1/2 bg-amber-600 text-white px-6 py-3 rounded-full shadow-lg 
                hover:bg-amber-700 transition-colors flex items-center gap-2 font-medium z-30 ${className}`}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
            >
                <path
                    d="M8.25 4.5a3.75 3.75 0 117.5 0v.75c0 .414.336.75.75.75h4.5a.75.75 0 01.75.75v15a.75.75 0 01-.75.75h-18a.75.75 0 01-.75-.75V6.75A.75.75 0 013 6h4.5a.75.75 0 00.75-.75V4.5zm6.75-3a.75.75 0 00-.75.75v.75h1.5v-.75a.75.75 0 00-.75-.75h0zm-3 0a.75.75 0 01.75.75v.75h-1.5v-.75a.75.75 0 01.75-.75h0zm-3 0a.75.75 0 00-.75.75v.75h1.5v-.75a.75.75 0 00-.75-.75h0zm-3 0a.75.75 0 01.75.75v.75h-1.5v-.75a.75.75 0 01.75-.75h0z"
                />
            </svg>
            Explore More Venues
        </button>
    );
} 
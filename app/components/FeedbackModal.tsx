'use client';

import { useState } from 'react';
import { useUser } from '../context/UserContext';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const [rating, setRating] = useState<number>(0);
    const [message, setMessage] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const { user, userProfile } = useUser();

    // Close modal when clicking outside or on close button
    const handleClose = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleStarClick = (star: number) => {
        setRating(star);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!rating) {
            setError('Please select a rating');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            const feedbackData = {
                message,
                review: rating,
                userId: user?.id || null,
                username: userProfile?.name || null
            };

            const response = await fetch('/api/submit-feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feedbackData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Something went wrong');
            }

            // Show success message
            setIsSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit feedback');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {isSuccess ? (
                    <div className="text-center py-10">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Thank you for your feedback!</h3>
                        <p className="text-sm text-gray-500">Your feedback helps us improve our service.</p>
                        <button
                            onClick={onClose}
                            className="mt-6 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#ca0013] text-base font-medium text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">We value your feedback</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    How would you rate your experience?
                                </label>
                                <div className="flex items-center space-x-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => handleStarClick(star)}
                                            className="focus:outline-none"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className={`h-8 w-8 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-1 text-sm text-gray-500">
                                    {rating === 1 && 'Poor'}
                                    {rating === 2 && 'Fair'}
                                    {rating === 3 && 'Good'}
                                    {rating === 4 && 'Very Good'}
                                    {rating === 5 && 'Excellent'}
                                </p>
                            </div>

                            <div className="mb-6">
                                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                                    Additional comments (optional)
                                </label>
                                <textarea
                                    id="message"
                                    rows={4}
                                    className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Tell us more about your experience..."
                                />
                            </div>

                            {error && (
                                <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-between">
                                <button
                                    type="button"
                                    className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#06048D] hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
} 
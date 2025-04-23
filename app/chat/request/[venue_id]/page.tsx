"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import React from 'react';

// Create a client component that has the params already resolved
export default function ChatRequestPage({ params }: { params: { venue_id: string } }) {
    const router = useRouter();
    // Using destructuring assignment to get venue_id from params
    const { venue_id } = params;
    const [user, setUser] = useState<any>(null);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [venue, setVenue] = useState<any>(null);

    // Fetch current user and venue details on mount
    useEffect(() => {
        async function fetchUserAndVenue() {
            // Fetch the current authenticated user
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            // Fetch venue name for better UX
            const { data: venueData, error } = await supabase
                .from('venues')
                .select('*')
                .eq('id', venue_id)
                .single();

            console.log('venueData', venueData);
            if (!error && venueData) {
                setVenue(venueData);
            }
        }

        fetchUserAndVenue();
    }, [venue_id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (!message.trim()) {
            setError('Please enter a message to send.');
            setIsSubmitting(false);
            return;
        }

        try {
            // Use the current user's ID as the sender
            const sender_id = user?.id || "placeholder-user-id";

            // First create a temporary event for this inquiry
            const eventResponse = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: sender_id,
                    title: `Inquiry for ${venue.name}`,
                    description: 'Temporary event for venue inquiry',
                    start_date: new Date().toISOString().split('T')[0], // Today's date
                    end_date: new Date().toISOString().split('T')[0], // Today's date
                    expected_capacity_min: 1,
                    expected_capacity_max: 10,
                    event_type: 'Inquiry'
                }),
            });

            if (!eventResponse.ok) {
                throw new Error('Failed to create temporary event');
            }

            const eventData = await eventResponse.json();

            // Then create chat request using the new event ID
            const response = await fetch('/api/chat/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    event_id: eventData.id,
                    venue_id,
                    sender_id,
                    recipient_id: venue.owner_id,
                    message
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send chat request');
            }

            // On success, redirect to the chat page
            router.push('/chat');
        } catch (error: any) {
            setError(error.message || 'An error occurred while sending your request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Contact {venue?.name ?? ''}</h1>

            <div className="bg-white rounded-lg shadow-md p-6">
                <p className="mb-4">
                    Send a message to the venue owner to inquire about availability and details.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label
                            htmlFor="message"
                            className="block text-sm font-medium mb-2"
                        >
                            Your Message
                        </label>
                        <textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="Introduce yourself and explain what type of event you're planning..."
                            disabled={isSubmitting}
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Sending...' : 'Send Request'}
                    </button>
                </form>
            </div>
        </div>
    );
} 
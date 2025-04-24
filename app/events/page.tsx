'use client';

import { useEvents } from '../lib/queries';
import NavBar from '../components/NavBar';
import { format } from 'date-fns';

const formatText = (text: string) => {
    return text.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
};

interface Event {
    id: string;
    title: string;
    description: string | null;
    start_date: Date;
    end_date: Date | null;
    expected_capacity_min: number | null;
    expected_capacity_max: number | null;
    assets_needed: string[] | null;
    event_type: string;
}

export default function EventsPage() {
    const { data: events = [], isLoading, error } = useEvents<Event[]>();

    return (
        <>
            <NavBar />
            <main className="container mx-auto px-4 md:px-6 py-8">
                <h1 className="text-4xl font-bold mb-8 font-heading">Events Around New York</h1>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div>
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">
                        {error instanceof Error ? error.message : 'An error occurred while fetching events'}
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center text-gray-500">
                        No events found.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((event: Event) => (
                            <div
                                key={event.id}
                                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h2 className="text-2xl font-semibold">{event.title}</h2>
                                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                                            {formatText(event.event_type)}
                                        </span>
                                    </div>
                                    <div className="text-gray-600 mb-4">
                                        {format(event.start_date, 'MMM d, yyyy')}
                                        {event.end_date && ` - ${format(event.end_date, 'MMM d, yyyy')}`}
                                    </div>
                                    <p className="text-gray-700 mb-4 line-clamp-3">
                                        {event.description || 'No description available'}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {event.assets_needed?.map((tag: string, index: number) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                                            >
                                                {formatText(tag)}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm text-gray-600">
                                            {event.expected_capacity_min && event.expected_capacity_max
                                                ? `${event.expected_capacity_min}-${event.expected_capacity_max} guests`
                                                : 'Guest count not specified'}
                                        </div>
                                        <button
                                            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors duration-200"
                                            onClick={() => {/* TODO: Implement messaging */ }}
                                        >
                                            Message
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
} 
import { Venue } from "@/types/Venue";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/app/context/UserContext";
import { useRouter } from "next/navigation";
import DateTimePicker from "./DateTimePicker";
import ServicesFormStep, { DEFAULT_EVENT_SERVICES } from "./ServicesFormStep";

export default function RequestSpaceModal({ toggleModal, venue }: { toggleModal: () => void, venue: Venue }) {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const [popupName, setPopupName] = useState('');
    const [message, setMessage] = useState('');
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [collaborationTypes, setCollaborationTypes] = useState({
        open_venue: false,
        open_space: false,
        minimum_spend: false,
        flat: false,
        no_minimum_spend: false,
        revenue_share: false,
    });
    const [requirements, setRequirements] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [instagramHandle, setInstagramHandle] = useState('');
    const [website, setWebsite] = useState('');
    const [guestCount, setGuestCount] = useState<string | null>(null);

    const handleCollaborationTypeChange = (type: string) => {
        setCollaborationTypes(prev => ({
            ...prev,
            [type]: !prev[type as keyof typeof prev]
        }));
    };

    const toggleDateTimePicker = () => {
        setShowDateTimePicker(prev => !prev);
    };

    const handleDateSelect = (date: string) => {
        setSelectedDate(date);
    };

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
    };

    const handleDateTimeConfirm = () => {
        if (selectedDate && selectedTime) {
            setShowDateTimePicker(false);
        }
    };

    const convertTimeToHHMM = (timeString: string): string => {
        // Extract hours, minutes, and period
        const [time, period] = timeString.split(' ');
        const timeParts = time.split(':').map(part => parseInt(part, 10));
        let hours = timeParts[0];
        const minutes = timeParts[1];

        // Convert 12-hour to 24-hour format
        if (period === 'PM' && hours < 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }

        // Return formatted time
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    // Date and time picker functions
    const formatSelectedDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString();
    };

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

            const eventDate = selectedDate && selectedTime
                ? `${selectedDate}T${convertTimeToHHMM(selectedTime)}:00` // ISO format: YYYY-MM-DDTHH:MM:SS
                : new Date().toISOString().split('.')[0]; // Remove milliseconds

            const response = await fetch('/api/chat/create-room-and-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    venue_name: venue?.name ?? '',
                    event_date: eventDate,
                    venue_id: params.id,
                    sender_id: user?.id ?? '',
                    recipient_id: venue?.owner_id ?? '',
                    message,
                    collaboration_types: Object.keys(collaborationTypes).filter(type => collaborationTypes[type as keyof typeof collaborationTypes]),
                    popup_name: popupName,
                    selected_date: selectedDate,
                    selected_time: selectedTime,
                    requirements,
                    services: selectedServices,
                    instagram_handle: instagramHandle,
                    website,
                    guest_count: guestCount,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create chat room and booking request');
            }

            // On success, redirect directly to the chat room
            router.push(`/chat?chatRoomId=${data.room_id}`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred while sending your request.';
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div
            className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={toggleModal}
        >
            <div
                className="bg-white rounded-xl w-full max-w-2xl relative p-2 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={toggleModal}
                    className="absolute right-6 top-6 text-gray-500 hover:text-gray-700"
                    aria-label="Close modal"
                >
                    ✕
                </button>
                <div className="p-6">
                    <h2 className="text-2xl font-semibold mb-2">Contact the Space Owner</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Pitch your event to the owner! They will get back to you shortly.
                    </p>

                    <div className="mb-4">
                        <label htmlFor="popup-name" className="block text-sm font-medium text-black mb-1">
                            Pop-up name
                        </label>
                        <input
                            id="popup-name"
                            type="text"
                            value={popupName}
                            onChange={(e) => setPopupName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                            placeholder="Enter your pop-up name"
                        />
                    </div>

                    <div className="mb-4">
                        <label htmlFor="message" className="block text-sm font-medium text-black mb-1">
                            This is a message to the space owner. Please include more information about the pop-up, brand, or purpose.
                        </label>
                        <textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 min-h-[120px]"
                            placeholder="More information about the Pop-up format, brand, or purpose."
                        />
                    </div>

                    {/* Date Time Picker */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-black mb-1">
                            When is your event?
                        </label>
                        <div className="relative">
                            <DateTimePicker
                                selectedDate={selectedDate}
                                selectedTime={selectedTime}
                                onDateSelect={handleDateSelect}
                                onTimeSelect={handleTimeSelect}
                                onConfirm={handleDateTimeConfirm}
                                showPicker={showDateTimePicker}
                                togglePicker={toggleDateTimePicker}
                                customButton={
                                    <div
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-gray-300"
                                    >
                                        {selectedDate && selectedTime ?
                                            `${formatSelectedDate(selectedDate)} at ${selectedTime}` :
                                            "Select date and time"}
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={showDateTimePicker ? "rotate-180" : ""}>
                                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                }
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-black mb-1">
                            Guest Count
                        </label>
                        <select
                            value={guestCount || ""}
                            onChange={(e) => setGuestCount(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                        >
                            <option value="">Select</option>
                            <option value="1-10">1-10</option>
                            <option value="11-25">11-25</option>
                            <option value="26-50">26-50</option>
                            <option value="51-100">51-100</option>
                            <option value="100+">100+</option>
                        </select>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-black mb-1">
                                Instagram Handle
                            </label>
                            <input
                                type="text"
                                value={instagramHandle}
                                onChange={(e) => setInstagramHandle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                                placeholder="Place link here"
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-black mb-1">
                                Website
                            </label>
                            <input
                                type="text"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                                placeholder="Place link here"
                            />
                        </div>
                    </div>
                    <div className='mb-4 w-full flex'>
                        <div className="w-full">
                            <label className="block text-sm font-medium text-black mb-1">
                                Requirements
                            </label>
                            <textarea
                                value={requirements}
                                onChange={(e) => setRequirements(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 min-h-[100px]"
                                placeholder="Enter requirements"
                            />
                        </div>
                    </div>

                    <div className="mb-4 w-full">
                        <ServicesFormStep
                            selectedServices={selectedServices}
                            onServicesChange={setSelectedServices}
                            title="Services & Features Needed"
                            description="Select services and features you need for your event"
                            placeholder="Add a custom service"
                            presetServices={DEFAULT_EVENT_SERVICES}
                            showPresetServices={true}
                            allowCustomServices={true}
                            addOnSpace={false}
                        />
                    </div>

                    <div className="mb-6">
                        <p className="block text-sm font-medium text-black mb-2">
                            Collaboration Type
                        </p>
                        <div className="space-y-2">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={collaborationTypes.minimum_spend}
                                    onChange={() => handleCollaborationTypeChange('minimum_spend')}
                                    className="mr-2 h-4 w-4 text-amber-600 focus:ring-amber-500 border-amber-300 rounded"
                                />
                                <span>Minimum Spend</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={collaborationTypes.revenue_share}
                                    onChange={() => handleCollaborationTypeChange('revenue_share')}
                                    className="mr-2 h-4 w-4 text-amber-600 focus:ring-amber-500 border-amber-300 rounded"
                                />
                                <span>Revenue Share</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={collaborationTypes.flat}
                                    onChange={() => handleCollaborationTypeChange('flat')}
                                    className="mr-2 h-4 w-4 text-amber-600 focus:ring-amber-500 border-amber-300 rounded"
                                />
                                <span>Flat Fee</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={collaborationTypes.no_minimum_spend}
                                    onChange={() => handleCollaborationTypeChange('no_minimum_spend')}
                                    className="mr-2 h-4 w-4 text-amber-600 focus:ring-amber-500 border-amber-300 rounded"
                                />
                                <span>No Minimum Spend</span>
                            </label>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        className="w-full cursor-pointer bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Sending...' : 'Contact'}
                    </button>
                </div>
            </div>
        </div>
    );
}
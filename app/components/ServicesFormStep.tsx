'use client';

import { useState } from 'react';

interface ServicesFormStepProps {
    selectedServices: string[];
    onServicesChange: (services: string[]) => void;
    title?: string;
    description?: string;
    placeholder?: string;
    presetServices?: string[];
    showPresetServices?: boolean;
    allowCustomServices?: boolean;
    addOnSpace?: boolean;
    className?: string;
}

const DEFAULT_VENUE_SERVICES = [
    'DJ Booth', 'Kitchen Access', 'Moveable Tables', 'Live Music Allowed',
    'Staff On Site', 'Projector/AV', 'Wifi', 'Outdoor Space', 'Parking',
    'Wine', 'Liquor', 'Outside Food Allowed', 'Catering Available', 'Smoking Area',
    'Wheelchair Accessible', 'Sound System', 'Patio', 'Rooftop'
];

const DEFAULT_EVENT_SERVICES = [
    'DJ Booth', 'Projector/AV', 'Sound System', 'Live Music', 'Catering',
    'Bar Service', 'Photography', 'Decorations', 'Security', 'Cleaning Service',
    'Valet Parking', 'Coat Check', 'WiFi', 'Chairs', 'Moveable Tables'
];

export default function ServicesFormStep({
    selectedServices,
    onServicesChange,
    title = "Services & Features",
    description,
    placeholder = "Add a custom service",
    presetServices,
    showPresetServices = true,
    allowCustomServices = true,
    addOnSpace = false,
    className = ""
}: ServicesFormStepProps) {
    const [customService, setCustomService] = useState<string>('');

    // Use provided preset services or default to venue services
    const servicesOptions = presetServices || DEFAULT_VENUE_SERVICES;

    const addCustomService = () => {
        if (customService.trim() && !selectedServices.includes(customService.trim())) {
            onServicesChange([...selectedServices, customService.trim()]);
            setCustomService('');
        }
    };

    const toggleService = (service: string) => {
        if (selectedServices.includes(service)) {
            onServicesChange(selectedServices.filter(s => s !== service));
        } else {
            onServicesChange([...selectedServices, service]);
        }
    };

    const removeService = (service: string) => {
        onServicesChange(selectedServices.filter(s => s !== service));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (addOnSpace && e.key === ' ' && customService.trim()) {
            e.preventDefault();
            addCustomService();
        } else if (!addOnSpace && e.key === 'Enter') {
            e.preventDefault();
            addCustomService();
        }
    };

    return (
        <div className={`space-y-6 ${className}`}>
            <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">
                    {title}
                </h3>
                {description && (
                    <p className="text-sm text-gray-600 mb-4">{description}</p>
                )}

                {/* Preset Services */}
                {showPresetServices && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                        {servicesOptions.map((service) => (
                            <button
                                key={service}
                                type="button"
                                onClick={() => toggleService(service)}
                                className={`py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                    selectedServices.includes(service)
                                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                        : 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200'
                                }`}
                                aria-pressed={selectedServices.includes(service)}
                            >
                                {service}
                            </button>
                        ))}
                    </div>
                )}

                {/* Custom Service Input */}
                {allowCustomServices && (
                    <div className="flex mt-4">
                        <input
                            type="text"
                            value={customService}
                            onChange={(e) => setCustomService(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={addOnSpace ? `${placeholder} (press space to add)` : placeholder}
                            className="flex-grow p-3 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            aria-label={placeholder}
                        />
                        {!addOnSpace && (
                            <button
                                type="button"
                                onClick={addCustomService}
                                disabled={!customService.trim()}
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                + Add
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Selected Services Display */}
            {selectedServices.length > 0 && (
                <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Services</h4>
                    <div className="flex flex-wrap gap-2">
                        {selectedServices.map((service) => (
                            <div
                                key={service}
                                className="inline-flex items-center bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-sm border border-blue-200"
                            >
                                {service}
                                <button
                                    type="button"
                                    onClick={() => removeService(service)}
                                    className="ml-2 rounded-full h-5 w-5 flex items-center justify-center bg-blue-200 hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-150"
                                    aria-label={`Remove ${service}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Export the default service options for reuse
export { DEFAULT_VENUE_SERVICES, DEFAULT_EVENT_SERVICES }; 
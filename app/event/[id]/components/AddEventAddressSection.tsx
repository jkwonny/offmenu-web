"use client";

import { useState } from 'react';
import { MapPin, Save, X } from 'lucide-react';
import GoogleAutoComplete from '@/app/components/GoogleAutoComplete';
import { VenueFormData } from '@/app/types/venue';

interface AddEventAddressSectionProps {
    eventId: string;
    onAddressUpdated: () => void;
}

export default function AddEventAddressSection({ eventId, onAddressUpdated }: AddEventAddressSectionProps) {
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Create a form data object for GoogleAutoComplete compatibility
    const [addressFormData, setAddressFormData] = useState<VenueFormData>({
        address: "",
        street_number: "",
        street_name: "",
        neighborhood: "",
        city: "",
        state: "NY",
        postal_code: "",
        latitude: "",
        longitude: "",
        // Add other required VenueFormData fields with default values
        name: "",
        description: "",
        category: "",
        rental_type: [],
        pricing_type: "",
        price: "",
        min_hours: "",
        website: "",
        instagram_handle: "",
        alcohol_served: false,
        byob_allowed: false,
        byob_pricing_type: "",
        byob_price: "",
        outside_cake_allowed: false,
        cake_fee_type: "",
        cake_fee_amount: "",
        cleaning_fee: "",
        setup_fee: "",
        overtime_fee_per_hour: "",
        max_guests: "",
        max_seated_guests: "",
        max_standing_guests: "",
        tags: "",
    });

    const handleSaveAddress = async () => {
        if (!addressFormData.address.trim()) {
            setError("Please enter an address");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`/api/events/${eventId}/address`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address: addressFormData.address,
                    street_number: addressFormData.street_number,
                    street_name: addressFormData.street_name,
                    neighborhood: addressFormData.neighborhood,
                    city: addressFormData.city,
                    state: addressFormData.state,
                    postal_code: addressFormData.postal_code,
                    latitude: addressFormData.latitude ? parseFloat(addressFormData.latitude) : null,
                    longitude: addressFormData.longitude ? parseFloat(addressFormData.longitude) : null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update address');
            }

            setShowAddressForm(false);
            onAddressUpdated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update address');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setShowAddressForm(false);
        setError(null);
        setAddressFormData({
            ...addressFormData,
            address: "",
            street_number: "",
            street_name: "",
            neighborhood: "",
            city: "",
            state: "NY",
            postal_code: "",
            latitude: "",
            longitude: "",
        });
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">List of Spaces</h2>
            
            {!showAddressForm ? (
                <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                        <MapPin className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Spaces Contacted</h3>
                    <p className="text-gray-600 text-sm mb-4">
                        Would you like to add an address for your event?
                    </p>
                    <button
                        onClick={() => setShowAddressForm(true)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <MapPin className="h-4 w-4 mr-2" />
                        Add Address
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Add Event Address</h3>
                    
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Address
                        </label>
                        <GoogleAutoComplete
                            formData={addressFormData}
                            setFormData={setAddressFormData}
                        />
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSaveAddress}
                            disabled={isSubmitting || !addressFormData.address.trim()}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Address
                                </>
                            )}
                        </button>
                        
                        <button
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
} 
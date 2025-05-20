'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import NavBar from '../components/NavBar';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { SpaceFormData } from '@/app/types/space';
import GoogleAutoComplete from '../components/GoogleAutoComplete';
import Image from 'next/image';
import { VenueFormData } from '@/app/types/venue';
import { handleAuthError } from '../lib/supabase';

// Add VenueServicesFormStep component definition
const VenueServicesFormStep = ({
    selectedServices,
    onServicesChange
}: {
    selectedServices: string[];
    onServicesChange: (services: string[]) => void;
}) => {
    const [customService, setCustomService] = useState<string>('');

    // Preset service options - can be moved to props if needed
    const presetServices = [
        'DJ Booth', 'Kitchen Access', 'Moveable Tables', 'Live Music Allowed',
        'Staff On Site', 'Projector/AV', 'Wifi', 'Outdoor Space', 'Parking',
        'Wine', 'Liquor', 'Outside Food Allowed', 'Catering Available', 'Smoking Area',
        'Wheelchair Accessible', 'Sound System', 'Patio', 'Rooftop'
    ];

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
        if (e.key === 'Enter') {
            e.preventDefault();
            addCustomService();
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">
                    What services or features does your space offer?
                </h3>

                {/* Preset service tags grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                    {presetServices.map((service) => (
                        <button
                            key={service}
                            type="button"
                            onClick={() => toggleService(service)}
                            className={`py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${selectedServices.includes(service)
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200'
                                }`}
                            aria-pressed={selectedServices.includes(service)}
                        >
                            {service}
                        </button>
                    ))}
                </div>

                {/* Custom service input */}
                <div className="flex mt-4">
                    <input
                        type="text"
                        value={customService}
                        onChange={(e) => setCustomService(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add a custom service"
                        className="flex-grow p-3 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        aria-label="Add a custom service"
                    />
                    <button
                        type="button"
                        onClick={addCustomService}
                        disabled={!customService.trim()}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        + Add
                    </button>
                </div>
            </div>

            {/* Selected services display */}
            {selectedServices.length > 0 && (
                <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Services</h4>
                    <div className="flex flex-wrap gap-2">
                        {selectedServices.map((service) => (
                            <div
                                key={service}
                                className="inline-flex items-center bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-sm"
                            >
                                {service}
                                <button
                                    type="button"
                                    onClick={() => removeService(service)}
                                    className="ml-2 rounded-full h-5 w-5 flex items-center justify-center bg-blue-200 hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
};

export default function SubmitSpacePage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [step, setStep] = useState<number>(1);
    const [progress, setProgress] = useState<number>(16.7); // 1/6 of 100% for 6 steps
    const contentRef = useRef<HTMLDivElement>(null);

    const initialFormState: SpaceFormData = {
        name: '',
        description: '',
        address: '',
        street_number: '',
        street_name: '',
        neighborhood: '',
        city: '',
        state: 'NY',
        postal_code: '',
        latitude: '',
        longitude: '',
        category: '',
        rental_type: [] as string[],
        collaboration_type: '',
        website: '',
        instagram_handle: '',
        max_guests: '',
        rules: '',
        tags: '',
        services: [], // Add services array to the form data
    };

    // State for managing form data
    const [formData, setFormData] = useState<SpaceFormData>(initialFormState);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // New state for image uploads
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Get the current authenticated user
    useEffect(() => {
        async function getUser() {
            try {
                const { data, error } = await supabase.auth.getUser();

                if (error) {
                    console.error('Auth error:', error.message);
                    // Use the handleAuthError helper for consistent error handling
                    handleAuthError(error);
                    // Don't set currentUser if there's an error
                    return;
                }

                setCurrentUser(data.user);
            } catch (error) {
                console.error('Failed to get user:', error);
                // Use handleAuthError here too for consistency
                handleAuthError(error as Error);
                // In case of any error, make sure we don't have a stale user
                setCurrentUser(null);
            }
            // Don't redirect here, will only check auth at submission time
        }

        getUser();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        // Handle checkboxes
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData((prev: SpaceFormData) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev: SpaceFormData) => ({ ...prev, [name]: value }));
        }

        // Clear validation error for this field when user starts typing
        if (validationErrors[name]) {
            setValidationErrors((prev: Record<string, string>) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    // Add a handler for updating services
    const handleServicesChange = (services: string[]) => {
        setFormData(prev => ({
            ...prev,
            services,
        }));
    };

    const validateStep = (currentStep: number): boolean => {
        const errors: Record<string, string> = {};

        // Only validate the current step fields
        if (currentStep === 1) {
            // Basic information validation
            if (!formData.name.trim()) errors.name = 'Space name is required';
            if (!formData.description.trim()) errors.description = 'Description is required';
            if (!formData.category) errors.category = 'Category is required';
            if (formData.rental_type.length === 0) errors.rental_type = 'At least one rental type is required';
        } else if (currentStep === 2) {
            // Location validation
            if (!formData.address.trim()) errors.address = 'Address is required';
            if (!formData.city.trim()) errors.city = 'City is required';
            if (!formData.neighborhood.trim()) errors.neighborhood = 'Neighborhood is required';
        } else if (currentStep === 3) {
            // Capacity and pricing validation
            if (!formData.collaboration_type) {
                errors.collaboration_type = 'Collaboration type is required';
            }
            if (!formData.max_guests) {
                errors.max_guests = 'Maximum guests is required';
            }
            if (formData.max_guests && parseInt(formData.max_guests) <= 0) {
                errors.max_guests = 'Maximum guests must be a positive number';
            }
        }
        // For steps 5 and 6, no validation needed, they're optional fields

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(prevStep => prevStep + 1);
            setProgress(prevProgress => Math.min(prevProgress + 16.7, 100)); // Increment by 1/6 for each step
            setError(null);
        }
    };

    const handlePrevious = () => {
        setStep(prevStep => Math.max(prevStep - 1, 1));
        setProgress(prevProgress => Math.max(prevProgress - 16.7, 16.7)); // Decrement by 1/6 for each step
        setError(null);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // Ensure we're on the final step before submitting
        if (step !== 6) {
            handleNext();
            return;
        }

        // Final validation before submission
        if (!validateStep(step)) {
            setError('Please fix the validation errors before submitting');
            return;
        }

        // Check if user is logged in
        if (!currentUser) {
            setError('You must be logged in to submit a space');
            router.push('/auth/signin?redirect=/submit-space');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Verify user session is still valid
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                // Handle auth error with the helper function
                const errorMessage = handleAuthError(sessionError);
                setError(errorMessage);
                router.push('/auth/signin?redirect=/submit-space');
                return;
            }

            if (!sessionData.session) {
                setError('Your session has expired. Please sign in again.');
                router.push('/auth/signin?redirect=/submit-space');
                return;
            }

            // Prepare submission data
            const submissionData = {
                ...formData,
                // Include owner_id from the current user
                owner_id: currentUser.id,
                // Convert rental_type to string format if needed by the API
                rental_type: formData.rental_type,
                collaboration_type: formData.collaboration_type || null,
                website: formData.website.trim() || null,
                instagram_handle: formData.instagram_handle.trim() || null,
                street_number: formData.street_number.trim() || null,
                street_name: formData.street_name.trim() || null,
                neighborhood: formData.neighborhood.trim() || null,
                city: formData.city.trim() || null,
                state: formData.state || null,
                postal_code: formData.postal_code.trim() || null,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
                max_guests: formData.max_guests ? parseInt(formData.max_guests, 10) : null,
                tags: formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag !== ''), // Convert comma-separated string to array
                status: 'pending',
                services: formData.services,
            };

            console.log("Submitting space data:", submissionData); // Data to be sent to API

            // Make API call to save space
            const response = await fetch('/api/venues', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.details || `HTTP error! status: ${response.status}`);
            }

            // Upload images if available
            if (uploadedImages.length > 0) {
                setIsUploading(true);
                try {
                    await uploadImagesToServer(result.id);
                } catch (imageErr) {
                    const message = imageErr instanceof Error ? imageErr.message : 'Image upload failed';
                    setError(`Venue created but image upload failed: ${message}`);
                    console.error(imageErr);
                } finally {
                    setIsUploading(false);
                }
            }

            setSuccess(`"${result.name}" Space submitted successfully!`);


            // Redirect after successful submission
            setTimeout(() => {
                router.push('/events');
            }, 3000);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(`Submission failed: ${message}`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Add image handling functions
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // Convert FileList to array
            const newImagesArray = Array.from(e.target.files);

            // Validate images (size, type, etc.)
            const validImages = newImagesArray.filter(file => {
                const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
                const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB max

                if (!isValidType) {
                    setError('Only JPG, PNG, and WebP images are allowed');
                }
                if (!isValidSize) {
                    setError('Images must be smaller than 5MB');
                }

                return isValidType && isValidSize;
            });

            // Update state with new images
            setUploadedImages(prev => [...prev, ...validImages]);

            // Generate preview URLs
            const newPreviewUrls = validImages.map(file => URL.createObjectURL(file));
            setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
        }
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => {
            const newImages = [...prev];
            newImages.splice(index, 1);
            return newImages;
        });

        setImagePreviewUrls(prev => {
            // Revoke the object URL to free memory
            URL.revokeObjectURL(prev[index]);

            const newUrls = [...prev];
            newUrls.splice(index, 1);
            return newUrls;
        });
    };

    // Function to upload images to server API
    const uploadImagesToServer = async (venueId: number): Promise<string[]> => {
        if (uploadedImages.length === 0) return [];

        const imageUrls: string[] = [];
        const failedUploads: string[] = [];

        for (let i = 0; i < uploadedImages.length; i++) {
            const file = uploadedImages[i];

            // Create form data for the upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('venueId', venueId.toString());
            formData.append('sortOrder', (i + 1).toString());  // Use index+1 as sort order

            // Upload using the server API route
            try {
                const response = await fetch('/api/upload-image', {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (!response.ok) {
                    console.error('Image upload failed:', result);
                    failedUploads.push(file.name);
                    continue;
                }

                // Use the url from the response instead of expecting a 'url' property
                if (result.url) {
                    imageUrls.push(result.url);
                } else {
                    console.error('Image upload succeeded but no URL was returned:', result);
                    failedUploads.push(file.name);
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                failedUploads.push(file.name);
            }
        }

        // If any uploads failed, add info to the error message
        if (failedUploads.length > 0) {
            const failedNames = failedUploads.join(', ');
            throw new Error(`Failed to upload images: ${failedNames}`);
        }

        return imageUrls;
    };

    // Render different forms based on current step
    const renderStepContent = () => {
        switch (step) {
            case 1: // Basic Information (moved up from step 2)
                return (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="name">
                                    Space Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className={`w-full p-3 border ${validationErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    placeholder="Enter space name"
                                />
                                {validationErrors.name && (
                                    <p className="mt-1 text-sm text-red-500">{validationErrors.name}</p>
                                )}
                            </div>

                            <div className="col-span-2">
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="description">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={4}
                                    className={`w-full p-3 border ${validationErrors.description ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    placeholder="Describe your space's atmosphere, features, and what makes it special."
                                />
                                {validationErrors.description && (
                                    <p className="mt-1 text-sm text-red-500">{validationErrors.description}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="category">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className={`w-full p-3 border ${validationErrors.category ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white`}
                                >
                                    <option value="">Select Category</option>
                                    <option value="restaurant">Restaurant</option>
                                    <option value="bar">Bar</option>
                                    <option value="rooftop">Rooftop</option>
                                    <option value="cafe">Cafe</option>
                                    <option value="event_space">Event Space</option>
                                    <option value="coffee_shop">Coffee Shop</option>
                                    <option value="other">Other</option>
                                </select>
                                {validationErrors.category && (
                                    <p className="mt-1 text-sm text-red-500">{validationErrors.category}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">
                                    Rental Type (select all that apply) <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-2">
                                    <div className="flex items-center">
                                        <input
                                            id="rental_type_full"
                                            type="checkbox"
                                            name="rental_type_full"
                                            checked={formData.rental_type.includes('full')}
                                            onChange={(e) => {
                                                const newTypes = e.target.checked
                                                    ? [...formData.rental_type, 'full']
                                                    : formData.rental_type.filter(t => t !== 'full');
                                                setFormData({ ...formData, rental_type: newTypes });
                                            }}
                                            className="h-5 w-5 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="rental_type_full" className="ml-2 block text-sm text-gray-700">
                                            Full Space
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            id="rental_type_private_room"
                                            type="checkbox"
                                            name="rental_type_private_room"
                                            checked={formData.rental_type.includes('private_room')}
                                            onChange={(e) => {
                                                const newTypes = e.target.checked
                                                    ? [...formData.rental_type, 'private_room']
                                                    : formData.rental_type.filter(t => t !== 'private_room');
                                                setFormData({ ...formData, rental_type: newTypes });
                                            }}
                                            className="h-5 w-5 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="rental_type_private_room" className="ml-2 block text-sm text-gray-700">
                                            Private Room
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            id="rental_type_outside"
                                            type="checkbox"
                                            name="rental_type_outside"
                                            checked={formData.rental_type.includes('outside')}
                                            onChange={(e) => {
                                                const newTypes = e.target.checked
                                                    ? [...formData.rental_type, 'outside']
                                                    : formData.rental_type.filter((t: string) => t !== 'outside');

                                                setFormData({ ...formData, rental_type: newTypes });
                                            }}
                                            className="h-5 w-5 text-black focus:ring-black border-[#e0d8c3] rounded"
                                        />
                                        <label htmlFor="rental_type_outside" className="ml-2 block text-sm text-black">
                                            Outside Space
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            id="rental_type_semi_private"
                                            type="checkbox"
                                            name="rental_type_semi_private"
                                            checked={formData.rental_type.includes('semi_private')}
                                            onChange={(e) => {
                                                const newTypes = e.target.checked
                                                    ? [...formData.rental_type, 'semi_private']
                                                    : formData.rental_type.filter((t: string) => t !== 'semi_private');

                                                setFormData({ ...formData, rental_type: newTypes });
                                            }}
                                            className="h-5 w-5 text-black focus:ring-black border-[#e0d8c3] rounded"
                                        />
                                        <label htmlFor="rental_type_semi_private" className="ml-2 block text-sm text-black">
                                            Semi-Private Space
                                        </label>
                                    </div>
                                </div>
                                {validationErrors.rental_type && (
                                    <p className="mt-1 text-sm text-red-500">{validationErrors.rental_type}</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 2: // Location (moved up from step 3)
                return (
                    <div className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="address">
                                    Address <span className="text-red-500">*</span>
                                </label>
                                <GoogleAutoComplete
                                    formData={formData as unknown as VenueFormData}
                                    setFormData={setFormData as unknown as React.Dispatch<React.SetStateAction<VenueFormData>>}
                                />
                                {validationErrors.address && (
                                    <p className="mt-1 text-sm text-red-500">{validationErrors.address}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="neighborhood">
                                    Neighborhood <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="neighborhood"
                                    type="text"
                                    name="neighborhood"
                                    value={formData.neighborhood}
                                    onChange={handleChange}
                                    className={`w-full p-3 border ${validationErrors.neighborhood ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    placeholder="Neighborhood"
                                />
                                {validationErrors.neighborhood && (
                                    <p className="mt-1 text-sm text-red-500">{validationErrors.neighborhood}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="city">
                                    City <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="city"
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className={`w-full p-3 border ${validationErrors.city ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    placeholder="City"
                                />
                                {validationErrors.city && (
                                    <p className="mt-1 text-sm text-red-500">{validationErrors.city}</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 3: // Capacity and Pricing (moved up from step 4)
                return (
                    <div className="mt-6">
                        <h2 className="text-2xl font-bold mb-4 text-center">Capacity & Collaboration</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="max_guests">
                                    Maximum Guests <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="max_guests"
                                    type="number"
                                    min="0"
                                    name="max_guests"
                                    value={formData.max_guests}
                                    onChange={handleChange}
                                    className={`w-full p-3 border ${validationErrors.max_guests ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    placeholder="e.g. 100"
                                />
                                {validationErrors.max_guests ? (
                                    <p className="mt-1 text-sm text-red-500">{validationErrors.max_guests}</p>
                                ) : (
                                    <p className="mt-1 text-sm text-gray-500">The maximum number of guests your space can accommodate.</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="collaboration_type">
                                    Collaboration Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="collaboration_type"
                                    name="collaboration_type"
                                    value={formData.collaboration_type}
                                    onChange={handleChange}
                                    className={`w-full p-3 border ${validationErrors.pricing_type ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white`}
                                >
                                    <option value="">Select Collaboration Type</option>
                                    <option value="open_venue">Open Venue</option>
                                    <option value="flat">Flat Fee</option>
                                    <option value="minimum_spend">Minimum Spend</option>
                                    <option value="revenue_share">Revenue Share</option>
                                </select>
                                {validationErrors.pricing_type ? (
                                    <p className="mt-1 text-sm text-red-500">{validationErrors.pricing_type}</p>
                                ) : (
                                    <p className="mt-1 text-sm text-gray-500">How do you want to collaborate with Pop-ups?</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 4: // Services and Policies - Replace with new component
                return (
                    <div className="mt-6">
                        <h2 className="text-2xl font-bold mb-4 text-center">Services & Policies</h2>
                        <VenueServicesFormStep
                            selectedServices={formData.services || []}
                            onServicesChange={handleServicesChange}
                        />
                    </div>
                );
            case 5: // Tags
                return (
                    <div className="mt-6">
                        <h2 className="text-2xl font-bold mb-4 text-center">Tags & Additional Info</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="tags">
                                    Tags (comma separated)
                                </label>
                                <input
                                    id="tags"
                                    type="text"
                                    name="tags"
                                    value={formData.tags}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g. outdoor, pet-friendly, live-music"
                                />
                                <p className="mt-1 text-sm text-gray-500">Add relevant tags to help customers find your space. Separate with commas (e.g. rooftop, private, views)</p>
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="website">
                                    Website
                                </label>
                                <input
                                    id="website"
                                    type="url"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="https://www.example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="instagram_handle">
                                    Instagram Handle (without @ symbol)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">@</span>
                                    </div>
                                    <input
                                        id="instagram_handle"
                                        type="text"
                                        name="instagram_handle"
                                        value={formData.instagram_handle}
                                        onChange={handleChange}
                                        className="w-full pl-7 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="spacename"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 6: // Images
                return (
                    <div className="mt-6">
                        <h2 className="text-2xl font-bold mb-4 text-center">Space Images</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">
                                    Upload Photos
                                </label>
                                <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md text-gray-700 text-sm mb-4">
                                    <p className="font-medium">Image Guidelines:</p>
                                    <ul className="list-disc pl-5 mt-1">
                                        <li>Max 5MB per image</li>
                                        <li>Accepted formats: JPG, PNG, WebP</li>
                                        <li>High-quality images attract more customers</li>
                                    </ul>
                                </div>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                    accept="image/jpeg, image/png, image/webp"
                                    multiple
                                    className="hidden"
                                    id="space-images"
                                />

                                <div className="flex items-center space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer"
                                    >
                                        Select Images
                                    </button>
                                    <span className="text-sm text-gray-600">
                                        {uploadedImages.length} {uploadedImages.length === 1 ? 'image' : 'images'} selected
                                    </span>
                                </div>
                            </div>

                            {/* Image preview */}
                            {imagePreviewUrls.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="text-gray-700 text-sm font-medium mb-2">Image Previews</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                                        {imagePreviewUrls.map((url, index) => (
                                            <div key={index} className="relative group">
                                                <div className="h-24 w-full rounded-md overflow-hidden border border-gray-300 relative">
                                                    <Image
                                                        src={url}
                                                        alt={`Space image ${index + 1}`}
                                                        className="object-cover"
                                                        fill
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 focus:outline-none cursor-pointer"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <NavBar />
            <div className="min-h-screen bg-[#fffbf6] flex flex-col" ref={contentRef}>
                {/* Progress bar */}
                <div className="mb-8">
                    <div className="relative">
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                            <div
                                style={{ width: `${progress}%` }}
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#06048D] rounded-r-full transition-all duration-300"
                            ></div>
                        </div>
                    </div>
                </div>
                <div className="container mx-auto px-4 max-w-4xl flex-grow">
                    <h1 className="text-3xl font-bold text-center mb-8">Submit Your Space</h1>

                    {/* Error and success messages */}
                    {error && (
                        <div className="mb-4 p-4 rounded-md bg-red-50 text-red-600">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-4 rounded-md bg-green-50 text-green-600">
                            {success}
                        </div>
                    )}

                    {/* Form content */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-[#e0d8c3] mb-8">
                        <form>
                            {renderStepContent()}

                            {/* Navigation buttons */}
                            <div className="flex justify-between mt-8">
                                {step > 1 ? (
                                    <button
                                        type="button"
                                        onClick={handlePrevious}
                                        className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                                    >
                                        Back
                                    </button>
                                ) : (
                                    <div></div> // Empty div to maintain flex spacing
                                )}

                                {step < 6 ? (
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="px-6 py-2 bg-black text-white font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSubmit(e as unknown as FormEvent<HTMLFormElement>)}
                                        className="px-6 py-2 bg-[#06048D] text-white font-medium rounded-md hover:bg-[#06048D] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={isLoading || isUploading}
                                    >
                                        {isLoading || isUploading ? (
                                            <span className="flex items-center">
                                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                {isUploading ? 'Uploading Images...' : 'Submitting...'}
                                            </span>
                                        ) : 'Submit Space'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
} 
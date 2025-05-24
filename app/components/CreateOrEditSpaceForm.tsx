'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SpaceFormData } from '@/app/types/space';
import { VenueFormData } from '@/app/types/venue'; // Assuming VenueFormData is relevant for GoogleAutoComplete
import GoogleAutoComplete from './GoogleAutoComplete'; // Assuming this path is correct relative to this new component

// Define SpaceFormDataWithImages if your initialData will include image URLs
export interface SpaceFormDataWithImages extends SpaceFormData {
    image_urls?: string[];
}

export interface CreateOrEditSpaceFormProps {
    initialData?: Partial<SpaceFormDataWithImages>;
    onSubmit: (
        data: SpaceFormData,
        newImages: File[],
        imageUrlsToRemove: string[]
    ) => Promise<{ success: boolean; message: string; venueId?: string | number }>;
    onCancel: () => void;
    mode: 'create' | 'edit';
    title: string;
}

// VenueServicesFormStep component (moved from original page)
const VenueServicesFormStep = ({
    selectedServices,
    onServicesChange
}: {
    selectedServices: string[];
    onServicesChange: (services: string[]) => void;
}) => {
    const [customService, setCustomService] = useState<string>('');
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

const CreateOrEditSpaceForm = ({ initialData, onSubmit, onCancel, mode, title }: CreateOrEditSpaceFormProps) => {
    const router = useRouter();
    const [step, setStep] = useState<number>(1);
    const [progress, setProgress] = useState<number>(16.7); // 1/6 of 100% for 6 steps

    const initialFormStateBase: SpaceFormData = {
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
        rental_type: [],
        collaboration_type: '',
        website: '',
        instagram_handle: '',
        max_guests: '',
        rules: '',
        tags: '',
        services: [],
    };

    const [formData, setFormData] = useState<SpaceFormDataWithImages>(() => ({
        ...initialFormStateBase,
        ...(initialData || {}),
        // Ensure services and rental_type are arrays even if initialData doesn't provide them or provides null
        services: initialData?.services || [],
        rental_type: initialData?.rental_type || [],
        tags: initialData?.tags || '', // Ensure tags is a string
        image_urls: initialData?.image_urls || [], // Initialize image_urls
    }));

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Image states
    const [uploadedImages, setUploadedImages] = useState<File[]>([]); // New images to upload
    const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]); // All previews (existing + new)
    const [initialImageUrls, setInitialImageUrls] = useState<string[]>(initialData?.image_urls || []);
    const [imageUrlsToRemove, setImageUrlsToRemove] = useState<string[]>([]); // URLs of existing images to remove

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialFormStateBase,
                ...initialData,
                services: initialData.services || [],
                rental_type: initialData.rental_type || [],
                tags: initialData.tags || '',
            });
            if (initialData.image_urls) {
                setInitialImageUrls(initialData.image_urls);
                setImagePreviewUrls([...initialData.image_urls]);
            }
        }
    }, [initialData]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            // This specific handling for rental_type checkboxes needs to be adapted or generalized
            // For now, assuming rental_type is handled separately or this component doesn't have such checkboxes directly named.
            // The provided code has specific onChange for rental_type checkboxes.
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleServicesChange = (services: string[]) => {
        setFormData(prev => ({ ...prev, services }));
    };

    const validateStep = (currentStep: number): boolean => {
        const errors: Record<string, string> = {};
        if (currentStep === 1) {
            if (!formData.name.trim()) errors.name = 'Space name is required';
            if (!formData.description.trim()) errors.description = 'Description is required';
            if (!formData.category) errors.category = 'Category is required';
            if (formData.rental_type.length === 0) errors.rental_type = 'At least one rental type is required';
        } else if (currentStep === 2) {
            if (!formData.address.trim()) errors.address = 'Address is required';
            if (!formData.city.trim()) errors.city = 'City is required';
            if (!formData.neighborhood.trim()) errors.neighborhood = 'Neighborhood is required';
        } else if (currentStep === 3) {
            if (!formData.collaboration_type) errors.collaboration_type = 'Collaboration type is required';
            if (!formData.max_guests) errors.max_guests = 'Maximum guests is required';
            if (formData.max_guests && parseInt(formData.max_guests) <= 0) errors.max_guests = 'Maximum guests must be a positive number';
        }
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(prevStep => prevStep + 1);
            setProgress(prevProgress => Math.min(prevProgress + 16.7, 100));
            setError(null);
        }
    };

    const handlePrevious = () => {
        setStep(prevStep => Math.max(prevStep - 1, 1));
        setProgress(prevProgress => Math.max(prevProgress - 16.7, 16.7));
        setError(null);
    };

    const internalHandleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (step !== 6 && mode === 'create') { // Only advance step if not final for create mode
            handleNext();
            return;
        }
        if (step !== 6 && mode === 'edit' && !validateStep(step)) { // For edit mode, allow submitting on any step if valid
            handleNext(); // Or just validate and proceed if that's the desired UX
            return;
        }


        // Final validation for all steps if on last step, or for current step if submitting early in edit mode.
        let allStepsValid = true;
        if (step === 6) {
            for (let i = 1; i <= 6; i++) {
                if (!validateStep(i)) {
                    allStepsValid = false;
                    // Optionally, set step to the first invalid step:
                    // setStep(i);
                    // setError('Please fix validation errors on all steps.');
                    break;
                }
            }
        } else { // Validating current step if not on step 6 (e.g. for saving partial edits)
            allStepsValid = validateStep(step);
        }


        if (!allStepsValid) {
            setError('Please fix the validation errors before submitting.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Destructure to get dataToSend without image_urls, and image_urls separately
            const { image_urls, ...dataToSendRest } = formData;

            // Ensure all fields of SpaceFormData are present in dataToSendRest, even if empty or default
            const dataToSend: SpaceFormData = {
                ...initialFormStateBase, // Start with base to ensure all keys
                ...dataToSendRest, // Overlay with actual form data
                // Ensure specific types are correct, e.g., arrays if they were potentially modified
                services: formData.services || [],
                rental_type: formData.rental_type || [],
                tags: formData.tags || '',
            };


            const result = await onSubmit(
                dataToSend,
                uploadedImages,
                imageUrlsToRemove
            );

            if (result.success) {
                setSuccess(result.message);
                // Parent component will handle redirection or further actions.
            } else {
                setError(result.message);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(`Submission failed: ${message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newImagesArray = Array.from(e.target.files);
            const validImages = newImagesArray.filter(file => {
                const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
                const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
                if (!isValidType) setError('Only JPG, PNG, and WebP images are allowed.');
                if (!isValidSize) setError('Images must be smaller than 5MB.');
                return isValidType && isValidSize;
            });

            setUploadedImages(prev => [...prev, ...validImages]);
            const newPreviewUrls = validImages.map(file => URL.createObjectURL(file));
            setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
            if (e.target) e.target.value = ''; // Reset file input
        }
    };

    const removeImage = (index: number, url: string) => {
        const newImagePreviewUrls = [...imagePreviewUrls];
        newImagePreviewUrls.splice(index, 1);
        setImagePreviewUrls(newImagePreviewUrls);

        // Check if it's an existing initial image or a newly uploaded one
        if (initialImageUrls.includes(url)) {
            setImageUrlsToRemove(prev => [...prev, url]);
            // Also remove from initialImageUrls state to prevent re-adding if component re-renders
            setInitialImageUrls(prev => prev.filter(iu => iu !== url));
        } else {
            // It's a newly uploaded image, remove from uploadedImages
            const newUploadedImages = uploadedImages.filter(file => URL.createObjectURL(file) !== url);
            setUploadedImages(newUploadedImages);
            URL.revokeObjectURL(url); // Free memory for blob URLs
        }
    };


    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="name">
                                    Space Name <span className="text-red-500">*</span>
                                </label>
                                <input id="name" type="text" name="name" value={formData.name} onChange={handleChange} required
                                    className={`w-full p-3 border ${validationErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    placeholder="Enter space name" />
                                {validationErrors.name && <p className="mt-1 text-sm text-red-500">{validationErrors.name}</p>}
                            </div>
                            <div className="col-span-2">
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="description">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={4}
                                    className={`w-full p-3 border ${validationErrors.description ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    placeholder="Describe your space's atmosphere, features, and what makes it special." />
                                {validationErrors.description && <p className="mt-1 text-sm text-red-500">{validationErrors.description}</p>}
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="category">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <select id="category" name="category" value={formData.category} onChange={handleChange}
                                    className={`w-full p-3 border ${validationErrors.category ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white`}>
                                    <option value="">Select Category</option>
                                    <option value="restaurant">Restaurant</option>
                                    <option value="bar">Bar</option>
                                    <option value="rooftop">Rooftop</option>
                                    <option value="cafe">Cafe</option>
                                    <option value="event_space">Event Space</option>
                                    <option value="coffee_shop">Coffee Shop</option>
                                    <option value="other">Other</option>
                                </select>
                                {validationErrors.category && <p className="mt-1 text-sm text-red-500">{validationErrors.category}</p>}
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">
                                    Rental Type (select all that apply) <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-2">
                                    {['full', 'private_room', 'outside', 'semi_private'].map(type => (
                                        <div className="flex items-center" key={type}>
                                            <input
                                                id={`rental_type_${type}`} type="checkbox" name={`rental_type_${type}`}
                                                checked={formData.rental_type.includes(type)}
                                                onChange={(e) => {
                                                    const newTypes = e.target.checked
                                                        ? [...formData.rental_type, type]
                                                        : formData.rental_type.filter(t => t !== type);
                                                    setFormData({ ...formData, rental_type: newTypes });
                                                }}
                                                className="h-5 w-5 focus:ring-blue-500 border-gray-300 rounded" />
                                            <label htmlFor={`rental_type_${type}`} className="ml-2 block text-sm text-gray-700">
                                                {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {validationErrors.rental_type && <p className="mt-1 text-sm text-red-500">{validationErrors.rental_type}</p>}
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="address">
                                    Address <span className="text-red-500">*</span>
                                </label>
                                <GoogleAutoComplete
                                    formData={formData as unknown as VenueFormData} // Casting as original page did
                                    setFormData={setFormData as unknown as React.Dispatch<React.SetStateAction<VenueFormData>>}
                                />
                                {validationErrors.address && <p className="mt-1 text-sm text-red-500">{validationErrors.address}</p>}
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="neighborhood">
                                    Neighborhood <span className="text-red-500">*</span>
                                </label>
                                <input id="neighborhood" type="text" name="neighborhood" value={formData.neighborhood} onChange={handleChange}
                                    className={`w-full p-3 border ${validationErrors.neighborhood ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    placeholder="Neighborhood" />
                                {validationErrors.neighborhood && <p className="mt-1 text-sm text-red-500">{validationErrors.neighborhood}</p>}
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="city">
                                    City <span className="text-red-500">*</span>
                                </label>
                                <input id="city" type="text" name="city" value={formData.city} onChange={handleChange}
                                    className={`w-full p-3 border ${validationErrors.city ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    placeholder="City" />
                                {validationErrors.city && <p className="mt-1 text-sm text-red-500">{validationErrors.city}</p>}
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="mt-6">
                        <h2 className="text-2xl font-bold mb-4 text-center">Capacity & Collaboration</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="max_guests">
                                    Maximum Guests <span className="text-red-500">*</span>
                                </label>
                                <input id="max_guests" type="number" min="0" name="max_guests" value={formData.max_guests} onChange={handleChange}
                                    className={`w-full p-3 border ${validationErrors.max_guests ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    placeholder="e.g. 100" />
                                {validationErrors.max_guests ? <p className="mt-1 text-sm text-red-500">{validationErrors.max_guests}</p>
                                    : <p className="mt-1 text-sm text-gray-500">The maximum number of guests your space can accommodate.</p>}
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="collaboration_type">
                                    Collaboration Type <span className="text-red-500">*</span>
                                </label>
                                <select id="collaboration_type" name="collaboration_type" value={formData.collaboration_type} onChange={handleChange}
                                    className={`w-full p-3 border ${validationErrors.collaboration_type ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white`}>
                                    <option value="">Select Collaboration Type</option>
                                    <option value="open_venue">Open Venue</option>
                                    <option value="flat">Flat Fee</option>
                                    <option value="minimum_spend">Minimum Spend</option>
                                    <option value="revenue_share">Revenue Share</option>
                                </select>
                                {validationErrors.collaboration_type ? <p className="mt-1 text-sm text-red-500">{validationErrors.collaboration_type}</p>
                                    : <p className="mt-1 text-sm text-gray-500">How do you want to collaborate with Pop-ups?</p>}
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="mt-6">
                        <h2 className="text-2xl font-bold mb-4 text-center">Services & Policies</h2>
                        <VenueServicesFormStep selectedServices={formData.services || []} onServicesChange={handleServicesChange} />
                    </div>
                );
            case 5:
                return (
                    <div className="mt-6">
                        <h2 className="text-2xl font-bold mb-4 text-center">Tags & Additional Info</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="tags">Tags (comma separated)</label>
                                <input id="tags" type="text" name="tags" value={formData.tags} onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g. outdoor, pet-friendly, live-music" />
                                <p className="mt-1 text-sm text-gray-500">Add relevant tags to help customers find your space. Separate with commas.</p>
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="website">Website</label>
                                <input id="website" type="url" name="website" value={formData.website} onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="https://www.example.com" />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="instagram_handle">Instagram Handle (without @)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">@</span>
                                    </div>
                                    <input id="instagram_handle" type="text" name="instagram_handle" value={formData.instagram_handle} onChange={handleChange}
                                        className="w-full pl-7 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="spacename" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 6:
                return (
                    <div className="mt-6">
                        <h2 className="text-2xl font-bold mb-4 text-center">Space Images</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">Upload Photos</label>
                                <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md text-gray-700 text-sm mb-4">
                                    <p className="font-medium">Image Guidelines:</p>
                                    <ul className="list-disc pl-5 mt-1">
                                        <li>Max 5MB per image</li>
                                        <li>Accepted formats: JPG, PNG, WebP</li>
                                    </ul>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/jpeg,image/png,image/webp" multiple className="hidden" id="space-images" />
                                <div className="flex items-center space-x-4">
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                        Select Images
                                    </button>
                                    <span className="text-sm text-gray-600">
                                        {imagePreviewUrls.length} {imagePreviewUrls.length === 1 ? 'image' : 'images'} selected
                                    </span>
                                </div>
                            </div>
                            {imagePreviewUrls.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="text-gray-700 text-sm font-medium mb-2">Image Previews</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                                        {imagePreviewUrls.map((url, index) => (
                                            <div key={url || index} className="relative group"> {/* Use url as key if available and unique */}
                                                <div className="h-24 w-full rounded-md overflow-hidden border border-gray-300 relative">
                                                    <Image src={url} alt={`Preview ${index + 1}`} className="object-cover" fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 200px" />
                                                </div>
                                                <button type="button" onClick={() => removeImage(index, url)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
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
            default: return null;
        }
    };

    return (
        <>
            {/* Progress bar moved to parent page or here if self-contained enough */}
            <div className="mb-8">
                <div className="relative">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                        <div style={{ width: `${progress}%` }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#06048D] rounded-r-full transition-all duration-300">
                        </div>
                    </div>
                </div>
            </div>

            <h1 className="text-3xl font-bold text-center mb-8">{title}</h1>

            {error && <div className="mb-4 p-4 rounded-md bg-red-50 text-red-600">{error}</div>}
            {success && <div className="mb-4 p-4 rounded-md bg-green-50 text-green-600">{success}</div>}

            <div className="bg-white p-6 rounded-lg shadow-sm border border-[#e0d8c3] mb-8">
                <form onSubmit={internalHandleSubmit}>
                    {renderStepContent()}
                    <div className="flex justify-between items-center mt-8">
                        <div>
                            {step > 1 && (
                                <button type="button" onClick={handlePrevious}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                                    Back
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-x-4">
                            <button type="button" onClick={onCancel}
                                className="px-6 py-2 text-gray-700 font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2">
                                {mode === 'edit' ? 'Cancel' : 'Cancel'}
                            </button>
                            {step < 6 ? (
                                <button type="button" onClick={handleNext}
                                    className="px-6 py-2 bg-black text-white font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                                    Next
                                </button>
                            ) : (
                                <button type="submit"
                                    className="px-6 py-2 bg-[#06048D] text-white font-medium rounded-md hover:bg-[#050370] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                                    disabled={isLoading}>
                                    {isLoading ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {mode === 'edit' ? 'Saving...' : 'Submitting...'}
                                        </span>
                                    ) : (mode === 'edit' ? 'Save Changes' : 'Create Space')}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
};

export default CreateOrEditSpaceForm; 
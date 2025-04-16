'use client';

import { useState, FormEvent, useRef } from 'react';
import NavBar from '../components/NavBar';

export default function SubmitVenuePage() {
    const initialFormState = {
        name: '',
        description: '',
        address: '',
        city: '',
        state: 'NY',
        latitude: '',
        longitude: '',
        category: '',
        rental_type: [] as string[],
        pricing_type: '',
        price: '',
        min_hours: '',
        website: '',
        instagram_handle: '',
        alcohol_served: false,
        byob_allowed: false,
        byob_pricing_type: '',
        byob_price: '',
        outside_cake_allowed: false,
        cake_fee_type: '',
        cake_fee_amount: '',
        cleaning_fee: '',
        setup_fee: '',
        overtime_fee_per_hour: '',
        max_guests: '',
        max_seated_guests: '',
        max_standing_guests: '',
        rules: '',
        tags: '',
    };

    // US States array for dropdown
    const usStates = [
        { value: 'AL', label: 'Alabama' },
        { value: 'AK', label: 'Alaska' },
        { value: 'AZ', label: 'Arizona' },
        { value: 'AR', label: 'Arkansas' },
        { value: 'CA', label: 'California' },
        { value: 'CO', label: 'Colorado' },
        { value: 'CT', label: 'Connecticut' },
        { value: 'DE', label: 'Delaware' },
        { value: 'FL', label: 'Florida' },
        { value: 'GA', label: 'Georgia' },
        { value: 'HI', label: 'Hawaii' },
        { value: 'ID', label: 'Idaho' },
        { value: 'IL', label: 'Illinois' },
        { value: 'IN', label: 'Indiana' },
        { value: 'IA', label: 'Iowa' },
        { value: 'KS', label: 'Kansas' },
        { value: 'KY', label: 'Kentucky' },
        { value: 'LA', label: 'Louisiana' },
        { value: 'ME', label: 'Maine' },
        { value: 'MD', label: 'Maryland' },
        { value: 'MA', label: 'Massachusetts' },
        { value: 'MI', label: 'Michigan' },
        { value: 'MN', label: 'Minnesota' },
        { value: 'MS', label: 'Mississippi' },
        { value: 'MO', label: 'Missouri' },
        { value: 'MT', label: 'Montana' },
        { value: 'NE', label: 'Nebraska' },
        { value: 'NV', label: 'Nevada' },
        { value: 'NH', label: 'New Hampshire' },
        { value: 'NJ', label: 'New Jersey' },
        { value: 'NM', label: 'New Mexico' },
        { value: 'NY', label: 'New York' },
        { value: 'NC', label: 'North Carolina' },
        { value: 'ND', label: 'North Dakota' },
        { value: 'OH', label: 'Ohio' },
        { value: 'OK', label: 'Oklahoma' },
        { value: 'OR', label: 'Oregon' },
        { value: 'PA', label: 'Pennsylvania' },
        { value: 'RI', label: 'Rhode Island' },
        { value: 'SC', label: 'South Carolina' },
        { value: 'SD', label: 'South Dakota' },
        { value: 'TN', label: 'Tennessee' },
        { value: 'TX', label: 'Texas' },
        { value: 'UT', label: 'Utah' },
        { value: 'VT', label: 'Vermont' },
        { value: 'VA', label: 'Virginia' },
        { value: 'WA', label: 'Washington' },
        { value: 'WV', label: 'West Virginia' },
        { value: 'WI', label: 'Wisconsin' },
        { value: 'WY', label: 'Wyoming' },
        { value: 'DC', label: 'District of Columbia' },
    ];

    // New state for image uploads
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState(initialFormState);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const resetForm = () => {
        setFormData(initialFormState);
        setValidationErrors({});
        setError(null);
        setSuccess(null);

        // Clear images
        imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
        setUploadedImages([]);
        setImagePreviewUrls([]);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        // Handle checkboxes
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        // Clear validation error for this field when user starts typing
        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        // Required fields
        if (!formData.name.trim()) errors.name = 'Venue name is required';
        if (!formData.address.trim()) errors.address = 'Address is required';
        if (!formData.city.trim()) errors.city = 'City is required';

        // Number validations - ensure no negative values
        if (formData.price && parseFloat(formData.price) < 0) {
            errors.price = 'Price cannot be negative';
        }
        if (formData.min_hours && parseInt(formData.min_hours) < 0) {
            errors.min_hours = 'Minimum hours cannot be negative';
        }
        if (formData.max_guests && parseInt(formData.max_guests) <= 0) {
            errors.max_guests = 'Maximum guests must be a positive number';
        }
        if (formData.max_seated_guests && parseInt(formData.max_seated_guests) <= 0) {
            errors.max_seated_guests = 'Maximum seated guests must be a positive number';
        }
        if (formData.max_standing_guests && parseInt(formData.max_standing_guests) <= 0) {
            errors.max_standing_guests = 'Maximum standing guests must be a positive number';
        }
        if (formData.byob_price && parseFloat(formData.byob_price) < 0) {
            errors.byob_price = 'BYOB price cannot be negative';
        }
        if (formData.cake_fee_amount && parseFloat(formData.cake_fee_amount) < 0) {
            errors.cake_fee_amount = 'Cake fee cannot be negative';
        }
        if (formData.cleaning_fee && parseFloat(formData.cleaning_fee) < 0) {
            errors.cleaning_fee = 'Cleaning fee cannot be negative';
        }
        if (formData.setup_fee && parseFloat(formData.setup_fee) < 0) {
            errors.setup_fee = 'Setup fee cannot be negative';
        }
        if (formData.overtime_fee_per_hour && parseFloat(formData.overtime_fee_per_hour) < 0) {
            errors.overtime_fee_per_hour = 'Overtime fee cannot be negative';
        }

        // BYOB validation
        if (formData.byob_allowed && !formData.byob_pricing_type) {
            errors.byob_pricing_type = 'Please select a BYOB fee type';
        }

        // Outside cake validation
        if (formData.outside_cake_allowed && !formData.cake_fee_type) {
            errors.cake_fee_type = 'Please select a cake fee type';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
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

                imageUrls.push(result.url);
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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            setError('Please fix the validation errors before submitting');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        // Prepare data for submission (e.g., convert numbers, handle tags)
        const submissionData = {
            ...formData,
            // Convert rental_type to string format if needed by the API
            rental_type: formData.rental_type,
            pricing_type: formData.pricing_type || null,
            price: formData.price ? parseFloat(formData.price) : null,
            min_hours: formData.min_hours ? parseInt(formData.min_hours, 10) : null,
            website: formData.website.trim() || null,
            instagram_handle: formData.instagram_handle.trim() || null,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            byob_price: formData.byob_price ? parseFloat(formData.byob_price) : null,
            cake_fee_amount: formData.cake_fee_amount ? parseFloat(formData.cake_fee_amount) : null,
            cleaning_fee: formData.cleaning_fee ? parseFloat(formData.cleaning_fee) : null,
            setup_fee: formData.setup_fee ? parseFloat(formData.setup_fee) : null,
            overtime_fee_per_hour: formData.overtime_fee_per_hour ? parseFloat(formData.overtime_fee_per_hour) : null,
            max_guests: formData.max_guests ? parseInt(formData.max_guests, 10) : null,
            max_seated_guests: formData.max_seated_guests ? parseInt(formData.max_seated_guests, 10) : null,
            max_standing_guests: formData.max_standing_guests ? parseInt(formData.max_standing_guests, 10) : null,
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''), // Convert comma-separated string to array
        };

        try {
            const response = await fetch('/api/venues', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
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

            setSuccess(`Venue "${result.name}" submitted successfully!`);
            // Reset form on successful submission
            resetForm();

        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(`Submission failed: ${message}`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <NavBar />
            <div className="min-h-screen bg-[#FFF9F5]">
                <div className="max-w-4xl mx-auto p-8 mt-8">
                    <h1 className="text-3xl font-bold text-[#ca0013] mb-6 border-b pb-4">Submit a New Venue</h1>

                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded">
                            <p className="flex items-center">
                                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {success}
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
                            <p className="flex items-center">
                                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Info Section */}
                        <section className="bg-white p-6 rounded-lg shadow-sm border border-[#e0d8c3]">
                            <h2 className="text-xl font-semibold mb-4 text-[#ca0013]">Basic Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="name">
                                        Venue Name <span className="text-[#ca0013]">*</span>
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className={`w-full p-3 border ${validationErrors.name ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent`}
                                        placeholder="Enter venue name"
                                    />
                                    {validationErrors.name && (
                                        <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.name}</p>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="description">
                                        Description
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={4}
                                        className="w-full p-3 border border-[#e0d8c3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent"
                                        placeholder="Describe your venue"
                                    />
                                    <p className="mt-1 text-sm text-[#ca0013]">Provide details about your venue's atmosphere, features, and what makes it special.</p>
                                    {validationErrors.description && (
                                        <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.description}</p>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="website">
                                        Website
                                    </label>
                                    <input
                                        id="website"
                                        type="url"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-[#e0d8c3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent"
                                        placeholder="https://www.example.com"
                                    />
                                    <p className="mt-1 text-sm text-[#ca0013]">Website URL for your venue (if available)</p>
                                    {validationErrors.website && (
                                        <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.website}</p>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="instagram_handle">
                                        Instagram Handle
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-[#ca0013] sm:text-sm">@</span>
                                        </div>
                                        <input
                                            id="instagram_handle"
                                            type="text"
                                            name="instagram_handle"
                                            value={formData.instagram_handle}
                                            onChange={handleChange}
                                            className="w-full pl-7 p-3 border border-[#e0d8c3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent"
                                            placeholder="venuename"
                                        />
                                    </div>
                                    <p className="mt-1 text-sm text-[#ca0013]">Instagram handle for your venue (without the @ symbol)</p>
                                    {validationErrors.instagram_handle && (
                                        <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.instagram_handle}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="category">
                                        Category
                                    </label>
                                    <select
                                        id="category"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className={`w-full p-3 border ${validationErrors.category ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent bg-white`}
                                    >
                                        <option value="">Select Category</option>
                                        <option value="restaurant">Restaurant</option>
                                        <option value="bar">Bar</option>
                                        <option value="rooftop">Rooftop</option>
                                        <option value="cafe">Cafe</option>
                                        <option value="event_space">Event Space</option>
                                    </select>
                                    <p className="mt-1 text-sm text-[#ca0013]">Select the category that best describes your venue.</p>
                                    {validationErrors.category && (
                                        <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.category}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2">
                                        Rental Type (select all that apply)
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
                                                className="h-5 w-5 text-[#ca0013] focus:ring-[#ca0013] border-[#e0d8c3] rounded"
                                            />
                                            <label htmlFor="rental_type_full" className="ml-2 block text-sm text-[#ca0013]">
                                                Full Venue
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
                                                className="h-5 w-5 text-[#ca0013] focus:ring-[#ca0013] border-[#e0d8c3] rounded"
                                            />
                                            <label htmlFor="rental_type_private_room" className="ml-2 block text-sm text-[#ca0013]">
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
                                                        : formData.rental_type.filter(t => t !== 'outside');

                                                    setFormData({ ...formData, rental_type: newTypes });
                                                }}
                                                className="h-5 w-5 text-[#ca0013] focus:ring-[#ca0013] border-[#e0d8c3] rounded"
                                            />
                                            <label htmlFor="rental_type_outside" className="ml-2 block text-sm text-[#ca0013]">
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
                                                        : formData.rental_type.filter(t => t !== 'semi_private');

                                                    setFormData({ ...formData, rental_type: newTypes });
                                                }}
                                                className="h-5 w-5 text-[#ca0013] focus:ring-[#ca0013] border-[#e0d8c3] rounded"
                                            />
                                            <label htmlFor="rental_type_semi_private" className="ml-2 block text-sm text-[#ca0013]">
                                                Semi-Private Space
                                            </label>
                                        </div>
                                    </div>
                                    {validationErrors.rental_type && (
                                        <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.rental_type}</p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Location Section */}
                        <section className="bg-white p-6 rounded-lg shadow-sm border border-[#e0d8c3]">
                            <h2 className="text-xl font-semibold mb-4 text-[#ca0013]">Location</h2>
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm mb-4">
                                <p className="font-medium">Tip: Latitude and Longitude</p>
                                <p>You can find these coordinates using Google Maps by right-clicking on your location and selecting "What's here?"</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="address">
                                        Address <span className="text-[#ca0013]">*</span>
                                    </label>
                                    <input
                                        id="address"
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className={`w-full p-3 border ${validationErrors.address ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent`}
                                        placeholder="Street address"
                                    />
                                    {validationErrors.address && (
                                        <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.address}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="city">
                                        City <span className="text-[#ca0013]">*</span>
                                    </label>
                                    <input
                                        id="city"
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        className={`w-full p-3 border ${validationErrors.city ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent`}
                                        placeholder="City"
                                    />
                                    {validationErrors.city && (
                                        <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.city}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="state">
                                        State
                                    </label>
                                    <select
                                        id="state"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        className={`w-full p-3 border ${validationErrors.state ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent bg-white`}
                                    >
                                        <option value="">Select State</option>
                                        {usStates.map((state) => (
                                            <option key={state.value} value={state.value}>
                                                {state.label}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors.state && (
                                        <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.state}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="latitude">
                                        Latitude
                                    </label>
                                    <input
                                        id="latitude"
                                        type="number"
                                        step="any"
                                        name="latitude"
                                        value={formData.latitude}
                                        onChange={handleChange}
                                        className={`w-full p-3 border ${validationErrors.latitude ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent`}
                                        placeholder="e.g. 40.7128"
                                    />
                                    {validationErrors.latitude && (
                                        <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.latitude}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="longitude">
                                        Longitude
                                    </label>
                                    <input
                                        id="longitude"
                                        type="number"
                                        step="any"
                                        name="longitude"
                                        value={formData.longitude}
                                        onChange={handleChange}
                                        className={`w-full p-3 border ${validationErrors.longitude ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent`}
                                        placeholder="e.g. -74.0060"
                                    />
                                    {validationErrors.longitude && (
                                        <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.longitude}</p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Capacity Section */}
                        <section className="bg-white p-6 rounded-lg shadow-sm border border-[#e0d8c3]">
                            <h2 className="text-xl font-semibold mb-4 text-[#ca0013]">Capacity & Booking</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="max_guests">
                                        Maximum Guests
                                    </label>
                                    <input
                                        id="max_guests"
                                        type="number"
                                        min="0"
                                        name="max_guests"
                                        value={formData.max_guests}
                                        onChange={handleChange}
                                        className={`w-full p-3 border ${validationErrors.max_guests ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent`}
                                        placeholder="e.g. 100"
                                    />
                                    <p className="mt-1 text-sm text-[#ca0013]">The maximum number of guests your venue can accommodate.</p>
                                    {validationErrors.max_guests && (
                                        <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.max_guests}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="max_seated_guests">
                                        Maximum Seated Guests
                                    </label>
                                    <input
                                        id="max_seated_guests"
                                        type="number"
                                        min="0"
                                        name="max_seated_guests"
                                        value={formData.max_seated_guests}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-[#e0d8c3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent"
                                        placeholder="e.g. 80"
                                    />
                                    {validationErrors.max_seated_guests && (
                                        <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.max_seated_guests}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="max_standing_guests">
                                        Maximum Standing Guests
                                    </label>
                                    <input
                                        id="max_standing_guests"
                                        type="number"
                                        min="0"
                                        name="max_standing_guests"
                                        value={formData.max_standing_guests}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-[#e0d8c3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent"
                                        placeholder="e.g. 120"
                                    />
                                    {validationErrors.max_standing_guests && (
                                        <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.max_standing_guests}</p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Pricing Section */}
                        <section className="bg-white p-6 rounded-lg shadow-sm border border-[#e0d8c3]">
                            <h2 className="text-xl font-semibold mb-4 text-[#ca0013]">Pricing Information</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="pricing_type">
                                        Pricing Type
                                    </label>
                                    <select
                                        id="pricing_type"
                                        name="pricing_type"
                                        value={formData.pricing_type}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-[#e0d8c3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent bg-white"
                                    >
                                        <option value="">Select Pricing Type</option>
                                        <option value="hourly">Hourly Rate</option>
                                        <option value="flat">Flat Fee</option>
                                        <option value="minimum_spend">Minimum Spend</option>
                                    </select>
                                    <p className="mt-1 text-sm text-[#ca0013]">How do you charge for venue rental?</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="price">
                                            Price
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-[#ca0013] sm:text-sm">$</span>
                                            </div>
                                            <input
                                                id="price"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                name="price"
                                                value={formData.price}
                                                onChange={handleChange}
                                                className={`w-full pl-7 p-3 border ${validationErrors.price ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent`}
                                                placeholder={formData.pricing_type === 'hourly' ? "e.g. 150.00 per hour" : "e.g. 1000.00"}
                                            />
                                        </div>
                                        {validationErrors.price && (
                                            <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.price}</p>
                                        )}
                                        <p className="mt-1 text-sm text-[#ca0013]">
                                            {formData.pricing_type === 'hourly' && "Amount charged per hour"}
                                            {formData.pricing_type === 'flat' && "Total flat fee amount"}
                                            {formData.pricing_type === 'minimum_spend' && "Minimum amount customers must spend"}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="overtime_fee_per_hour">
                                            Overtime Fee Per Hour
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-[#ca0013] sm:text-sm">$</span>
                                            </div>
                                            <input
                                                id="overtime_fee_per_hour"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                name="overtime_fee_per_hour"
                                                value={formData.overtime_fee_per_hour}
                                                onChange={handleChange}
                                                className={`w-full pl-7 p-3 border ${validationErrors.overtime_fee_per_hour ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent`}
                                                placeholder="e.g. 200.00"
                                            />
                                        </div>
                                        {validationErrors.overtime_fee_per_hour && (
                                            <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.overtime_fee_per_hour}</p>
                                        )}
                                        <p className="mt-1 text-sm text-[#ca0013]">
                                            Extra fee charged for each hour beyond the scheduled booking time
                                        </p>
                                    </div>
                                </div>

                                {formData.pricing_type === 'hourly' && (
                                    <div>
                                        <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="min_hours">
                                            Minimum Hours
                                        </label>
                                        <input
                                            id="min_hours"
                                            type="number"
                                            min="0"
                                            name="min_hours"
                                            value={formData.min_hours}
                                            onChange={handleChange}
                                            className={`w-full p-3 border ${validationErrors.min_hours ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent`}
                                            placeholder="e.g. 3"
                                        />
                                        {validationErrors.min_hours && (
                                            <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.min_hours}</p>
                                        )}
                                        <p className="mt-1 text-sm text-[#ca0013]">Minimum number of hours required for booking</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Policies & Fees Section */}
                        <section className="bg-white p-6 rounded-lg shadow-sm border border-[#e0d8c3]">
                            <h2 className="text-xl font-semibold mb-4 text-[#ca0013]">Policies & Fees</h2>

                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
                                <p className="font-medium">Important Note:</p>
                                <p>Be sure to set clear policies regarding fees, cancellations, and special requests to avoid misunderstandings with customers.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center p-3 bg-white rounded-md">
                                    <input
                                        id="alcohol_served"
                                        type="checkbox"
                                        name="alcohol_served"
                                        checked={formData.alcohol_served}
                                        onChange={handleChange}
                                        className="h-5 w-5 text-[#ca0013] focus:ring-[#ca0013] border-[#e0d8c3] rounded"
                                    />
                                    <label htmlFor="alcohol_served" className="ml-3 text-[#ca0013]">
                                        Alcohol Served
                                    </label>
                                </div>

                                <div className="p-4 bg-white rounded-md">
                                    <div className="flex items-center">
                                        <input
                                            id="byob_allowed"
                                            type="checkbox"
                                            name="byob_allowed"
                                            checked={formData.byob_allowed}
                                            onChange={handleChange}
                                            className="h-5 w-5 text-[#ca0013] focus:ring-[#ca0013] border-[#e0d8c3] rounded"
                                        />
                                        <label htmlFor="byob_allowed" className="ml-3 text-[#ca0013] font-medium">
                                            BYOB Allowed
                                        </label>
                                    </div>

                                    {formData.byob_allowed && (
                                        <div className="mt-4 ml-8 space-y-3">
                                            <div>
                                                <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="byob_pricing_type">
                                                    BYOB Fee Type
                                                </label>
                                                <select
                                                    id="byob_pricing_type"
                                                    name="byob_pricing_type"
                                                    value={formData.byob_pricing_type}
                                                    onChange={handleChange}
                                                    className={`w-full p-3 border ${validationErrors.byob_pricing_type ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent bg-white`}
                                                >
                                                    <option value="">Select BYOB Fee Type</option>
                                                    <option value="per_person">Per Person</option>
                                                    <option value="per_bottle">Per Bottle</option>
                                                    <option value="flat_fee">Flat Fee</option>
                                                </select>
                                                {validationErrors.byob_pricing_type && (
                                                    <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.byob_pricing_type}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="byob_price">
                                                    BYOB Price ($)
                                                </label>
                                                <input
                                                    id="byob_price"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    name="byob_price"
                                                    value={formData.byob_price}
                                                    onChange={handleChange}
                                                    className={`w-full p-3 border ${validationErrors.byob_price ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent`}
                                                    placeholder="e.g. 15.00"
                                                />
                                                {validationErrors.byob_price && (
                                                    <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.byob_price}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-white rounded-md">
                                    <div className="flex items-center">
                                        <input
                                            id="outside_cake_allowed"
                                            type="checkbox"
                                            name="outside_cake_allowed"
                                            checked={formData.outside_cake_allowed}
                                            onChange={handleChange}
                                            className="h-5 w-5 text-[#ca0013] focus:ring-[#ca0013] border-[#e0d8c3] rounded"
                                        />
                                        <label htmlFor="outside_cake_allowed" className="ml-3 text-[#ca0013] font-medium">
                                            Outside Cake Allowed
                                        </label>
                                    </div>

                                    {formData.outside_cake_allowed && (
                                        <div className="mt-4 ml-8 space-y-3">
                                            <div>
                                                <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="cake_fee_type">
                                                    Cake Fee Type
                                                </label>
                                                <select
                                                    id="cake_fee_type"
                                                    name="cake_fee_type"
                                                    value={formData.cake_fee_type}
                                                    onChange={handleChange}
                                                    className={`w-full p-3 border ${validationErrors.cake_fee_type ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent bg-white`}
                                                >
                                                    <option value="">Select Cake Fee Type</option>
                                                    <option value="per_person">Per Person</option>
                                                    <option value="per_cake">Per Cake</option>
                                                    <option value="flat_fee">Flat Fee</option>
                                                </select>
                                                {validationErrors.cake_fee_type && (
                                                    <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.cake_fee_type}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="cake_fee_amount">
                                                    Cake Fee Amount ($)
                                                </label>
                                                <input
                                                    id="cake_fee_amount"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    name="cake_fee_amount"
                                                    value={formData.cake_fee_amount}
                                                    onChange={handleChange}
                                                    className={`w-full p-3 border ${validationErrors.cake_fee_amount ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent`}
                                                    placeholder="e.g. 25.00"
                                                />
                                                {validationErrors.cake_fee_amount && (
                                                    <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.cake_fee_amount}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="cleaning_fee">
                                            Cleaning Fee ($)
                                        </label>
                                        <input
                                            id="cleaning_fee"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            name="cleaning_fee"
                                            value={formData.cleaning_fee}
                                            onChange={handleChange}
                                            className={`w-full p-3 border ${validationErrors.cleaning_fee ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent`}
                                            placeholder="e.g. 150.00"
                                        />
                                        {validationErrors.cleaning_fee && (
                                            <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.cleaning_fee}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="setup_fee">
                                            Setup Fee ($)
                                        </label>
                                        <input
                                            id="setup_fee"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            name="setup_fee"
                                            value={formData.setup_fee}
                                            onChange={handleChange}
                                            className={`w-full p-3 border ${validationErrors.setup_fee ? 'border-red-500' : 'border-[#e0d8c3]'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent`}
                                            placeholder="e.g. 200.00"
                                        />
                                        {validationErrors.setup_fee && (
                                            <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.setup_fee}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Tags Section */}
                        <section className="bg-white p-6 rounded-lg shadow-sm border border-[#e0d8c3]">
                            <h2 className="text-xl font-semibold mb-4 text-[#ca0013]">Tags</h2>
                            <div>
                                <label className="block text-[#ca0013] text-sm font-medium mb-2" htmlFor="tags">
                                    Tags (comma separated)
                                </label>
                                <input
                                    id="tags"
                                    type="text"
                                    name="tags"
                                    value={formData.tags}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-[#e0d8c3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#ca0013] focus:border-transparent"
                                    placeholder="e.g. outdoor, pet-friendly, live-music"
                                />
                                <p className="mt-1 text-sm text-[#ca0013]">Add relevant tags to help customers find your venue. Separate with commas (e.g. rooftop, private, views)</p>
                                {validationErrors.tags && (
                                    <p className="mt-1 text-sm text-[#ca0013]">{validationErrors.tags}</p>
                                )}
                            </div>
                        </section>

                        {/* New Images Section */}
                        <section className="bg-white p-6 rounded-lg shadow-sm border border-[#e0d8c3]">
                            <h2 className="text-xl font-semibold mb-4 text-[#ca0013]">Venue Images</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[#ca0013] text-sm font-medium mb-2">
                                        Upload Photos
                                    </label>
                                    <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm mb-4">
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
                                        id="venue-images"
                                    />

                                    <div className="flex items-center space-x-4">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer border-2 border-blue-700"
                                        >
                                            Select Images
                                        </button>
                                        <span className="text-sm text-[#ca0013]">
                                            {uploadedImages.length} {uploadedImages.length === 1 ? 'image' : 'images'} selected
                                        </span>
                                    </div>
                                </div>

                                {/* Image preview */}
                                {imagePreviewUrls.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="text-[#ca0013] text-sm font-medium mb-2">Image Previews</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                                            {imagePreviewUrls.map((url, index) => (
                                                <div key={index} className="relative group">
                                                    <div className="h-24 w-full rounded-md overflow-hidden border border-[#e0d8c3]">
                                                        <img
                                                            src={url}
                                                            alt={`Venue image ${index + 1}`}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index)}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 focus:outline-none cursor-pointer border-2 border-red-600"
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
                        </section>

                        <div className="flex justify-between mt-8">
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm('Are you sure you want to reset the form? All entered data will be lost.')) {
                                        resetForm();
                                    }
                                }}
                                className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer border-2 border-gray-300"
                            >
                                Reset Form
                            </button>

                            <button
                                type="submit"
                                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-2 border-blue-700"
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
                                ) : 'Submit Venue'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
} 
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../context/UserContext";
import MultiStepLayout from "./components/MultiStepLayout";
import EventDetailsStep, { EventFormData } from "./components/EventDetailsStep";
import VenueSelectionStep from "./components/VenueSelectionStep";
import MessageCompositionStep from "./components/MessageCompositionStep";
import { useVenueCart } from "./hooks/useVenueCart";

interface BulkMessageResponse {
    success: boolean;
    event: {
        id: string;
        title: string;
        status: string;
    };
    bookingRequests: Array<{
        id: string;
        venue_id: string;
        status: string;
    }>;
    chatRooms: Array<{
        id: string;
        venue_id: string;
    }>;
    message: string;
    partialSuccess?: boolean;
    failedVenues?: string[];
}

export default function SubmitEventPage() {
    const router = useRouter();
    const { user } = useUser();
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [submitAttempted, setSubmitAttempted] = useState(false);
    
    // Initialize venue cart
    const {
        selectedVenues,
        addVenue,
        removeVenue,
        venueCount,
        clearVenues
    } = useVenueCart();

    // Form data state
    const [eventFormData, setEventFormData] = useState<EventFormData>({
        title: "",
        event_type: "Pop Up",
        description: "",
        selected_date: new Date().toISOString().split('T')[0],
        selected_time: "",
        expected_capacity_min: 1,
        expected_capacity_max: 15,
        assets_needed: [],
        event_status: "private_pending",
        duration: 1,
    });

    // Image state
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

    // Message state
    const [message, setMessage] = useState("");

    // Step navigation handlers
    const handleNext = () => {
        setError(null); // Clear errors when navigating
        
        if (currentStep === 1) {
            // Validate required fields for step 1
            if (!eventFormData.title.trim() || !eventFormData.selected_date) {
                setError("Please fill in the required fields (title and date).");
                return;
            }
            setCurrentStep(2);
        } else if (currentStep === 2) {
            if (venueCount > 0) {
                // User selected venues, go to message step
                setCurrentStep(3);
            } else {
                // No venues selected, create event directly (Phase 1 placeholder)
                handleCreateEventDirectly();
            }
        } else if (currentStep === 3) {
            // Final step - create event with venue messages (Phase 3 implementation)
            handleCreateEventWithVenues();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            setError(null);
        }
    };

    // Placeholder for direct event creation (no venues selected)
    const handleCreateEventDirectly = () => {
        setIsSubmitting(true);
        
        // For Phase 1, we'll just show a placeholder
        setTimeout(() => {
            setError("Direct event creation without venue selection is not yet implemented. Please select at least one venue to continue.");
            setIsSubmitting(false);
        }, 1000);
    };

    // Enhanced event creation with comprehensive error handling
    const handleCreateEventWithVenues = async () => {
        setIsSubmitting(true);
        setError(null);
        setSubmitAttempted(true);
        
        try {
            // Validate form data before submission
            if (!eventFormData.title.trim()) {
                throw new Error("Event title is required");
            }
            
            if (!eventFormData.selected_date) {
                throw new Error("Event date is required");
            }
            
            if (selectedVenues.length === 0) {
                throw new Error("Please select at least one venue");
            }
            
            if (!message.trim()) {
                throw new Error("Please write a message to send to venues");
            }
            
            if (!user?.id) {
                throw new Error("User authentication required. Please sign in and try again.");
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            try {
                // Create FormData to handle file uploads
                const formData = new FormData();
                
                // Add text fields
                formData.append('eventData', JSON.stringify({
                    ...eventFormData,
                    // Remove images from eventData since we're handling them separately
                }));
                formData.append('venueIds', JSON.stringify(selectedVenues.map(venue => venue.id)));
                formData.append('message', message);
                formData.append('userId', user.id);
                
                // Add image files
                uploadedImages.forEach((file, index) => {
                    formData.append(`image_${index}`, file);
                });

                const response = await fetch('/api/submit-event/bulk-message', {
                    method: 'POST',
                    body: formData, // Send FormData instead of JSON
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    let errorMessage = `Server error (${response.status})`;
                    
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } catch {
                        // If we can't parse the error response, use the default message
                    }
                    
                    throw new Error(errorMessage);
                }

                const result: BulkMessageResponse = await response.json();

                if (!result.success) {
                    throw new Error(result.message || 'Failed to create event');
                }

                // Handle partial success scenarios
                if (result.partialSuccess && result.failedVenues && result.failedVenues.length > 0) {
                    const successCount = selectedVenues.length - result.failedVenues.length;
                    console.warn(`Partial success: ${successCount}/${selectedVenues.length} venues contacted`);
                    
                    // Show partial success message but still redirect
                    router.push(`/event/${result.event.id}?success=partial&venues=${successCount}&failed=${result.failedVenues.length}`);
                    return;
                }

                // Full success
                clearVenues(); // Clear the venue cart after successful submission
                router.push(`/event/${result.event.id}?success=created&venues=${result.bookingRequests.length}`);
                
            } catch (fetchError) {
                clearTimeout(timeoutId);
                
                if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                    throw new Error('Request timed out. Please check your internet connection and try again.');
                }
                
                throw fetchError;
            }
            
        } catch (err) {
            console.error('Event creation error:', err);
            
            let errorMessage = 'Failed to create event. Please try again.';
            
            if (err instanceof Error) {
                errorMessage = err.message;
            }
            
            // Add retry suggestion for network errors
            if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
                errorMessage += ' Please check your internet connection and try again.';
            }
            
            setError(errorMessage);
            setRetryCount(prev => prev + 1);
            
        } finally {
            setIsSubmitting(false);
        }
    };

    // Retry function for failed submissions
    const handleRetry = () => {
        if (currentStep === 3) {
            handleCreateEventWithVenues();
        } else if (currentStep === 2 && venueCount === 0) {
            handleCreateEventDirectly();
        }
    };

    // Navigation validation
    const canGoNext = () => {
        switch (currentStep) {
            case 1:
                return eventFormData.title.trim() !== "" && eventFormData.selected_date !== "";
            case 2:
                return true; // Always allow proceeding from venue selection
            case 3:
                return message.trim() !== "" && !isSubmitting; // Don't allow if currently submitting
            default:
                return false;
        }
    };

    const canGoPrevious = () => {
        return currentStep > 1 && !isSubmitting; // Don't allow navigation during submission
    };

    // Update button text based on current step and selections
    const getButtonText = (): string => {
        if (isSubmitting) {
            switch (currentStep) {
                case 2:
                    return "Creating Event...";
                case 3:
                    return "Sending Messages...";
                default:
                    return "Processing...";
            }
        }
        
        switch (currentStep) {
            case 1:
                return "Next";
            case 2:
                return venueCount > 0 
                    ? `Message Spaces (${venueCount} selected)`
                    : "Skip (Add Address Later)";
            case 3:
                return "Create Event";
            default:
                return "Next";
        }
    };

    // Show optional text for step 2
    const shouldShowOptionalText = () => {
        return currentStep === 2 && venueCount === 0;
    };

    // Redirect if user not logged in
    if (!user) {
        router.push("/auth/sign-in?redirect=/submit-event");
        return null;
    }

    return (
        <>
            {/* Enhanced error message with retry option */}
            {error && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4">
                    <div className="p-4 rounded-md bg-red-50 text-red-700 border border-red-200 shadow-lg">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium">Error</p>
                                <p className="mt-1 text-sm">{error}</p>
                                {submitAttempted && retryCount > 0 && (
                                    <button
                                        onClick={handleRetry}
                                        className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition-colors"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Retrying...' : 'Try Again'}
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setError(null)}
                                className="ml-2 flex-shrink-0 text-red-400 hover:text-red-600"
                            >
                                <span className="sr-only">Dismiss</span>
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <MultiStepLayout
                currentStep={currentStep}
                onPrevious={handlePrevious}
                onNext={handleNext}
                canGoNext={canGoNext()}
                canGoPrevious={canGoPrevious()}
                nextButtonText={getButtonText()}
                showOptionalText={shouldShowOptionalText()}
                isSubmitting={isSubmitting}
            >
                {currentStep === 1 && (
                    <EventDetailsStep
                        formData={eventFormData}
                        onFormDataChange={setEventFormData}
                        uploadedImages={uploadedImages}
                        onImagesChange={setUploadedImages}
                        imagePreviewUrls={imagePreviewUrls}
                        onImagePreviewUrlsChange={setImagePreviewUrls}
                    />
                )}

                {currentStep === 2 && (
                    <VenueSelectionStep
                        selectedVenues={selectedVenues}
                        onVenueSelect={addVenue}
                        onVenueDeselect={removeVenue}
                    />
                )}

                {currentStep === 3 && (
                    <MessageCompositionStep
                        eventData={eventFormData}
                        selectedVenues={selectedVenues}
                        message={message}
                        onMessageChange={setMessage}
                    />
                )}
            </MultiStepLayout>
        </>
    );
} 
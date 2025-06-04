"use client";

import React from "react";
import NavBar from "../../components/NavBar";

interface Step {
    id: number;
    title: string;
    description: string;
}

const steps: Step[] = [
    { id: 1, title: "Event Details", description: "Basic information about your event" },
    { id: 2, title: "Select Venues", description: "Choose spaces to contact" },
    { id: 3, title: "Send Message", description: "Message venue owners" },
];

interface MultiStepLayoutProps {
    currentStep: number;
    children: React.ReactNode;
    onNext: () => void;
    onPrevious: () => void;
    canGoNext: boolean;
    canGoPrevious: boolean;
    nextButtonText?: string;
    showOptionalText?: boolean;
    isSubmitting?: boolean;
}

export default function MultiStepLayout({
    currentStep,
    children,
    onNext,
    onPrevious,
    canGoNext,
    canGoPrevious,
    nextButtonText = "Next",
    isSubmitting = false,
}: MultiStepLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <NavBar />
            
            {/* Progress Indicator */}
            <div className="bg-white border-b border-gray-200 px-4 py-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => {
                            const isActive = step.id === currentStep;
                            const isCompleted = step.id < currentStep;
                            const isConnector = index < steps.length - 1;

                            return (
                                <div key={step.id} className="flex items-center flex-1">
                                    {/* Step Circle and Content */}
                                    <div className="flex items-center">
                                        <div
                                            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                                                isCompleted
                                                    ? "bg-blue-600 border-blue-600 text-white"
                                                    : isActive
                                                    ? "border-blue-600 text-blue-600 bg-white"
                                                    : "border-gray-300 text-gray-400 bg-white"
                                            }`}
                                        >
                                            {isCompleted ? (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <span className="text-sm font-medium">{step.id}</span>
                                            )}
                                        </div>
                                        <div className="ml-3 hidden sm:block">
                                            <p className={`text-sm font-medium ${
                                                isActive ? "text-blue-600" : isCompleted ? "text-gray-900" : "text-gray-400"
                                            }`}>
                                                {step.title}
                                            </p>
                                            <p className="text-xs text-gray-500">{step.description}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Connector Line */}
                                    {isConnector && (
                                        <div className="flex-1 ml-4 mr-4">
                                            <div className={`h-0.5 ${
                                                isCompleted ? "bg-blue-600" : "bg-gray-300"
                                            }`} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 pb-24">
                {children}
            </div>

            {/* Sticky Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-50">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button
                        onClick={onPrevious}
                        disabled={!canGoPrevious}
                        className={`cursor-pointer px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg transition-colors duration-200 ${
                            canGoPrevious
                                ? "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                                : "opacity-50 cursor-not-allowed"
                        }`}
                    >
                        Previous
                    </button>

                    <div className="flex flex-col items-center">
                        <button
                            onClick={onNext}
                            disabled={!canGoNext || isSubmitting}
                            className={`cursor-pointer px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md transition-all duration-200 ${
                                canGoNext && !isSubmitting
                                    ? "hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                    : "opacity-60 cursor-not-allowed"
                            } flex items-center justify-center min-w-[150px]`}
                        >
                            {isSubmitting ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                nextButtonText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 
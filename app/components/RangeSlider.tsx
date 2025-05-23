"use client";

import React, { useEffect, useRef } from 'react';

interface RangeSliderProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    displaySuffix?: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
    id,
    label,
    value,
    onChange,
    options,
    displaySuffix = ''
}) => {
    const currentIndex = options.findIndex(option => option.value === value);
    const sliderRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const slider = sliderRef.current;
        if (slider) {
            // Ensure transition is set for smooth animation
            slider.style.transition = 'background 0.15s ease-in-out';

            const currentSliderValue = currentIndex; // Slider value is based on option index (0 to options.length - 1)
            const minSliderValue = 0;
            const maxSliderValue = options.length > 0 ? options.length - 1 : 0;

            let percentage = 0;
            if (maxSliderValue > minSliderValue) {
                percentage = (currentSliderValue / maxSliderValue) * 100;
            } else if (options.length === 1) { // Handle single option case - fill 100%
                percentage = 100;
            }

            const fillColor = '#273287';
            const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
            const trackColor = isDarkMode ? '#374151' : '#E5E7EB'; // Corresponds to dark:bg-gray-700 and bg-gray-200

            slider.style.background = `linear-gradient(to right, ${fillColor} ${percentage}%, ${trackColor} ${percentage}%)`;
        }
    }, [currentIndex, options.length]); // Rerun when index or options change

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const sliderValue = parseInt(event.target.value, 10);
        // The sliderValue is now directly the index of the option
        const selectedOption = options[Math.min(options.length - 1, Math.max(0, sliderValue))];
        if (selectedOption) {
            onChange(selectedOption.value);
        }
    };

    const displayValue = options[currentIndex]?.label || `${value}${displaySuffix}`;


    return (
        <div>
            {/* Add a style tag for custom thumb styles */}
            <style>
                {`
                    .custom-slider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 16px; /* Or your desired width */
                        height: 16px; /* Or your desired height */
                        background: #273287;
                        border-radius: 50%; /* Makes it a circle */
                        cursor: pointer;
                        margin-top: -7px; /* Adjust to center thumb on track, (track_height - thumb_height) / 2 */
                    }

                    .custom-slider::-moz-range-thumb {
                        width: 16px; /* Or your desired width */
                        height: 16px; /* Or your desired height */
                        background: #273287;
                        border-radius: 50%; /* Makes it a circle */
                        cursor: pointer;
                        border: none; /* Reset default border in Firefox */
                    }

                    /* For IE/Edge - though Edge now uses WebKit styles */
                    .custom-slider::-ms-thumb {
                        width: 16px;
                        height: 16px;
                        background: #273287;
                        border-radius: 50%;
                        cursor: pointer;
                    }
                `}
            </style>
            <div className="flex justify-between items-center mb-2">
                <label htmlFor={id} className="block font-semibold">
                    {label}
                </label>
                <span className="">{displayValue}</span>
            </div>
            <input
                type="range"
                id={id}
                ref={sliderRef}
                min={0}
                max={options.length > 0 ? options.length - 1 : 0}
                step={1}
                value={currentIndex}
                onChange={handleChange}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer custom-slider"
            />
        </div>
    );
};

export default RangeSlider; 
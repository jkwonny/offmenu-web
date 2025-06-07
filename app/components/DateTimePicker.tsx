'use client'

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DateTimePickerProps {
    selectedDate: string;
    selectedTime: string;
    onDateSelect: (date: string) => void;
    onTimeSelect: (time: string) => void;
    onConfirm: () => void;
    showPicker: boolean;
    togglePicker: () => void;
    buttonClassName?: string;
    customButton?: React.ReactNode;
}

export default function DateTimePicker({
    selectedDate,
    selectedTime,
    onDateSelect,
    onTimeSelect,
    onConfirm,
    showPicker,
    togglePicker,
    buttonClassName = "w-full h-full flex items-center justify-center rounded-md px-3 focus:outline-none",
    customButton
}: DateTimePickerProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isAnimating, setIsAnimating] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [mounted, setMounted] = useState(false);
    const dateTimePickerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement | HTMLDivElement>(null);
    const isToggleClick = useRef(false);

    // Set mounted to true after component mounts
    useEffect(() => {
        setMounted(true);
    }, []);

    // Calculate dropdown position when it opens
    useEffect(() => {
        if (showPicker && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4, // 4px gap
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [showPicker]);

    // Calendar navigation
    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    // Generate calendar grid for current month
    const generateCalendarMonth = () => {
        const month = currentMonth.getMonth();
        const year = currentMonth.getFullYear();

        // First day of month
        const firstDay = new Date(year, month, 1);
        // Last day of month
        const lastDay = new Date(year, month + 1, 0);

        // Day of week of first day (0 = Sunday, 6 = Saturday)
        const startDayOfWeek = firstDay.getDay();

        // Total days in month
        const daysInMonth = lastDay.getDate();

        // Create array for calendar grid (max 6 weeks * 7 days = 42 cells)
        const calendarDays = [];

        // Add empty cells for days before first of month
        for (let i = 0; i < startDayOfWeek; i++) {
            calendarDays.push(null);
        }

        // Add days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            calendarDays.push({
                date,
                dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                isToday: date.getTime() === today.getTime(),
                isPast: date < today,
                isAvailable: date >= today
            });
        }

        return calendarDays;
    };

    // Generate time slots from 12PM to 2AM in 30-minute increments
    const generateTimeSlots = () => {
        const slots = [];
        // 12PM to 11:30PM
        for (let hour = 12; hour < 24; hour++) {
            const hour12 = hour > 12 ? hour - 12 : hour;
            const ampm = hour >= 12 ? 'PM' : 'AM';
            slots.push(`${hour12}:00 ${ampm}`);
            slots.push(`${hour12}:30 ${ampm}`);
        }
        // 12AM to 2AM
        slots.push(`12:00 AM`);
        slots.push(`12:30 AM`);
        slots.push(`1:00 AM`);
        slots.push(`1:30 AM`);
        slots.push(`2:00 AM`);

        return slots;
    };

    const handleToggleClick = () => {
        isToggleClick.current = true;

        if (showPicker) {
            // Start exit animation
            setIsAnimating(true);
            setTimeout(() => {
                togglePicker();
                setIsAnimating(false);
            }, 50); // Match the CSS transition duration
        } else {
            // Start enter animation
            togglePicker();
            setIsAnimating(true);
            setTimeout(() => {
                setIsAnimating(false);
            }, 50);
        }

        // Reset the flag after a short delay
        setTimeout(() => {
            isToggleClick.current = false;
        }, 0);
    };

    // Close picker when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // Don't close if this was a toggle button click
            if (isToggleClick.current) {
                return;
            }

            if (dateTimePickerRef.current && !dateTimePickerRef.current.contains(event.target as Node)) {
                if (showPicker) {
                    // Start exit animation
                    setIsAnimating(true);
                    setTimeout(() => {
                        togglePicker();
                        setIsAnimating(false);
                    }, 150);
                }
            }
        }

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showPicker, togglePicker]);

    return (
        <div className="relative h-full" ref={dateTimePickerRef}>
            {customButton ? (
                <div
                    ref={buttonRef as React.RefObject<HTMLDivElement>}
                    onClick={handleToggleClick}
                >
                    {customButton}
                </div>
            ) : (
                <button
                    ref={buttonRef as React.RefObject<HTMLButtonElement>}
                    onClick={handleToggleClick}
                    className={buttonClassName}
                    type="button"
                >
                    <div className="flex items-center w-full justify-between">
                        <span className="text-gray-800 text-center">
                            {selectedDate && selectedTime ?
                                `${new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${selectedTime}` :
                                "Select date & time"
                            }
                        </span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`ml-2 transition-transform duration-150 ${showPicker ? "rotate-180" : ""}`}>
                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </button>
            )}

            {showPicker && mounted && createPortal(
                <div
                    ref={dateTimePickerRef}
                    className={`absolute z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden
                               w-[calc(100vw-2rem)] max-w-[600px]
                               transition-all duration-100 ease-out
                               ${isAnimating ? 'opacity-0 scale-95 translate-y-[-10px]' : 'opacity-100 scale-100 translate-y-0'}`}
                    style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${Math.max(16, Math.min(dropdownPosition.left, window.innerWidth - 600 - 16))}px`, // Keep within viewport with 16px margin
                    }}
                >
                    {/* Mobile: Stack vertically, Desktop: Side by side */}
                    <div className="flex flex-col md:flex-row border-b">
                        {/* Calendar Section */}
                        <div className="w-full md:w-3/5 md:border-r">
                            <div className="flex justify-between items-center p-3 md:p-4 border-b">
                                <button onClick={prevMonth} className="p-1 md:p-2">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="md:w-5 md:h-5">
                                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <div className="font-medium text-sm md:text-lg">
                                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </div>
                                <button onClick={nextMonth} className="p-1 md:p-2">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="md:w-5 md:h-5">
                                        <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>

                            <div className="grid grid-cols-7 mb-1 border-b">
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                                    <div key={day} className="text-center py-2 md:py-3 text-xs md:text-base font-medium">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 p-2 md:p-4">
                                {generateCalendarMonth().map((day, index) => (
                                    <div key={index} className="p-1 md:p-2 text-center">
                                        {day ? (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (day.isAvailable) {
                                                        onDateSelect(day.dateString);
                                                        // Close picker if both date and time are selected
                                                        if (selectedTime) {
                                                            onConfirm();
                                                        }
                                                    }
                                                }}
                                                className={`w-6 h-6 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xs md:text-base
                                                  ${day.isToday ? 'border border-[#273287]' : ''}
                                                  ${day.isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                                                  ${day.isAvailable && !day.isToday ? 'cursor-pointer' : ''}
                                                  ${day.dateString === selectedDate ? 'bg-[#273287] text-white border-2 border-[#273287]' :
                                                        (day.isAvailable && !day.isToday ? 'hover:bg-[#273287]/10' : '')}
                                                `}
                                                disabled={!day.isAvailable}
                                                type="button"
                                            >
                                                {day.date.getDate()}
                                            </button>
                                        ) : (
                                            <div className="w-6 h-6 md:w-12 md:h-12"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Time Section */}
                        <div className="w-full md:w-2/5 max-h-48 md:max-h-80 overflow-y-auto border-t md:border-t-0">
                            <div className="p-3 md:p-4 border-b">
                                <h3 className="font-medium text-center text-sm md:text-lg">Time</h3>
                            </div>
                            <div className="p-2 md:p-4 grid grid-cols-2 gap-1 md:gap-2">
                                {generateTimeSlots().map((time) => (
                                    <button
                                        key={time}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onTimeSelect(time);
                                            // Close picker if both date and time are selected
                                            if (selectedDate) {
                                                onConfirm();
                                            }
                                        }}
                                        className={`w-full text-center px-2 py-2 md:px-3 md:py-3 rounded text-xs md:text-base border
                                          ${selectedTime === time ? 'bg-[#273287] text-white border-[#273287]' : 'bg-white border-gray-200 hover:bg-[#273287]/10 hover:border-[#273287]/30'}`}
                                        type="button"
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-3 md:p-4 flex justify-end border-t">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                onConfirm();
                            }}
                            className={`px-4 py-2 md:px-6 md:py-3 rounded font-medium text-xs md:text-base
                              ${selectedDate && selectedTime ? 'bg-[#273287] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                            disabled={!selectedDate || !selectedTime}
                            type="button"
                        >
                            Apply
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
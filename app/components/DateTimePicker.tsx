'use client'

import { useState, useRef, useEffect } from 'react';

interface DateTimePickerProps {
    selectedDate: string;
    selectedTime: string;
    onDateSelect: (date: string) => void;
    onTimeSelect: (time: string) => void;
    onConfirm: () => void;
    showPicker: boolean;
    togglePicker: () => void;
    buttonClassName?: string;
    pickerPosition?: 'left' | 'right' | 'center';
    pickerWidth?: string;
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
    pickerPosition = 'right',
    pickerWidth = '520px',
    customButton
}: DateTimePickerProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const dateTimePickerRef = useRef<HTMLDivElement>(null);

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

    // Close picker when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dateTimePickerRef.current && !dateTimePickerRef.current.contains(event.target as Node)) {
                if (showPicker) {
                    togglePicker();
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPicker, togglePicker]);

    // Calculate picker position styles
    const getPickerPositionStyle = () => {
        switch (pickerPosition) {
            case 'left':
                return { left: '0' };
            case 'right':
                return { right: '0' };
            case 'center':
                return { left: '50%', transform: 'translateX(-50%)' };
            default:
                return { left: '0' };
        }
    };

    return (
        <div className="relative h-full" ref={dateTimePickerRef}>
            {customButton ? (
                <div onClick={togglePicker}>{customButton}</div>
            ) : (
                <button
                    onClick={togglePicker}
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
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`ml-2 ${showPicker ? "rotate-180" : ""}`}>
                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </button>
            )}

            {showPicker && (
                <div
                    className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                    style={{ width: pickerWidth, ...getPickerPositionStyle() }}
                >
                    <div className="flex border-b">
                        <div className="w-3/5 border-r">
                            <div className="flex justify-between items-center p-3 border-b">
                                <button onClick={prevMonth} className="p-1">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <div className="font-medium">
                                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </div>
                                <button onClick={nextMonth} className="p-1">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>

                            <div className="grid grid-cols-7 mb-1 border-b">
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                                    <div key={day} className="text-center py-2 text-sm font-medium">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 p-2">
                                {generateCalendarMonth().map((day, index) => (
                                    <div key={index} className="p-1 text-center">
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
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
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
                                            <div className="w-8 h-8"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="w-2/5 max-h-72 overflow-y-auto">
                            <div className="p-3 border-b">
                                <h3 className="font-medium text-center">Time</h3>
                            </div>
                            <div className="p-2">
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
                                        className={`w-full text-left px-3 py-2 rounded text-sm 
                                          ${selectedTime === time ? 'bg-[#273287] text-white' : 'hover:bg-[#273287]/10'}`}
                                        type="button"
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-3 flex justify-end border-t">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                onConfirm();
                            }}
                            className={`px-4 py-2 rounded font-medium text-sm
                              ${selectedDate && selectedTime ? 'bg-[#273287] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                            disabled={!selectedDate || !selectedTime}
                            type="button"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
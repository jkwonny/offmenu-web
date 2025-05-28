'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';

interface CollaborationType {
    type: string;
    amount: number;
    description?: string;
}

interface CalendarDay {
    date: string;
    status: 'blocked' | 'available';
    collaboration_types: CollaborationType[];
    source: 'blocked_time' | 'collaboration_rule';
    blocked_reason?: string;
}

interface CollaborationCalendarViewProps {
    venueId: number;
    onDateClick?: (date: string, dayData: CalendarDay) => void;
    showPricing?: boolean;
}

const COLLABORATION_TYPE_COLORS = {
    'open_venue': '#22c55e',
    'flat': '#3b82f6',
    'minimum_spend': '#f97316',
    'no_minimum_spend': '#6b7280',
    'revenue_share': '#8b5cf6'
};

const COLLABORATION_TYPE_LABELS = {
    'open_venue': 'Open Venue',
    'flat': 'Flat Fee',
    'minimum_spend': 'Minimum Spend',
    'no_minimum_spend': 'No Minimum Spend',
    'revenue_share': 'Revenue Share'
};

export default function CollaborationCalendarView({
    venueId,
    onDateClick,
    showPricing = false
}: CollaborationCalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        fetchCalendarData();
    }, [venueId, currentDate]);

    const fetchCalendarData = async () => {
        setIsLoading(true);
        try {
            const startDate = startOfMonth(currentDate);
            const endDate = endOfMonth(currentDate);

            const response = await fetch(
                `/api/venues/${venueId}/availability-calendar?start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}`
            );

            const data = await response.json();

            if (data.success) {
                setCalendarData(data.calendar_data);
            }
        } catch (error) {
            console.error('Error fetching calendar data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getDayData = (date: Date): CalendarDay | null => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return calendarData.find(day => day.date === dateStr) || null;
    };

    const handleDateClick = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayData = getDayData(date);

        setSelectedDate(dateStr);

        if (onDateClick && dayData) {
            onDateClick(dateStr, dayData);
        }
    };

    const renderCollaborationDots = (collaborationTypes: CollaborationType[]) => {
        if (collaborationTypes.length === 0) return null;

        return (
            <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                {collaborationTypes.slice(0, 4).map((collab, index) => (
                    <div
                        key={index}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: COLLABORATION_TYPE_COLORS[collab.type as keyof typeof COLLABORATION_TYPE_COLORS] || '#6b7280' }}
                        title={`${COLLABORATION_TYPE_LABELS[collab.type as keyof typeof COLLABORATION_TYPE_LABELS]} ${collab.amount > 0 ? `$${collab.amount}` : ''}`}
                    />
                ))}
                {collaborationTypes.length > 4 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" title={`+${collaborationTypes.length - 4} more`} />
                )}
            </div>
        );
    };

    const renderCalendarDay = (date: Date) => {
        const dayData = getDayData(date);
        const dateStr = format(date, 'yyyy-MM-dd');
        const isCurrentMonth = isSameMonth(date, currentDate);
        const isSelected = selectedDate === dateStr;
        const isTodayDate = isToday(date);

        let dayClasses = `
      relative p-2 h-16 border border-gray-200 cursor-pointer transition-colors
      ${isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400'}
      ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
      ${isTodayDate ? 'bg-blue-100' : ''}
    `;

        if (dayData?.status === 'blocked') {
            dayClasses += ' bg-red-50 hover:bg-red-100';
        }

        return (
            <div
                key={dateStr}
                className={dayClasses}
                onClick={() => handleDateClick(date)}
            >
                <div className="text-sm font-medium">
                    {format(date, 'd')}
                </div>

                {dayData?.status === 'blocked' ? (
                    <div className="absolute inset-x-1 bottom-1">
                        <div className="w-full h-1 bg-red-500 rounded" title={dayData.blocked_reason} />
                    </div>
                ) : (
                    dayData && renderCollaborationDots(dayData.collaboration_types)
                )}
            </div>
        );
    };

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Pad the calendar to start on Sunday
    const startDay = monthStart.getDay();
    const paddedDays = [];

    for (let i = 0; i < startDay; i++) {
        const paddingDate = new Date(monthStart);
        paddingDate.setDate(paddingDate.getDate() - (startDay - i));
        paddedDays.push(paddingDate);
    }

    const allDays = [...paddedDays, ...calendarDays];

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#06048D]"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-4">
            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                    {format(currentDate, 'MMMM yyyy')}
                </h3>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                        className="p-2 hover:bg-gray-100 rounded-md"
                    >
                        ←
                    </button>
                    <button
                        onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                        className="p-2 hover:bg-gray-100 rounded-md"
                    >
                        →
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <div className="text-sm font-medium mb-2">Legend:</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {Object.entries(COLLABORATION_TYPE_LABELS).map(([type, label]) => (
                        <div key={type} className="flex items-center space-x-1">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: COLLABORATION_TYPE_COLORS[type as keyof typeof COLLABORATION_TYPE_COLORS] }}
                            />
                            <span>{label}</span>
                        </div>
                    ))}
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-500 rounded" />
                        <span>Blocked</span>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 bg-gray-100 text-center text-sm font-medium border-b border-gray-200">
                        {day}
                    </div>
                ))}

                {/* Calendar Days */}
                {allDays.map(date => renderCalendarDay(date))}
            </div>

            {/* Selected Date Details */}
            {selectedDate && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <h4 className="font-medium mb-2">
                        {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                    </h4>
                    {(() => {
                        const dayData = calendarData.find(day => day.date === selectedDate);
                        if (!dayData) return <p className="text-sm text-gray-600">No data available</p>;

                        if (dayData.status === 'blocked') {
                            return (
                                <div className="text-sm">
                                    <span className="text-red-600 font-medium">Unavailable</span>
                                    {dayData.blocked_reason && (
                                        <p className="text-gray-600 mt-1">{dayData.blocked_reason}</p>
                                    )}
                                </div>
                            );
                        }

                        if (dayData.collaboration_types.length === 0) {
                            return <p className="text-sm text-gray-600">No collaboration types set for this date</p>;
                        }

                        return (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-green-600">Available collaboration types:</p>
                                {dayData.collaboration_types.map((collab, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: COLLABORATION_TYPE_COLORS[collab.type as keyof typeof COLLABORATION_TYPE_COLORS] }}
                                            />
                                            <span>{COLLABORATION_TYPE_LABELS[collab.type as keyof typeof COLLABORATION_TYPE_LABELS]}</span>
                                        </div>
                                        {showPricing && collab.amount > 0 && (
                                            <span className="font-medium">${collab.amount}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
} 
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';

interface CollaborationType {
    type: string;
    amount: number;
    description?: string;
}

interface CollaborationSchedule {
    default_weekly: { [dayOfWeek: string]: CollaborationType[] };
    date_overrides: { [date: string]: CollaborationType[] };
}

interface CollaborationScheduleManagerProps {
    venueId: number;
}

const COLLABORATION_TYPES = [
    { value: 'open_venue', label: 'Open Venue', color: '#22c55e' },
    { value: 'flat', label: 'Flat Fee', color: '#3b82f6' },
    { value: 'minimum_spend', label: 'Minimum Spend', color: '#f97316' },
    { value: 'no_minimum_spend', label: 'No Minimum Spend', color: '#6b7280' },
    { value: 'revenue_share', label: 'Revenue Share', color: '#8b5cf6' }
];

const DAYS_OF_WEEK = [
    { value: '0', label: 'Sunday' },
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' }
];

export default function CollaborationScheduleManager({ venueId }: CollaborationScheduleManagerProps) {
    const [schedule, setSchedule] = useState<CollaborationSchedule>({
        default_weekly: {},
        date_overrides: {}
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedDay, setSelectedDay] = useState<string>('1'); // Monday
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [editMode, setEditMode] = useState<'weekly' | 'date'>('weekly');
    const { showToast } = useToast();

    // Load existing schedule
    useEffect(() => {
        fetchSchedule();
    }, [venueId]);

    const fetchSchedule = async () => {
        try {
            const response = await fetch(`/api/venues/${venueId}/collaboration-schedule`);
            const data = await response.json();

            if (data.success) {
                setSchedule(data.schedule);
            }
        } catch (error) {
            console.error('Error fetching schedule:', error);
            showToast('Failed to load collaboration schedule', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const saveSchedule = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/venues/${venueId}/collaboration-schedule`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ schedule }),
            });

            const data = await response.json();

            if (data.success) {
                showToast('Collaboration schedule saved successfully', 'success');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error saving schedule:', error);
            showToast('Failed to save collaboration schedule', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const getCurrentRules = (): CollaborationType[] => {
        if (editMode === 'date' && selectedDate) {
            return schedule.date_overrides[selectedDate] || [];
        } else if (editMode === 'weekly') {
            return schedule.default_weekly[selectedDay] || [];
        }
        return [];
    };

    const updateCurrentRules = (newRules: CollaborationType[]) => {
        const newSchedule = { ...schedule };

        if (editMode === 'date' && selectedDate) {
            newSchedule.date_overrides[selectedDate] = newRules;
        } else if (editMode === 'weekly') {
            newSchedule.default_weekly[selectedDay] = newRules;
        }

        setSchedule(newSchedule);
    };

    const addCollaborationType = (type: string) => {
        const currentRules = getCurrentRules();

        // Check if type already exists
        if (currentRules.some(rule => rule.type === type)) {
            showToast('This collaboration type is already added', 'error');
            return;
        }

        // Check for conflicting types (minimum_spend vs no_minimum_spend)
        if (type === 'minimum_spend' && currentRules.some(rule => rule.type === 'no_minimum_spend')) {
            showToast('Cannot add minimum spend when no minimum spend is already set', 'error');
            return;
        }
        if (type === 'no_minimum_spend' && currentRules.some(rule => rule.type === 'minimum_spend')) {
            showToast('Cannot add no minimum spend when minimum spend is already set', 'error');
            return;
        }

        const newRule: CollaborationType = {
            type,
            amount: type === 'open_venue' || type === 'no_minimum_spend' ? 0 : 100,
            description: ''
        };

        updateCurrentRules([...currentRules, newRule]);
    };

    const updateCollaborationType = (index: number, field: keyof CollaborationType, value: string | number) => {
        const currentRules = getCurrentRules();
        const updatedRules = [...currentRules];
        updatedRules[index] = { ...updatedRules[index], [field]: value };
        updateCurrentRules(updatedRules);
    };

    const removeCollaborationType = (index: number) => {
        const currentRules = getCurrentRules();
        const updatedRules = currentRules.filter((_, i) => i !== index);
        updateCurrentRules(updatedRules);
    };

    const clearDateOverride = () => {
        if (selectedDate && schedule.date_overrides[selectedDate]) {
            const newSchedule = { ...schedule };
            delete newSchedule.date_overrides[selectedDate];
            setSchedule(newSchedule);
            showToast('Date override cleared', 'success');
        }
    };

    const getCollaborationTypeColor = (type: string) => {
        return COLLABORATION_TYPES.find(ct => ct.value === type)?.color || '#6b7280';
    };

    const getCollaborationTypeLabel = (type: string) => {
        return COLLABORATION_TYPES.find(ct => ct.value === type)?.label || type;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#06048D]"></div>
            </div>
        );
    }

    const currentRules = getCurrentRules();

    return (
        <div className="bg-white rounded-lg shadow-md p-4">
            <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Collaboration Schedule</h3>
                <p className="text-gray-600 text-sm">
                    Set which collaboration types are available on different days, along with pricing.
                </p>
            </div>

            {/* Mode Toggle */}
            <div className="mb-6">
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setEditMode('weekly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${editMode === 'weekly'
                            ? 'bg-white text-[#06048D] shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        Weekly Defaults
                    </button>
                    <button
                        onClick={() => setEditMode('date')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${editMode === 'date'
                            ? 'bg-white text-[#06048D] shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        Date Overrides
                    </button>
                </div>
            </div>

            {/* Day/Date Selector */}
            <div className="mb-6">
                {editMode === 'weekly' ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Day of Week
                        </label>
                        <select
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(e.target.value)}
                            className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {DAYS_OF_WEEK.map(day => (
                                <option key={day.value} value={day.value}>
                                    {day.label}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Specific Date
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {selectedDate && schedule.date_overrides[selectedDate] && (
                                <button
                                    onClick={clearDateOverride}
                                    className="px-3 py-2 text-sm text-red-600 hover:text-red-800"
                                >
                                    Clear Override
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Current Rules Display */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">
                        {editMode === 'weekly'
                            ? `${DAYS_OF_WEEK.find(d => d.value === selectedDay)?.label} Rules`
                            : selectedDate
                                ? `Rules for ${selectedDate}`
                                : 'Select a date to edit'
                        }
                    </h4>
                    {(editMode === 'weekly' || selectedDate) && (
                        <div className="relative">
                            <select
                                onChange={(e) => {
                                    if (e.target.value) {
                                        addCollaborationType(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">+ Add Collaboration Type</option>
                                {COLLABORATION_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {currentRules.length === 0 ? (
                    <div className="text-gray-500 text-sm p-4 border border-gray-200 rounded-md">
                        {editMode === 'weekly' || selectedDate
                            ? 'No collaboration types set. Add one using the dropdown above.'
                            : 'Select a date to set specific rules.'
                        }
                    </div>
                ) : (
                    <div className="space-y-3">
                        {currentRules.map((rule, index) => (
                            <div key={index} className="border border-gray-200 rounded-md p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: getCollaborationTypeColor(rule.type) }}
                                        />
                                        <span className="font-medium">{getCollaborationTypeLabel(rule.type)}</span>
                                    </div>
                                    <button
                                        onClick={() => removeCollaborationType(index)}
                                        className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                        Remove
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Amount ($)
                                        </label>
                                        <input
                                            type="number"
                                            value={rule.amount}
                                            onChange={(e) => updateCollaborationType(index, 'amount', Number(e.target.value))}
                                            disabled={rule.type === 'open_venue' || rule.type === 'no_minimum_spend'}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Description (optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={rule.description || ''}
                                            onChange={(e) => updateCollaborationType(index, 'description', e.target.value)}
                                            placeholder="e.g., Weekend premium"
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={saveSchedule}
                    disabled={isSaving}
                    className="px-6 py-2 bg-[#06048D] text-white rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? 'Saving...' : 'Save Schedule'}
                </button>
            </div>
        </div>
    );
} 
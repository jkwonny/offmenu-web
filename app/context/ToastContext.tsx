'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (message: string, type: ToastType) => void;
    hideToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [nextId, setNextId] = useState(1);

    const showToast = useCallback((message: string, type: ToastType) => {
        const id = nextId;
        setNextId(prevId => prevId + 1);

        const newToast = { id, message, type };
        setToasts(prevToasts => [...prevToasts, newToast]);

        // Auto-dismiss toast after 5 seconds
        setTimeout(() => {
            hideToast(id);
        }, 5000);
    }, [nextId]);

    const hideToast = useCallback((id: number) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`px-4 py-3 rounded-md shadow-md flex items-center justify-between max-w-xs animate-fade-in-up ${toast.type === 'success' ? 'bg-green-100 text-green-800' :
                                toast.type === 'error' ? 'bg-red-100 text-red-800' :
                                    toast.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-blue-100 text-blue-800'
                            }`}
                    >
                        <p className="text-sm">{toast.message}</p>
                        <button
                            onClick={() => hideToast(toast.id)}
                            className="ml-4 text-gray-500 hover:text-gray-700"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
} 
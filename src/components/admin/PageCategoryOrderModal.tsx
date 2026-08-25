"use client";

import React, { useState, useEffect } from 'react';
import { X, Save, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { useAdminTheme } from './AdminThemeProvider';
import { PageCategory } from '@/types/supabase';

interface PageCategoryOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: PageCategory[];
    onUpdate: (updatedCategories: PageCategory[]) => Promise<void>;
}

export default function PageCategoryOrderModal({
    isOpen,
    onClose,
    categories,
    onUpdate
}: PageCategoryOrderModalProps) {
    const { theme } = useAdminTheme();
    const [orderedCategories, setOrderedCategories] = useState<PageCategory[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize categories based on existing order
    useEffect(() => {
        if (!categories) return;

        // Sort by orderIndex
        const sorted = [...categories].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        setOrderedCategories(sorted);
    }, [categories, isOpen]);

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newCategories = [...orderedCategories];
        if (direction === 'up') {
            if (index === 0) return;
            [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];
        } else {
            if (index === newCategories.length - 1) return;
            [newCategories[index + 1], newCategories[index]] = [newCategories[index], newCategories[index + 1]];
        }

        // Update order indices locally for display
        // The actual persistence will happen in handleSave where we assign new indices
        setOrderedCategories(newCategories);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Assign new order indices
            const updatedCategories = orderedCategories.map((cat, index) => ({
                ...cat,
                orderIndex: index
            }));

            await onUpdate(updatedCategories);
            onClose();
        } catch (error) {
 console.error("Failed to save order", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Reorder Program Types</h3>
                        <p className="text-sm text-slate-500">Arrange how program types appear in selections</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {orderedCategories.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No program types found.</p>
                    ) : (
                        <div className="space-y-2">
                            {orderedCategories.map((category, index) => (
                                <div
                                    key={category.id}
                                    className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg group hover:border-violet-200 transition-colors"
                                >
                                    <div className="text-slate-400 cursor-grab">
                                        <GripVertical className="w-5 h-5" />
                                    </div>
                                    <span className="flex-1 font-medium text-slate-700">{category.name}</span>

                                    <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => moveItem(index, 'up')}
                                            disabled={index === 0}
                                            className="p-1.5 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                                            title="Move Up"
                                        >
                                            <ArrowUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => moveItem(index, 'down')}
                                            disabled={index === orderedCategories.length - 1}
                                            className="p-1.5 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                                            title="Move Down"
                                        >
                                            <ArrowDown className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex-1 px-4 py-2.5 ${theme.primary} text-white font-medium rounded-lg ${theme.primaryHover} shadow-md shadow-violet-200 transition-all flex items-center justify-center gap-2`}
                    >
                        {isSaving ? (
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Order
                    </button>
                </div>
            </div>
        </div>
    );
}

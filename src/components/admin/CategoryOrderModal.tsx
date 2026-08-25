"use client";

import React, { useState, useEffect } from 'react';
import { X, Save, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { PraiseNight, PraiseNightSong } from '../../types/supabase';
import { useAdminTheme } from './AdminThemeProvider';

interface CategoryOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    praiseNight: PraiseNight | null;
    songs: PraiseNightSong[];
    onUpdate: (pageId: string, categoryOrder: string[]) => Promise<void>;
}

export default function CategoryOrderModal({
    isOpen,
    onClose,
    praiseNight,
    songs,
    onUpdate
}: CategoryOrderModalProps) {
    const { theme } = useAdminTheme();
    const [categories, setCategories] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize categories based on songs and existing order
    useEffect(() => {
        if (!praiseNight) return;

        // 1. Get all unique categories from songs
        const songCategories = Array.from(new Set(songs.map(s => s.category).filter((c): c is string => Boolean(c))));

        // 2. Get existing order
        const existingOrder = praiseNight.categoryOrder || [];

        // 3. Merge: Start with existing order, then append any new song categories not in the list
        const merged = [...existingOrder];

        songCategories.forEach(cat => {
            if (!merged.includes(cat)) {
                merged.push(cat);
            }
        });

        setCategories(merged);
    }, [praiseNight, songs, isOpen]);

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newCategories = [...categories];
        if (direction === 'up') {
            if (index === 0) return;
            [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];
        } else {
            if (index === newCategories.length - 1) return;
            [newCategories[index + 1], newCategories[index]] = [newCategories[index], newCategories[index + 1]];
        }
        setCategories(newCategories);
    };

    const handleSave = async () => {
        if (!praiseNight) return;
        setIsSaving(true);
        try {
            await onUpdate(praiseNight.id, categories);
            onClose();
        } catch (error) {
            console.error("Failed to save order", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !praiseNight) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Reorder Categories</h3>
                        <p className="text-sm text-slate-500">Arrange how categories appear in the app</p>
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
                    {categories.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No categories found for this page.</p>
                    ) : (
                        <div className="space-y-2">
                            {categories.map((category, index) => (
                                <div
                                    key={category}
                                    className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg group hover:border-violet-200 transition-colors"
                                >
                                    <div className="text-slate-400 cursor-grab">
                                        <GripVertical className="w-5 h-5" />
                                    </div>
                                    <span className="flex-1 font-medium text-slate-700">{category}</span>

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
                                            disabled={index === categories.length - 1}
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

                    <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
                        <strong>Note:</strong> Active categories (with "Live" songs) will always appear first in the app, regardless of this order.
                    </div>
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

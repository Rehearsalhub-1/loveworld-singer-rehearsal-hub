"use client";

import React from 'react'
import { Loader2, CheckCircle } from 'lucide-react'

type ProfileSaveButtonProps = {
    isEditing: boolean
    isSaving: boolean
    saveStage: string
    saveProgress: number
    saveMessage: string
    themeColor?: string
    onSave: () => void
    onCancel: () => void
}

const adjustColor = (color: string, amount: number) => {
    const hex = color.replace('#', '')
    const num = parseInt(hex, 16)
    const r = Math.max(0, Math.min(255, (num >> 16) + amount))
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export function ProfileSaveButton({
    isEditing,
    isSaving,
    saveStage,
    saveProgress,
    saveMessage,
    themeColor = '#9333ea',
    onSave,
    onCancel
}: ProfileSaveButtonProps) {
    if (!isEditing) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50 px-4 py-3 safe-area-bottom">
            <div className="max-w-2xl mx-auto flex items-center gap-3">
                {/* Cancel Button */}
                <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Cancel
                </button>

                {/* Save Button */}
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 text-white rounded-xl font-semibold hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    style={{ backgroundColor: themeColor }}
                    onMouseEnter={(e) => {
                        if (!isSaving) {
                            e.currentTarget.style.backgroundColor = adjustColor(themeColor, -20)
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isSaving) {
                            e.currentTarget.style.backgroundColor = themeColor
                        }
                    }}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            {saveStage || 'Saving...'}
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Save Changes
                        </>
                    )}
                </button>
            </div>

            {/* Save Progress Bar */}
            {isSaving && saveProgress > 0 && (
                <div className="max-w-2xl mx-auto mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                            className="h-1.5 rounded-full transition-all duration-300"
                            style={{
                                width: `${saveProgress}%`,
                                backgroundColor: themeColor
                            }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Save Message */}
            {saveMessage && (
                <div className="max-w-2xl mx-auto mt-2">
                    <p className={`text-sm text-center font-medium ${saveMessage.startsWith('') ? 'text-green-600' : 'text-red-600'}`}>
                        {saveMessage}
                    </p>
                </div>
            )}
        </div>
    )
}

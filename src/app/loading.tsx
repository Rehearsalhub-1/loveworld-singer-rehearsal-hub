"use client";

import CustomLoader from '@/components/CustomLoader';

export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-white/80 backdrop-blur-sm">
            <CustomLoader message="Loading..." />
        </div>
    )
}
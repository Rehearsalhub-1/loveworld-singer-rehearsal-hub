
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
    return (
        <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-slate-50">
            <div className="w-full h-full flex flex-col">
                {/* Fixed Header Skeleton */}
                <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 w-full h-[72px]">
                    <div className="w-full max-w-2xl mx-auto h-full flex items-center justify-between px-4">
                        {/* Left: Profile & Zone */}
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <Skeleton className="w-32 h-8 rounded-lg" />
                        </div>
                        {/* Right: Search & Logo */}
                        <div className="flex items-center gap-2">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <Skeleton className="w-10 h-10 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* content-bottom-safe equivalent */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="w-full max-w-2xl mx-auto px-4 py-6">

                        {/* Hero Banner Skeleton */}
                        <div className="py-6 pt-20">
                            <Skeleton className="w-full h-[30vh] rounded-3xl shadow-sm" />
                        </div>

                        {/* Title Skeleton */}
                        <div className="text-center py-6 flex justify-center">
                            <Skeleton className="h-8 w-3/4 rounded-md" />
                        </div>

                        {/* Features Grid Skeleton */}
                        <div className="pb-4">
                            <div className="grid grid-cols-3 gap-2">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="flex flex-col items-center p-3 bg-white/70 backdrop-blur-sm rounded-2xl border-0 ring-1 ring-black/5 h-[88px] w-full">
                                        <Skeleton className="w-8 h-8 rounded-lg mb-2" />
                                        <Skeleton className="h-3 w-16 rounded-md" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* FAQ/About Skeleton */}
                        <div className="space-y-4 pb-6">
                            <Skeleton className="h-6 w-24 rounded-md mb-2" />
                            <Skeleton className="w-full h-14 rounded-2xl" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

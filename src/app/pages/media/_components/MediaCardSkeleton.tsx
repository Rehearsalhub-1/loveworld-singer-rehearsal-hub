export default function MediaCardSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            {/* Thumbnail Skeleton */}
            <div className="relative w-full aspect-video rounded-2xl bg-slate-900 animate-pulse overflow-hidden border border-white/5 shadow-sm" />

            <div className="flex gap-3 px-1">
                {/* Avatar Skeleton */}
                <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse flex-shrink-0" />

                <div className="flex-1 flex flex-col gap-2">
                    {/* Title Skeleton */}
                    <div className="h-4 bg-slate-800 rounded animate-pulse w-[85%]" />
                    <div className="h-4 bg-slate-800 rounded animate-pulse w-[50%]" />

                    {/* Meta Skeleton */}
                    <div className="h-3 bg-slate-900 rounded animate-pulse w-[35%] mt-1" />
                </div>
            </div>
        </div>
    )
}

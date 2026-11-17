import React from 'react';
import Skeleton from '../../shared/components/Skeleton';

/**
 * Placeholder cards for the My Events grid, matching the real card's shape so
 * the grid does not reflow when the data lands.
 */
const EventCardsSkeleton = ({ count = 9 }) => (
    <>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                {/* Banner */}
                <Skeleton rounded="rounded-none" className="w-full aspect-[16/9]" />

                <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton rounded="rounded-lg" className="h-7 w-7 shrink-0" />
                    </div>

                    <div className="flex items-center gap-2">
                        <Skeleton rounded="rounded-full" className="h-5 w-20" />
                        <Skeleton rounded="rounded" className="h-5 w-16" />
                    </div>

                    <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-1.5">
                            <Skeleton rounded="rounded-sm" className="h-3.5 w-3.5" />
                            <Skeleton className="h-3.5 w-28" />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Skeleton rounded="rounded-sm" className="h-3.5 w-3.5" />
                            <Skeleton className="h-3.5 w-36" />
                        </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3.5 w-16" />
                    </div>
                </div>
            </div>
        ))}
    </>
);

export default EventCardsSkeleton;

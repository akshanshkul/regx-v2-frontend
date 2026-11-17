import React from 'react';
import { ChevronRight } from 'lucide-react';
import Skeleton from '../../shared/components/Skeleton';

/**
 * Mirrors the real EventDetails overview layout so the page does not jump when
 * the data lands.
 */
const EventDetailsSkeleton = () => (
    <div className="space-y-6 pb-12" role="status" aria-busy="true" aria-label="Loading event details">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
            <Skeleton className="h-4 w-28" />
            <ChevronRight className="w-4 h-4 text-gray-200" />
            <Skeleton className="h-4 w-40" />
        </div>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <Skeleton
                rounded="rounded-none"
                className="w-full aspect-[4/1] md:aspect-[5/1] lg:aspect-[6/1]"
            />

            <div className="p-6 pt-0 relative flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex flex-col md:flex-row gap-5 w-full">
                    {/* Logo */}
                    <Skeleton
                        rounded="rounded-xl"
                        className="w-24 h-24 border border-gray-200 -mt-12 relative z-10 shrink-0"
                    />

                    <div className="mt-3 w-full">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <Skeleton className="h-7 w-64" />
                            <Skeleton className="h-5 w-16" />
                        </div>

                        <Skeleton className="h-4 w-80 max-w-full mb-4" />

                        <div className="flex flex-wrap items-center gap-3">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 pb-6 flex items-center gap-3 border-t border-gray-100 pt-4">
                <div className="hidden md:flex gap-3 ml-auto">
                    <Skeleton rounded="rounded-lg" className="h-10 w-24" />
                    <Skeleton rounded="rounded-lg" className="h-10 w-32" />
                </div>
            </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
            <nav className="flex gap-6">
                {['w-16', 'w-12', 'w-16'].map((width, i) => (
                    <div key={i} className="py-3 px-1">
                        <Skeleton className={`h-4 ${width}`} />
                    </div>
                ))}
            </nav>
        </div>

        {/* Overview content */}
        <div className="py-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {/* About */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="border-b border-gray-100 pb-2 mb-4">
                        <Skeleton className="h-5 w-40" />
                    </div>
                    <div className="space-y-2.5">
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-11/12" />
                        <Skeleton className="h-3.5 w-2/3" />
                    </div>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                            <Skeleton rounded="rounded-xl" className="w-12 h-12 shrink-0" />
                            <div className="space-y-2 w-full">
                                <Skeleton className="h-3.5 w-24" />
                                <Skeleton className="h-6 w-16" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
                {/* Venue */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="border-b border-gray-100 pb-2">
                        <Skeleton className="h-5 w-40" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-1/2" />
                    </div>
                    <Skeleton className="h-4 w-44" />
                </div>

                {/* Organiser */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="border-b border-gray-100 pb-2">
                        <Skeleton className="h-5 w-28" />
                    </div>
                    <Skeleton className="h-4 w-40" />
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-48" />
                        <Skeleton className="h-3.5 w-36" />
                    </div>
                    <div className="pt-3 border-t border-gray-100 space-y-1.5">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-4 w-44" />
                    </div>
                </div>

                {/* Support */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="border-b border-gray-100 pb-2">
                        <Skeleton className="h-5 w-36" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-48" />
                        <Skeleton className="h-3.5 w-36" />
                    </div>
                </div>

                {/* System info */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 space-y-4">
                    <div className="border-b border-gray-200 pb-2">
                        <Skeleton className="h-5 w-32" />
                    </div>
                    <div className="space-y-3">
                        {[0, 1].map((i) => (
                            <div key={i} className="space-y-1.5">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-4 w-40" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <span className="sr-only">Loading event details…</span>
    </div>
);

export default EventDetailsSkeleton;

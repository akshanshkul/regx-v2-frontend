import React from 'react';
import Skeleton from '../../shared/components/Skeleton';

const Field = ({ label = 'w-28', control = 'h-11' }) => (
    <div>
        <Skeleton className={`h-3.5 ${label} mb-2`} />
        <Skeleton rounded="rounded-lg" className={`${control} w-full`} />
    </div>
);

/**
 * Stand-in for the create/edit event form body, shown while an existing event
 * is being fetched. Mirrors the real two-column layout so the form does not
 * jump into place once the data arrives.
 *
 * The page header is deliberately not included — its title and subtitle are
 * known the moment the route resolves, so the real one renders immediately.
 */
const EventFormSkeleton = () => (
    <div role="status" aria-busy="true" aria-label="Loading event">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="xl:col-span-2 space-y-6">
                {/* Basic Information */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                        <Skeleton rounded="rounded" className="w-5 h-5" />
                        <Skeleton className="h-5 w-40" />
                    </div>

                    <Field label="w-28" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="w-28" />
                        <Field label="w-20" />
                    </div>

                    <Field label="w-56" />

                    <div>
                        <Skeleton className="h-3.5 w-40 mb-2" />
                        <Skeleton rounded="rounded-lg" className="h-28 w-full" />
                    </div>
                </div>

                {/* Date & Location */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                        <Skeleton rounded="rounded" className="w-5 h-5" />
                        <Skeleton className="h-5 w-36" />
                    </div>

                    <Field label="w-24" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                        <Field label="w-24" />
                        <Field label="w-28" />
                        <Field label="w-16" />
                        <Field label="w-20" />
                    </div>

                    <div>
                        <Skeleton className="h-3.5 w-36 mb-2" />
                        <Skeleton rounded="rounded-xl" className="h-56 w-full" />
                    </div>
                </div>

                {/* Organiser */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                        <Skeleton rounded="rounded" className="w-5 h-5" />
                        <Skeleton className="h-5 w-24" />
                    </div>

                    <Field label="w-32" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="w-16" />
                        <Field label="w-16" />
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <Skeleton className="h-4 w-28 mb-4 mt-2" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Field label="w-36" />
                            <Field label="w-40" />
                        </div>
                    </div>
                </div>

                {/* Attendee support */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                        <Skeleton rounded="rounded" className="w-5 h-5" />
                        <Skeleton className="h-5 w-36" />
                    </div>

                    <Field label="w-28" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="w-32" />
                        <Field label="w-24" />
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
                {/* Publish Status */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="border-b border-gray-100 pb-2 mb-4">
                        <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton rounded="rounded-lg" className="h-11 w-full" />
                </div>

                {/* Event Media */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="border-b border-gray-100 pb-2 mb-4">
                        <Skeleton className="h-5 w-28" />
                    </div>

                    <div className="space-y-5">
                        <div>
                            <Skeleton className="h-3.5 w-20 mb-2" />
                            <Skeleton rounded="rounded-xl" className="h-32 w-full" />
                        </div>
                        <div>
                            <Skeleton className="h-3.5 w-24 mb-2" />
                            <Skeleton rounded="rounded-xl" className="h-32 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <span className="sr-only">Loading event…</span>
    </div>
);

export default EventFormSkeleton;

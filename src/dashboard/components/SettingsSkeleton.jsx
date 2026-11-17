import React from 'react';
import Skeleton from '../../shared/components/Skeleton';

/**
 * Body-only skeleton for the settings page. The page heading is known as soon
 * as the route resolves, so the real one renders straight away.
 */
const SettingsSkeleton = () => (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading settings">
        {[0, 1].map((card) => (
            <div key={card} className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                    <Skeleton rounded="rounded" className="w-5 h-5" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-3 w-64 max-w-full" />
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {[0, 1, 2].map((row) => (
                        <div key={row} className="flex items-center justify-between gap-4">
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-72 max-w-full" />
                            </div>
                            <Skeleton rounded="rounded-full" className="h-6 w-11 shrink-0" />
                        </div>
                    ))}
                </div>
            </div>
        ))}

        <span className="sr-only">Loading settings…</span>
    </div>
);

export default SettingsSkeleton;

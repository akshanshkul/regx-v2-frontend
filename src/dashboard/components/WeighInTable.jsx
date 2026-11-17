import React from 'react';
import { Pencil, Scale, UserRound } from 'lucide-react';

const statusClasses = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
};

const WeighInTable = ({ registrations = [], onStart, loading = false }) => {
    if (loading) {
        return (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 space-y-3">
                    {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (!registrations.length) {
        return (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
                <div className="mx-auto w-10 h-10 rounded-xl bg-gray-100 grid place-items-center">
                    <Scale className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-gray-900">
                    No sport registrations found
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                    Only registrations from sport-category forms appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Participant
                            </th>
                            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Sport / Form
                            </th>
                            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Category
                            </th>
                            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Weight
                            </th>
                            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Status
                            </th>
                            <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Action
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                        {registrations.map((registration) => {
                            const completed = registration.weighInStatus === 'completed';

                            return (
                                <tr key={registration.id || registration.public_id} className="hover:bg-gray-50/70">
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 grid place-items-center shrink-0">
                                                <UserRound className="w-4 h-4 text-gray-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {registration.participantName || registration.name || 'Unnamed participant'}
                                                </p>
                                                {registration.email && (
                                                    <p className="text-xs text-gray-400 truncate">
                                                        {registration.email}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-5 py-3.5">
                                        <p className="text-sm text-gray-700">
                                            {registration.formName || registration.sport || '—'}
                                        </p>
                                    </td>

                                    <td className="px-5 py-3.5">
                                        <span className="text-sm font-medium text-gray-700">
                                            {registration.category || registration.sportCategory || '—'}
                                        </span>
                                    </td>

                                    <td className="px-5 py-3.5">
                                        <span className="text-sm font-semibold text-gray-900">
                                            {registration.weight != null && registration.weight !== ''
                                                ? `${registration.weight} kg`
                                                : '—'}
                                        </span>
                                    </td>

                                    <td className="px-5 py-3.5">
                                        <span className={`inline-flex px-2 py-1 rounded-md border text-[11px] font-semibold ${
                                            completed ? statusClasses.completed : statusClasses.pending
                                        }`}>
                                            {completed ? 'Completed' : 'Pending'}
                                        </span>
                                    </td>

                                    <td className="px-5 py-3.5 text-right">
                                        <button
                                            type="button"
                                            onClick={() => onStart(registration)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-regx-orange text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                                        >
                                            {completed ? <Pencil className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5" />}
                                            {completed ? 'Edit' : 'Start Weigh-in'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default WeighInTable;

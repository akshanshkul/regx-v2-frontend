import React, { useEffect, useState } from 'react';
import { Loader2, Scale, X } from 'lucide-react';

const WeighInModal = ({ registration, open, onClose, onSave, saving = false }) => {
    const [weight, setWeight] = useState('');

    useEffect(() => {
        if (open) {
            setWeight(
                registration?.weight !== undefined && registration?.weight !== null
                    ? String(registration.weight)
                    : ''
            );
        }
    }, [open, registration]);

    if (!open || !registration) return null;

    const submit = async (event) => {
        event.preventDefault();

        const numericWeight = Number(weight);
        if (!weight || Number.isNaN(numericWeight) || numericWeight <= 0) return;

        await onSave({
            ...registration,
            weight: numericWeight,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />

            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">
                            {registration.weight != null ? 'Edit Weigh-in' : 'Start Weigh-in'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Record the participant's actual weight.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="w-8 h-8 rounded-lg grid place-items-center text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={submit} className="p-5">
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                        <p className="text-sm font-semibold text-gray-900">
                            {registration.participantName || registration.name || 'Unnamed participant'}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span>{registration.formName || registration.sport || 'Sport'}</span>
                            <span>•</span>
                            <span>{registration.category || registration.sportCategory || 'Category not specified'}</span>
                        </div>
                    </div>

                    <label className="block mt-5">
                        <span className="block text-xs font-semibold text-gray-700 mb-2">
                            Weight
                        </span>

                        <div className="relative">
                            <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={weight}
                                onChange={(event) => setWeight(event.target.value)}
                                placeholder="Enter weight"
                                autoFocus
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-14 text-sm text-gray-900 outline-none focus:border-regx-orange focus:ring-2 focus:ring-orange-100"
                                required
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                                kg
                            </span>
                        </div>
                    </label>

                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving || !weight}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Scale className="w-4 h-4" />
                            )}
                            Save Weight
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WeighInModal;

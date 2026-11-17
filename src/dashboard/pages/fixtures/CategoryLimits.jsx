import React, { useEffect, useState } from 'react';
import { ListOrdered, Loader2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { messageOf } from './fixtureData';

/**
 * How many may compete in each category. Places go first come, first served
 * among paid (and approved) registrations; the rest wait in order, and the
 * first waiting moves in by itself when someone with a place drops out.
 */
const CategoryLimits = ({ formId, onClose, onSaved }) => {
    const [state, setState] = useState({ loading: true, error: null, categories: [] });
    const [draft, setDraft] = useState({});
    const [saving, setSaving] = useState(false);

    const apply = (payload) => {
        setState({ loading: false, error: null, categories: payload.categories ?? [] });
        setDraft(Object.fromEntries((payload.categories ?? []).map((c) => [c.category, c.limit ?? ''])));
    };

    useEffect(() => {
        api.get(`/forms/${formId}/fixture/limits`)
            .then(apply)
            .catch((error) => setState({ loading: false, error: messageOf(error, 'Could not load the categories'), categories: [] }));
    }, [formId]);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const save = async () => {
        setSaving(true);

        try {
            const limits = Object.fromEntries(Object.entries(draft).filter(([, v]) => Number(v) >= 1).map(([k, v]) => [k, Number(v)]));
            const payload = await api.put(`/forms/${formId}/fixture/limits`, { limits });
            apply(payload);
            toast.success('Limits saved');
            onSaved?.(payload.limits ?? {});
        } catch (error) {
            toast.error(messageOf(error, 'Could not save the limits'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8" role="dialog" aria-modal="true" aria-label="Category limits" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 text-regx-orange flex items-center justify-center shrink-0"><ListOrdered className="w-5 h-5" /></div>
                        <div>
                            <h2 className="font-bold text-gray-900 text-lg">Category limits & waitlist</h2>
                            <p className="text-xs text-gray-500">
                                Places go first come, first served among paid and approved registrations. The rest wait in order, and move in by themselves when someone with a place drops out. Leave a limit empty for no limit.
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close"><X className="w-5 h-5" /></button>
                </header>

                <div className="p-5 max-h-[68vh] overflow-y-auto">
                    {state.loading ? (
                        <div className="py-12 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
                    ) : state.error ? (
                        <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-4">{state.error}</p>
                    ) : state.categories.length === 0 ? (
                        <p className="py-10 text-center text-sm text-gray-500">No paid and approved registrations yet, so there are no categories to limit.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
                            {state.categories.map((c) => (
                                <li key={c.category} className="px-3 py-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{c.category}</p>
                                            <p className="text-xs text-gray-500">
                                                {c.registered} registered{c.limit ? ` · ${c.in} with a place` : ''}{c.waiting.length ? ` · ${c.waiting.length} waiting` : ''}
                                                {c.drawn && <span className="text-amber-700"> · already drawn — a new limit applies if it is redrawn</span>}
                                            </p>
                                        </div>
                                        <label className="flex items-center gap-2 text-xs text-gray-600">
                                            Limit
                                            <input
                                                type="number"
                                                min="1"
                                                value={draft[c.category] ?? ''}
                                                onChange={(e) => setDraft((d) => ({ ...d, [c.category]: e.target.value }))}
                                                placeholder="None"
                                                aria-label={`Limit for ${c.category}`}
                                                className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-center outline-none focus:border-regx-orange"
                                            />
                                        </label>
                                    </div>
                                    {c.waiting.length > 0 && (
                                        <ol className="mt-2 flex flex-wrap gap-1.5">
                                            {c.waiting.map((w, i) => (
                                                <li key={`${w.reference}-${i}`} className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] text-amber-800">
                                                    #{i + 1} {w.name} <span className="text-amber-500">{w.reference}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <footer className="flex justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white">Close</button>
                    <button type="button" onClick={save} disabled={saving || state.loading} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default CategoryLimits;

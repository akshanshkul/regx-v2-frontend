import React, { useEffect, useState } from 'react';
import { Flag, Hand, Loader2, Minus, Plus, Save, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { messageOf } from './fixtureData';

const MAX_LIMIT = 10;

/**
 * The form's foul rules: whether fouls are counted on matches, how many lose
 * a match (0 = never), and whether reaching that decides the match at once or
 * asks the desk first. Applies to every category of the form.
 */
const FoulSettings = ({ formId, onClose, onSaved }) => {
    const [draft, setDraft] = useState(null); // { enabled, limit, auto }
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get(`/forms/${formId}/fixture/fouls`)
            .then((payload) => setDraft(payload.fouls))
            .catch((e) => setError(messageOf(e, 'Could not load the foul settings')));
    }, [formId]);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const setLimit = (value) => setDraft((d) => ({ ...d, limit: Math.max(0, Math.min(MAX_LIMIT, Number(value) || 0)) }));

    const save = async () => {
        setSaving(true);

        try {
            const payload = await api.put(`/forms/${formId}/fixture/fouls`, draft);
            toast.success(payload.message || 'Foul settings saved');
            onSaved?.(payload.fouls);
            onClose();
        } catch (e) {
            toast.error(messageOf(e, 'Could not save the foul settings'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8"
                role="dialog"
                aria-modal="true"
                aria-label="Foul settings"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                            <Flag className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 text-lg">Foul settings</h2>
                            <p className="text-xs text-gray-500">Counting fouls on each match, for every category of this form.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </header>

                {!draft ? (
                    error ? (
                        <p className="m-5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-4">{error}</p>
                    ) : (
                        <div className="py-16 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
                    )
                ) : (
                    <div className="p-5 space-y-6">
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                            <span>
                                <span className="block text-sm font-semibold text-gray-800">Count fouls</span>
                                <span className="block text-xs text-gray-500">Adds a foul counter for each player on every match.</span>
                            </span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={draft.enabled}
                                onClick={() => setDraft((d) => ({ ...d, enabled: !d.enabled }))}
                                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${draft.enabled ? 'bg-regx-orange' : 'bg-gray-300'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${draft.enabled ? 'translate-x-5' : ''}`} />
                            </button>
                        </label>

                        <div className={draft.enabled ? 'space-y-6' : 'space-y-6 opacity-50 pointer-events-none'}>
                            <section>
                                <p className="text-sm font-semibold text-gray-800 mb-2">Fouls that lose the match</p>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setLimit(draft.limit - 1)} className="w-10 h-10 rounded-lg border border-gray-300 grid place-items-center hover:bg-gray-50" aria-label="One foul fewer">
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <input
                                        type="number"
                                        min={0}
                                        max={MAX_LIMIT}
                                        value={draft.limit}
                                        onChange={(e) => setLimit(e.target.value)}
                                        aria-label="Fouls that lose the match"
                                        className="w-20 h-10 text-center text-lg font-bold border border-gray-300 rounded-lg outline-none focus:border-regx-orange"
                                    />
                                    <button type="button" onClick={() => setLimit(draft.limit + 1)} className="w-10 h-10 rounded-lg border border-gray-300 grid place-items-center hover:bg-gray-50" aria-label="One foul more">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs text-gray-500 ml-1">
                                        {draft.limit === 0 ? 'Fouls are only counted, never decide a match' : `The ${ordinal(draft.limit)} foul loses the match`}
                                    </span>
                                </div>
                            </section>

                            {draft.limit > 0 && (
                                <section>
                                    <p className="text-sm font-semibold text-gray-800 mb-2">When a player reaches it</p>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {[
                                            [false, Hand, 'Ask first', 'You confirm, then the opponent is recorded as winner.'],
                                            [true, Zap, 'Record automatically', 'The opponent is recorded as winner at once. Clear result undoes it.'],
                                        ].map(([auto, Icon, title, text]) => (
                                            <button
                                                key={title}
                                                type="button"
                                                onClick={() => setDraft((d) => ({ ...d, auto }))}
                                                aria-pressed={draft.auto === auto}
                                                className={`text-left p-4 rounded-xl border-2 transition-colors ${
                                                    draft.auto === auto ? 'border-regx-orange bg-orange-50/50' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <span className="flex items-center gap-2 font-semibold text-gray-900">
                                                    <Icon className={`w-4 h-4 ${draft.auto === auto ? 'text-regx-orange' : 'text-gray-400'}`} />
                                                    {title}
                                                </span>
                                                <span className="block text-xs text-gray-500 mt-1">{text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                )}

                <footer className="flex items-center justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white">
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving || !draft}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                    </button>
                </footer>
            </div>
        </div>
    );
};

const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n] ?? 'th'}`;

export default FoulSettings;

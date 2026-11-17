import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Scale, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { messageOf } from './fixtureData';

/**
 * Before the draw: who weighed in outside the weight class they entered.
 *
 *   Too heavy        — heavier than the class allows; they must move up.
 *   Could go lighter — a lighter class fits; many rules let them stay.
 *
 * "Move" changes the entry to the class that fits. It is refused while the
 * category is drawn, so no draw holds a player in the wrong class.
 */
const WeighCheck = ({ formId, onClose, onChanged }) => {
    const [state, setState] = useState({ loading: true, error: null, data: null });
    const [busy, setBusy] = useState(null);

    useEffect(() => {
        api.get(`/forms/${formId}/fixture/weigh-check`)
            .then((data) => setState({ loading: false, error: null, data }))
            .catch((error) => setState({ loading: false, error: messageOf(error, 'Could not run the check'), data: null }));
    }, [formId]);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const move = async (row) => {
        if (!window.confirm(`Move ${row.name} (${row.weight} kg) from ${row.entered} to ${row.suggested}?`)) return;

        const key = `${row.submissionId}-${row.grid}-${row.row}`;
        setBusy(key);

        try {
            const data = await api.post(`/forms/${formId}/fixture/weigh-check/fix`, {
                submissionId: row.submissionId, grid: row.grid, row: row.row, column: row.column, value: row.suggestedValue,
            });
            setState({ loading: false, error: null, data });
            toast.success(`${row.name} moved to ${row.suggested}`);
            onChanged?.();
        } catch (error) {
            toast.error(messageOf(error, 'Could not move the entry'));
        } finally {
            setBusy(null);
        }
    };

    const rows = state.data?.mismatches ?? [];
    const over = rows.filter((r) => r.kind === 'over');
    const under = rows.filter((r) => r.kind === 'under');

    const list = (items, title, tone) => items.length > 0 && (
        <section>
            <h3 className={`text-xs font-bold tracking-wide mb-2 ${tone}`}>{title} · {items.length}</h3>
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
                {items.map((row) => {
                    const key = `${row.submissionId}-${row.grid}-${row.row}`;

                    return (
                        <li key={key} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 truncate">{row.name} <span className="font-normal text-gray-400">{row.reference}</span></p>
                                <p className="text-xs text-gray-500 truncate">{row.category}</p>
                            </div>
                            <span className="text-sm font-bold tabular-nums text-gray-900">{row.weight} kg</span>
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                                {row.entered} <ArrowRight className="w-3 h-3" /> <strong className="text-gray-900">{row.suggested ?? 'no class fits'}</strong>
                            </span>
                            {row.suggested && (
                                row.drawn ? (
                                    <span className="text-[11px] text-gray-500" title="Reset or redraw the category first">Category drawn</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => move(row)}
                                        disabled={busy !== null}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-regx-orange text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                                    >
                                        {busy === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Move
                                    </button>
                                )
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8" role="dialog" aria-modal="true" aria-label="Weigh-in check" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Scale className="w-5 h-5" /></div>
                        <div>
                            <h2 className="font-bold text-gray-900 text-lg">Weigh-in check</h2>
                            <p className="text-xs text-gray-500">
                                {state.data ? `${state.data.weighed} of ${state.data.total} weighed in. ` : ''}Entries whose weigh-in does not fit the weight class entered. Fix them before drawing the category.
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close"><X className="w-5 h-5" /></button>
                </header>

                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                    {state.loading ? (
                        <div className="py-12 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
                    ) : state.error ? (
                        <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-4">{state.error}</p>
                    ) : rows.length === 0 ? (
                        <p className="py-10 text-center text-sm text-gray-600 flex flex-col items-center gap-2">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                            Everyone weighed in fits the class they entered.
                        </p>
                    ) : (
                        <>
                            {list(over, 'TOO HEAVY — must move up', 'text-red-700')}
                            {list(under, 'COULD GO LIGHTER — a lighter class fits; moving is optional', 'text-amber-700')}
                        </>
                    )}
                    <p className="text-[11px] text-gray-400">
                        Classes are read from the weight options of the entry form (for example “55 kg” is up to 55 kg, “90+ kg” is over 90 kg). Only registrations that are weighed in, paid and approved are checked.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WeighCheck;

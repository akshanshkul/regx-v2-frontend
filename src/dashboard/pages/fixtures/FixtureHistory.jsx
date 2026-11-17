import React, { useEffect, useState } from 'react';
import {
    Flag, History, LayoutGrid, Loader2, Lock, Play, QrCode, RotateCcw, Shuffle, Trash2, Trophy, Undo2, UserRound, X,
} from 'lucide-react';
import api from '../../../services/api';
import { messageOf } from './fixtureData';
import { parseServerDate } from '../../../shared/utils/dates';

const ICONS = {
    started: Play,
    redrawn: Shuffle,
    reset: Trash2,
    completed: Lock,
    winner: Trophy,
    cleared: Undo2,
    fouls: Flag,
    table: LayoutGrid,
};

const TONES = {
    winner: 'bg-green-50 text-green-700',
    cleared: 'bg-amber-50 text-amber-700',
    reset: 'bg-red-50 text-red-700',
    redrawn: 'bg-amber-50 text-amber-700',
    fouls: 'bg-red-50 text-red-700',
    completed: 'bg-yellow-50 text-yellow-700',
};

const when = (value) => {
    const date = parseServerDate(value);

    return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

/**
 * Who changed what in the fixtures, newest first: draws started, redrawn,
 * reset or completed; results recorded (by hand, by scan or by a referee's
 * table link) or cleared; fouls; matches moved to a table.
 */
const FixtureHistory = ({ formId, category = null, onClose }) => {
    const [state, setState] = useState({ loading: true, error: null, entries: [] });

    const load = () => {
        setState((s) => ({ ...s, loading: true }));
        api.get(`/forms/${formId}/fixture/history`, { params: category ? { category } : {} })
            .then((payload) => setState({ loading: false, error: null, entries: payload.entries ?? [] }))
            .catch((error) => setState({ loading: false, error: messageOf(error, 'Could not load the history'), entries: [] }));
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(load, [formId, category]);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8"
                role="dialog"
                aria-modal="true"
                aria-label="Fixture history"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                            <History className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-bold text-gray-900 text-lg">History</h2>
                            <p className="text-xs text-gray-500 truncate">
                                {category ? `Every change to ${category}` : 'Every change to the draws and results of this form'}, newest first.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={load} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Refresh">
                            <RotateCcw className={`w-4 h-4 ${state.loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <div className="max-h-[70vh] overflow-y-auto">
                    {state.loading && state.entries.length === 0 ? (
                        <div className="py-16 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
                    ) : state.error ? (
                        <p className="m-5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-4">{state.error}</p>
                    ) : state.entries.length === 0 ? (
                        <p className="py-16 text-center text-sm text-gray-500">Nothing recorded yet.</p>
                    ) : (
                        <ol className="divide-y divide-gray-100">
                            {state.entries.map((entry) => {
                                const Icon = ICONS[entry.action] ?? History;
                                const ByIcon = entry.byType === 'scan' ? QrCode : UserRound;

                                return (
                                    <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
                                        <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${TONES[entry.action] ?? 'bg-gray-100 text-gray-600'}`}>
                                            <Icon className="w-4 h-4" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-gray-900">{entry.summary}</p>
                                            <p className="mt-0.5 text-xs text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                {!category && entry.category && <span className="font-medium text-gray-600">{entry.category}</span>}
                                                <span className="inline-flex items-center gap-1"><ByIcon className="w-3 h-3" /> {entry.by}</span>
                                                <span className="tabular-nums">{when(entry.at)}</span>
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FixtureHistory;

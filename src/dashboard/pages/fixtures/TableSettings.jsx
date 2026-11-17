import React, { useCallback, useEffect, useState } from 'react';
import { LayoutGrid, Loader2, Minus, Plus, RefreshCw, Save, Shuffle, ListOrdered, X, Swords } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { messageOf } from './fixtureData';

const REFRESH_SECONDS = 30;

/**
 * The hall's tables: how many there are, how matches reach them, and what is
 * on each one now.
 *
 *   Auto    — a free table takes the next waiting match, taking turns across
 *             categories, and never calls one person to two tables.
 *   Manual  — each category is given a table and plays there, one match at a
 *             time.
 *
 * A match keeps its table until its result is in; then the table moves on.
 * The public screen shows the same tables.
 */
/**
 * A link to one table's own screen: a monitor beside the table, or a stream
 * overlay in one of the TV styles and colours TableScreen offers.
 */
export const TableLinks = ({ publicUrl, count }) => {
    const [link, setLink] = useState({ table: 1, showtype: 'normal', view: 'banner', color: 'classic' });

    const params = new URLSearchParams({ table: String(Math.min(link.table, count)) });
    if (link.showtype === 'livestream') {
        params.set('showtype', 'livestream');
        params.set('view', link.view);
    }
    if (link.color !== 'classic') params.set('color', link.color);

    const url = `${publicUrl}?${params.toString()}`;
    const select = 'border border-gray-300 rounded-lg px-2.5 py-2 text-sm bg-white outline-none focus:border-regx-orange';

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Link copied');
        } catch {
            toast.error('Could not copy — select the link and copy it');
        }
    };

    return (
        <section>
            <p className="text-sm font-semibold text-gray-800 mb-1">Screen for one table</p>
            <p className="text-xs text-gray-500 mb-2">
                A monitor beside a table, or a live-stream overlay (add it to OBS as a browser source — the background is transparent).
            </p>
            <div className="flex flex-wrap gap-2">
                <select className={select} value={link.table} onChange={(e) => setLink((l) => ({ ...l, table: Number(e.target.value) }))} aria-label="Table">
                    {Array.from({ length: count }, (_, i) => i + 1).map((t) => <option key={t} value={t}>Table {t}</option>)}
                </select>
                <select className={select} value={link.showtype} onChange={(e) => setLink((l) => ({ ...l, showtype: e.target.value }))} aria-label="Screen type">
                    <option value="normal">Normal screen</option>
                    <option value="livestream">Live stream overlay</option>
                </select>
                {link.showtype === 'livestream' && (
                    <select className={select} value={link.view} onChange={(e) => setLink((l) => ({ ...l, view: e.target.value }))} aria-label="Overlay style">
                        <option value="banner">Banner (lower third)</option>
                        <option value="scorebug">Score bug (corner)</option>
                        <option value="ticker">Ticker (strip)</option>
                    </select>
                )}
                <select className={select} value={link.color} onChange={(e) => setLink((l) => ({ ...l, color: e.target.value }))} aria-label="Colours">
                    <option value="classic">Red / blue</option>
                    <option value="gold">Gold / slate</option>
                    <option value="green">Green / teal</option>
                    <option value="purple">Purple / pink</option>
                    <option value="orange">Orange / navy</option>
                </select>
            </div>
            <div className="mt-2 flex items-center gap-2">
                <input readOnly value={url} onFocus={(e) => e.target.select()} className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 bg-gray-50" aria-label="Table screen link" />
                <button type="button" onClick={copy} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange">Copy</button>
                <a href={url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800">Open</a>
            </div>
        </section>
    );
};

const TableSettings = ({ formId, publicUrl, onClose }) => {
    const [state, setState] = useState({ loading: true, error: null, tables: null, categories: [] });
    const [draft, setDraft] = useState(null); // { count, mode, categoryTables }
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const apply = useCallback((payload, resetDraft) => {
        setState({ loading: false, error: null, tables: payload.tables, categories: payload.categories ?? [] });

        if (resetDraft) {
            setDraft({
                count: payload.tables?.count || 4,
                mode: payload.tables?.mode ?? 'auto',
                categoryTables: { ...(payload.tables?.categoryTables ?? {}) },
            });
        }
    }, []);

    const load = useCallback(
        (resetDraft = false) => {
            setRefreshing(true);

            return api
                .get(`/forms/${formId}/fixture/tables`)
                .then((payload) => apply(payload, resetDraft))
                .catch((error) => setState((s) => ({ ...s, loading: false, error: messageOf(error, 'Could not load the tables') })))
                .finally(() => setRefreshing(false));
        },
        [formId, apply]
    );

    useEffect(() => {
        load(true);
    }, [load]);

    // What is on each table moves as results come in, so keep it current.
    useEffect(() => {
        const timer = setInterval(() => load(false), REFRESH_SECONDS * 1000);
        return () => clearInterval(timer);
    }, [load]);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const saved = state.tables;
    const dirty =
        draft &&
        saved &&
        (draft.count !== saved.count ||
            draft.mode !== saved.mode ||
            JSON.stringify(sorted(draft.categoryTables)) !== JSON.stringify(sorted(saved.categoryTables ?? {})));

    const save = async (override) => {
        const body = override ?? draft;
        setSaving(true);

        try {
            const payload = await api.put(`/forms/${formId}/fixture/tables`, body);
            apply(payload, true);
            toast.success(body.count === 0 ? 'Tables turned off' : 'Table settings saved');
        } catch (error) {
            toast.error(messageOf(error, 'Could not save the table settings'));
        } finally {
            setSaving(false);
        }
    };

    const setCount = (value) =>
        setDraft((d) => {
            const count = Math.max(1, Math.min(50, Number(value) || 1));
            // A category on a table that no longer exists loses its table.
            const categoryTables = Object.fromEntries(Object.entries(d.categoryTables).filter(([, t]) => t <= count));
            return { ...d, count, categoryTables };
        });

    const live = saved?.count > 0 ? saved.list ?? [] : [];
    const busy = live.filter((t) => t.match).length;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8"
                role="dialog"
                aria-modal="true"
                aria-label="Table settings"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 text-regx-orange flex items-center justify-center shrink-0">
                            <LayoutGrid className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 text-lg">Table settings</h2>
                            <p className="text-xs text-gray-500">
                                How many tables the hall has, and which match plays on each. Shown on the public screen.
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </header>

                {state.loading || !draft ? (
                    <div className="py-16 flex justify-center text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : state.error && !saved ? (
                    <p className="m-5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-4">{state.error}</p>
                ) : (
                    <div className="p-5 space-y-6">
                        {/* How many */}
                        <section>
                            <p className="text-sm font-semibold text-gray-800 mb-2">Number of tables</p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCount(draft.count - 1)}
                                    className="w-10 h-10 rounded-lg border border-gray-300 grid place-items-center hover:bg-gray-50"
                                    aria-label="One table fewer"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={draft.count}
                                    onChange={(e) => setCount(e.target.value)}
                                    aria-label="Number of tables"
                                    className="w-20 h-10 text-center text-lg font-bold border border-gray-300 rounded-lg outline-none focus:border-regx-orange"
                                />
                                <button
                                    type="button"
                                    onClick={() => setCount(draft.count + 1)}
                                    className="w-10 h-10 rounded-lg border border-gray-300 grid place-items-center hover:bg-gray-50"
                                    aria-label="One table more"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                {saved?.count === 0 && (
                                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 ml-2">
                                        Tables are off — save to turn them on
                                    </span>
                                )}
                            </div>
                        </section>

                        {/* How matches reach them */}
                        <section>
                            <p className="text-sm font-semibold text-gray-800 mb-2">How matches get a table</p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {[
                                    ['auto', Shuffle, 'Automatic', 'A free table takes the next waiting match from any category, taking turns so no category waits too long.'],
                                    ['manual', ListOrdered, 'By category', 'You give each category a table. Its matches play there, one after another.'],
                                ].map(([mode, Icon, title, text]) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setDraft((d) => ({ ...d, mode }))}
                                        aria-pressed={draft.mode === mode}
                                        className={`text-left p-4 rounded-xl border-2 transition-colors ${
                                            draft.mode === mode ? 'border-regx-orange bg-orange-50/50' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2 font-semibold text-gray-900">
                                            <Icon className={`w-4 h-4 ${draft.mode === mode ? 'text-regx-orange' : 'text-gray-400'}`} />
                                            {title}
                                        </span>
                                        <span className="block text-xs text-gray-500 mt-1">{text}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Manual: category → table */}
                        {draft.mode === 'manual' && (
                            <section>
                                <p className="text-sm font-semibold text-gray-800 mb-2">Table for each category</p>
                                {state.categories.length === 0 ? (
                                    <p className="text-sm text-gray-500">Start a category first — then give it a table here.</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
                                        {state.categories.map((cat) => (
                                            <li key={cat.name} className="flex items-center gap-3 px-3 py-2.5">
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-medium text-gray-900 truncate">{cat.name}</span>
                                                    <span className="block text-[11px] text-gray-500">
                                                        {cat.waiting} match{cat.waiting === 1 ? '' : 'es'} waiting
                                                    </span>
                                                </span>
                                                <select
                                                    value={draft.categoryTables[cat.name] ?? ''}
                                                    onChange={(e) =>
                                                        setDraft((d) => {
                                                            const next = { ...d.categoryTables };
                                                            if (e.target.value === '') delete next[cat.name];
                                                            else next[cat.name] = Number(e.target.value);
                                                            return { ...d, categoryTables: next };
                                                        })
                                                    }
                                                    aria-label={`Table for ${cat.name}`}
                                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-regx-orange"
                                                >
                                                    <option value="">No table</option>
                                                    {Array.from({ length: draft.count }, (_, i) => i + 1).map((t) => (
                                                        <option key={t} value={t}>
                                                            Table {t}
                                                        </option>
                                                    ))}
                                                </select>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        )}

                        {publicUrl && saved?.count > 0 && <TableLinks publicUrl={publicUrl} count={saved.count} />}

                        {/* What is on each table now */}
                        {saved?.count > 0 && (
                            <section>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="text-sm font-semibold text-gray-800">
                                        Now playing <span className="text-gray-400 font-normal">· {busy} of {saved.count} tables in use</span>
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => load(false)}
                                        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {live.map((table) => (
                                        <div
                                            key={table.table}
                                            className={`rounded-xl border p-3 ${table.match ? 'border-green-300 bg-green-50' : 'border-dashed border-gray-300 bg-gray-50'}`}
                                        >
                                            <p className="text-xs font-black tracking-wide text-gray-900">TABLE {table.table}</p>
                                            {table.match ? (
                                                <>
                                                    <p className="text-[11px] text-green-800 font-semibold truncate mt-1">{table.category}</p>
                                                    <p className="text-xs text-gray-800 mt-1 leading-tight truncate">{table.match.player1?.name}</p>
                                                    <p className="text-[11px] text-gray-500 leading-tight flex items-center gap-1 truncate">
                                                        <Swords className="w-3 h-3 shrink-0" /> {table.match.player2?.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{table.match.round}</p>
                                                </>
                                            ) : (
                                                <p className="text-[11px] text-gray-400 mt-1">
                                                    Free
                                                    {saved.mode === 'manual' && table.categories.length === 0 ? ' · no category' : ''}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                <footer className="flex items-center justify-between gap-3 p-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
                    {saved?.count > 0 ? (
                        <button
                            type="button"
                            onClick={() => save({ count: 0 })}
                            disabled={saving}
                            className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
                        >
                            Turn tables off
                        </button>
                    ) : (
                        <span />
                    )}

                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white">
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={() => save()}
                            disabled={saving || !draft || (!dirty && saved?.count > 0)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

const sorted = (obj) => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));

export default TableSettings;

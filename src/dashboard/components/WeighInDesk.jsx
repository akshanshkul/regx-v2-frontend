import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
    ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2, Mail, Pencil, Phone, Printer, RefreshCw, Scale, Search, TriangleAlert, UserRound, X,
} from 'lucide-react';

import {
    fetchSubmissions,
    recordWeighIn,
    selectSubmissionsFor,
    selectSubmissionsLoading,
    selectSubmissionsMetaFor,
} from '../../store/slices/formsSlice';

import useDebouncedValue from '../../hooks/useDebouncedValue';
import { printWeighInReceipt } from '../utils/submissionExport';

const PAGE_SIZES = [10, 25, 50];

const loadReceiptPaperSize = (formId) => {
    try {
        const savedSize = window.localStorage.getItem(`regx-weigh-in-paper-size:${formId}`);

        return ['80mm', '58mm', 'A4'].includes(savedSize) ? savedSize : '80mm';
    } catch {
        toast.error('Could not load the saved receipt paper size.');
        return '80mm';
    }
};

/** "75 kg" → { limit: 75, over: false }, "75+ kg" → { limit: 75, over: true }. */
const parseClass = (label) => {
    const match = /^\s*(\d+(?:\.\d+)?)\s*(\+)?/.exec(String(label ?? ''));

    return match ? { limit: Number(match[1]), over: match[2] === '+' } : null;
};

/** Every category a player entered, as short lines like "Senior · 75 kg · Right". */
const enteredClasses = (registration) =>
    (registration.entries ?? []).flatMap((grid) =>
        (grid.rows ?? []).map((row) => ({
            text: (grid.columns ?? [])
                .map((column) => row[column.key])
                .filter(Boolean)
                .join(' · '),
            weight: parseClass(row.weight_category),
        }))
    ).filter((entry) => entry.text);

/**
 * Whether the scale reading fits the class the player entered. A hint, never a
 * block: the organiser at the desk decides what to do about a miss.
 */
const mismatches = (classes, kg) =>
    classes
        .filter((entry) => entry.weight)
        .filter(({ weight }) => (weight.over ? kg <= weight.limit : kg > weight.limit))
        .map(({ text, weight }) =>
            weight.over
                ? `${text}: ${kg} kg is not over ${weight.limit} kg`
                : `${text}: ${kg} kg is over the ${weight.limit} kg limit`
        );

const formatWhen = (value) => {
    if (!value) return '';

    const date = new Date(String(value).replace(' ', 'T'));

    return Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

/**
 * The weigh-in desk for one form: who registered, what they entered, and what
 * the scale said.
 *
 * Search runs on the server so it reaches every registration, not just the page
 * on screen. Saving a weight updates that one row in place.
 */
const WeighInDesk = ({ form, onBack }) => {
    const dispatch = useDispatch();

    const rows = useSelector(selectSubmissionsFor(form.id));
    const meta = useSelector(selectSubmissionsMetaFor(form.id));
    const loading = useSelector(selectSubmissionsLoading);

    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('all');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [weighing, setWeighing] = useState(null);
    const [refresh, setRefresh] = useState(0);

    // Search, filter and paging all happen on the server, and only the columns
    // this desk shows come back (`slim`), so a form with thousands of players
    // costs one small page at a time.
    //
    // The box follows every keystroke; the request follows `debouncedSearch`,
    // which changes only after typing has paused for two seconds, so a name typed in one go is
    // one search rather than one per letter.
    const debouncedSearch = useDebouncedValue(search.trim(), 2000);
    const searching = search.trim() !== debouncedSearch;

    useEffect(() => {
        const request = dispatch(
            fetchSubmissions({
                formId: form.id,
                query: {
                    search: debouncedSearch,
                    page,
                    perPage,
                    slim: 1,
                    weighed: tab === 'done' ? 'yes' : tab === 'pending' ? 'no' : '',
                },
            })
        );

        request.unwrap().catch((error) => {
            // A newer request replacing this one is not a failure.
            if (error?.name !== 'AbortError') toast.error(typeof error === 'string' ? error : 'Failed to load players');
        });

        return () => request.abort();
    }, [dispatch, form.id, debouncedSearch, page, perPage, tab, refresh]);

    const total = meta?.total ?? 0;
    const pages = meta?.pages ?? 1;
    const weighed = meta?.weighed ?? 0;

    const shown = rows;

    const tabs = [['all', 'All'], ['pending', 'Not weighed'], ['done', 'Weighed']];

    return (
        <div>
            <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back to the forms"
                        className="w-9 h-9 rounded-xl bg-white border border-gray-200 grid place-items-center text-gray-600 hover:bg-gray-50 shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 truncate">{form.name}</h2>
                        <p className="text-xs text-gray-500">
                            {form.event_name ? `${form.event_name} · ` : ''}
                            {weighed} weighed in so far
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setRefresh((n) => n + 1)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 shrink-0"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative w-full md:max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search name, email or mobile…"
                            aria-label="Search players"
                            className="w-full pl-9 pr-9 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-regx-orange/20 focus:border-regx-orange"
                        />
                        {searching && <Loader2 className="w-3.5 h-3.5 absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" aria-hidden="true" />}
                        {search && (
                            <button
                                type="button"
                                onClick={() => { setSearch(''); setPage(1); }}
                                aria-label="Clear search"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter players">
                        {tabs.map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={tab === key}
                                onClick={() => { setTab(key); setPage(1); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                    tab === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading && rows.length === 0 ? (
                    <div className="p-5 space-y-3" role="status" aria-busy="true" aria-label="Loading players">
                        {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}
                    </div>
                ) : shown.length === 0 ? (
                    <div className="py-14 text-center">
                        <Scale className="w-8 h-8 mx-auto text-gray-300" />
                        <p className="mt-3 text-sm font-semibold text-gray-900">
                            {search ? 'No player matches' : tab === 'all' ? 'No registrations yet' : 'Nobody in this list'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            {search ? 'Try a different name, email or mobile number.' : 'Registered players appear here to be weighed.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {['Player', 'Contact', 'Entered', 'Weight', ''].map((heading) => (
                                        <th key={heading} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {shown.map((row) => {
                                    const done = row.weighIn?.kg != null;
                                    const classes = enteredClasses(row);

                                    return (
                                        <tr key={row.id} className="hover:bg-gray-50/70">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-100 grid place-items-center shrink-0">
                                                        <UserRound className="w-4 h-4 text-gray-500" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                                            {row.participant || 'Unnamed player'}
                                                        </p>
                                                        <p className="text-[11px] text-gray-400 font-mono">{row.reference}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5 text-xs text-gray-600 space-y-1">
                                                <p className="flex items-center gap-1.5 truncate max-w-[220px]">
                                                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    {row.email || '—'}
                                                </p>
                                                <p className="flex items-center gap-1.5">
                                                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    {row.phone || '—'}
                                                </p>
                                            </td>

                                            <td className="px-5 py-3.5">
                                                {classes.length === 0 ? (
                                                    <span className="text-xs text-gray-400">—</span>
                                                ) : (
                                                    <ul className="space-y-0.5">
                                                        {classes.slice(0, 3).map((entry, i) => (
                                                            <li key={i} className="text-xs text-gray-700">{entry.text}</li>
                                                        ))}
                                                        {classes.length > 3 && (
                                                            <li className="text-[11px] text-gray-400">+{classes.length - 3} more</li>
                                                        )}
                                                    </ul>
                                                )}
                                            </td>

                                            <td className="px-5 py-3.5">
                                                {done ? (
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{row.weighIn.kg} kg</p>
                                                        <p className="text-[11px] text-gray-400">{formatWhen(row.weighIn.at)}</p>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex px-2 py-1 rounded-md border border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-700">
                                                        Not weighed
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-3.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setWeighing(row)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                        done
                                                            ? 'border border-gray-200 text-gray-700 hover:border-regx-orange hover:text-regx-orange'
                                                            : 'bg-regx-orange text-white hover:bg-orange-600'
                                                    }`}
                                                >
                                                    {done ? <Pencil className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5" />}
                                                    {done ? 'Update' : 'Weigh in'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {total > 0 && (
                    <div className="px-5 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                            <span>{meta?.from ?? 0}–{meta?.to ?? 0} of {total}</span>

                            <label className="flex items-center gap-1.5">
                                Rows
                                <select
                                    value={perPage}
                                    onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                                    className="border border-gray-200 rounded-md px-1.5 py-1 text-xs bg-white"
                                >
                                    {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                                </select>
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={(meta?.page ?? 1) <= 1 || loading}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> Previous
                            </button>

                            <span className="tabular-nums">Page {meta?.page ?? 1} of {pages}</span>

                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                                disabled={(meta?.page ?? 1) >= pages || loading}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {weighing && (
                <WeightDialog
                    formId={form.id}
                    formName={form.name}
                    registration={weighing}
                    onClose={() => setWeighing(null)}
                />
            )}
        </div>
    );
};

/** One player, one number. */
const WeightDialog = ({ formId, formName, registration, onClose }) => {
    const dispatch = useDispatch();

    const [weight, setWeight] = useState(
        registration.weighIn?.kg != null ? String(registration.weighIn.kg) : ''
    );
    const [categoryEntries, setCategoryEntries] = useState(() =>
        Object.fromEntries((registration.entries ?? []).map((entry) => [entry.key, entry.values ?? []]))
    );
    const [paperSize, setPaperSize] = useState(() => loadReceiptPaperSize(formId));
    const [saving, setSaving] = useState(false);

    const editedRegistration = useMemo(() => ({
        ...registration,
        entries: (registration.entries ?? []).map((entry) => ({
            ...entry,
            rows: (entry.values ?? []).map((values, rowIndex) => {
                const editedValues = categoryEntries[entry.key]?.[rowIndex] ?? values;

                return Object.fromEntries(entry.columns.map((column) => {
                    const value = editedValues[column.key] ?? '';
                    const option = column.options?.find((item) => String(item.value) === String(value));
                    return [column.key, option?.label ?? String(value)];
                }));
            }),
        })),
    }), [registration, categoryEntries]);
    const classes = useMemo(() => enteredClasses(editedRegistration), [editedRegistration]);

    const kg = Number(weight);
    const valid = weight !== '' && Number.isFinite(kg) && kg >= 0.1 && kg <= 500;
    const warnings = valid ? mismatches(classes, kg) : [];

    useEffect(() => {
        const onKey = (event) => event.key === 'Escape' && !saving && onClose();

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [saving, onClose]);

    const submit = async (event, shouldPrint = false) => {
        event.preventDefault();

        if (!valid) return;

        setSaving(true);

        let result;
        try {
            result = await dispatch(
                recordWeighIn({
                    formId,
                    submissionId: registration.id,
                    weight: kg,
                    categoryEntries,
                })
            ).unwrap();
        } catch (message) {
            toast.error(typeof message === 'string' ? message : 'Could not save the weight.');
            setSaving(false);
            return;
        }

        toast.success(result.message || 'Weight saved.');
        if (shouldPrint) {
            try {
                printWeighInReceipt({
                    formName,
                    registration: editedRegistration,
                    weight: kg,
                    weighedAt: result.weighIn.at,
                    paperSize,
                });
            } catch {
                toast.error('Weight saved, but the receipt could not be opened for printing.');
            }
        }
        onClose();
    };

    const updating = registration.weighIn?.kg != null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && onClose()}>
            <form
                role="dialog"
                aria-modal="true"
                aria-label={`Weigh in ${registration.participant ?? 'player'}`}
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">{updating ? 'Update weight' : 'Weigh in'}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Enter what the scale shows.</p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close"
                        className="p-1.5 -m-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto">
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                        <p className="text-sm font-semibold text-gray-900">{registration.participant || 'Unnamed player'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {[registration.email, registration.phone].filter(Boolean).join(' · ') || registration.reference}
                        </p>
                    </div>

                    {registration.entries?.map((entry) => (
                        <fieldset key={entry.key} className="mt-5">
                            <legend className="text-xs font-semibold text-gray-700 mb-2">{entry.label}</legend>
                            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                                <div className="flex items-end gap-3 overflow-x-auto px-3 pt-3">
                                    <span className="w-24 shrink-0" aria-hidden="true" />
                                    {entry.columns.map((column) => (
                                        <span key={column.key} className="min-w-[140px] flex-1 text-[11px] font-medium text-gray-600">
                                            {column.label}
                                        </span>
                                    ))}
                                </div>
                                {entry.values.map((values, rowIndex) => (
                                    <div key={rowIndex} className="flex items-center gap-3 overflow-x-auto px-3 py-2">
                                        {/* <p className="w-24 shrink-0 text-[11px] font-semibold text-gray-500">
                                            {entry.label === 'Players' ? `Player ${rowIndex + 1}` : `Category ${rowIndex + 1}`}
                                        </p> */}
                                        {entry.columns.map((column) => {
                                                const rowValues = categoryEntries[entry.key]?.[rowIndex] ?? values;
                                                const value = rowValues[column.key] ?? '';
                                                const options = (column.options ?? []).filter((option) =>
                                                    !column.dependsOn
                                                    || String(option.parentValue ?? '') === String(rowValues[column.dependsOn] ?? '')
                                                );

                                                const setValue = (nextValue) => setCategoryEntries((current) => ({
                                                    ...current,
                                                    [entry.key]: current[entry.key].map((row, index) => index !== rowIndex
                                                        ? row
                                                        : {
                                                            ...row,
                                                            [column.key]: nextValue,
                                                            ...Object.fromEntries(
                                                                entry.columns
                                                                    .filter((dependent) => dependent.dependsOn === column.key)
                                                                    .map((dependent) => [dependent.key, ''])
                                                            ),
                                                        }),
                                                }));

                                                return (
                                                    <label key={column.key} className="block min-w-[140px] flex-1">
                                                        {column.type === 'select' ? (
                                                            <select
                                                                value={value}
                                                                required={column.required}
                                                                onChange={(event) => setValue(event.target.value)}
                                                                className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-regx-orange focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                            >
                                                                <option value="">Select {column.label.toLowerCase()}</option>
                                                                {!options.some((option) => String(option.value) === String(value)) && value !== '' && (
                                                                    <option value={value}>{value}</option>
                                                                )}
                                                                {options.map((option) => (
                                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type={['number', 'date', 'email'].includes(column.type) ? column.type : 'text'}
                                                                value={value}
                                                                required={column.required}
                                                                onChange={(event) => setValue(event.target.value)}
                                                                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-regx-orange focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                            />
                                                        )}
                                                    </label>
                                                );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </fieldset>
                    ))}

                    <label className="block mt-5">
                        <span className="block text-xs font-semibold text-gray-700 mb-2">Weight</span>

                        <div className="relative">
                            <input
                                type="number"
                                inputMode="decimal"
                                min="0.1"
                                max="500"
                                step="0.1"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                placeholder="0.0"
                                autoFocus
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-14 text-lg font-semibold text-gray-900 outline-none focus:border-regx-orange focus:ring-2 focus:ring-orange-100"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">kg</span>
                        </div>
                    </label>

                    {warnings.length > 0 && (
                        <div role="status" className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                            <TriangleAlert className="w-4 h-4 shrink-0 mt-px" />
                            <div>
                                <p className="font-semibold">Does not match what they entered</p>
                                {warnings.map((line) => <p key={line}>{line}</p>)}
                                <p className="mt-1 text-amber-700">You can still save it.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                        Receipt paper
                        <select
                            value={paperSize}
                            disabled={saving}
                            onChange={(event) => {
                                const size = event.target.value;
                                setPaperSize(size);
                                try {
                                    window.localStorage.setItem(`regx-weigh-in-paper-size:${formId}`, size);
                                } catch {
                                    toast.error('Could not save the receipt paper size.');
                                }
                            }}
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700"
                        >
                            <option value="80mm">80 mm thermal</option>
                            <option value="58mm">58 mm thermal</option>
                            <option value="A4">A4</option>
                        </select>
                    </label>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving || !valid}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {updating ? 'Update weight' : 'Save weight'}
                        </button>

                        <button
                            type="button"
                            onClick={(event) => submit(event, true)}
                            disabled={saving || !valid}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                            Save &amp; Print
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default WeighInDesk;

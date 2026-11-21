import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Search, X, ChevronLeft, ChevronRight, ChevronDown, IndianRupee, RefreshCw,
    Wallet, Clock, AlertTriangle, RotateCcw, FileSpreadsheet, ArrowUpDown, Loader2, Inbox,
} from 'lucide-react';
import api from '../../services/api';
import Skeleton from '../../shared/components/Skeleton';
import { exportExcelRows } from '../utils/submissionExport';
import { parseServerDate } from '../../shared/utils/dates';
import { encodeId } from '../../shared/utils/ids';

const selectClass =
    'border border-gray-300 rounded-lg px-2.5 py-2 text-sm bg-white text-gray-700 focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none';

const STATUS_STYLES = {
    captured: 'bg-green-50 text-green-700 border-green-200',
    created: 'bg-amber-50 text-amber-700 border-amber-200',
    authorized: 'bg-blue-50 text-blue-700 border-blue-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    refunded: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_WORDS = {
    captured: 'Paid',
    created: 'Awaiting payment',
    authorized: 'Authorised',
    failed: 'Failed',
    refunded: 'Refunded',
};

const money = (amount, currency = 'INR') =>
    `${currency === 'INR' ? '₹' : currency + ' '}${Number(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
    })}`;

const when = (value) =>
    value
        ? parseServerDate(value).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })
        : '—';

const Payments = () => {
    const [scope, setScope] = useState('registrations');

    return (
        <div className="max-w-[1400px] mx-auto">
            <nav className="flex gap-6 border-b border-gray-200 mb-5">
                {[
                    ['registrations', 'Registration payments'],
                ].map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setScope(key)}
                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${scope === key
                                ? 'border-regx-orange text-regx-orange'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </nav>
            <RegistrationPayments />
        </div>
    );
};

/**
 * Every payment attempt across the organiser's events.
 *
 * One row per attempt rather than per registration, because that is what
 * actually happened: a declined card followed by a successful one is two
 * events, and hiding the first would make the money impossible to reconcile
 * against a bank statement.
 *
 * The totals are over everything the filters match, not the page — "collected
 * this month" is the question being asked, and a page of it is not an answer.
 */
const RegistrationPayments = () => {
    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState(null);
    const [totals, setTotals] = useState(null);
    const [filters, setFilters] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [status, setStatus] = useState('');
    const [eventId, setEventId] = useState('');
    const [formId, setFormId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [sort, setSort] = useState('created_at');
    const [dir, setDir] = useState('desc');
    const [perPage, setPerPage] = useState(25);
    const [page, setPage] = useState(1);

    const [expanded, setExpanded] = useState(null);
    const [busy, setBusy] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(search.trim()), 350);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [debounced, status, eventId, formId, from, to, perPage, sort, dir]);

    const query = useMemo(
        () => ({ page, perPage, search: debounced, status, eventId, formId, from, to, sort, dir }),
        [page, perPage, debounced, status, eventId, formId, from, to, sort, dir]
    );

    const load = async () => {
        setIsLoading(true);

        try {
            const params = Object.fromEntries(
                Object.entries(query).filter(([, value]) => value !== '' && value != null)
            );

            const response = await api.get('/payments', { params });

            setRows(response.data || []);
            setMeta(response.meta || null);
            setTotals(response.totals || null);
            setFilters(response.filters || null);
        } catch {
            toast.error('Could not load payments.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
        // load() reads the memoised query; re-running on it is the intent.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    const hasFilters =
        debounced !== '' || status !== '' || eventId !== '' || formId !== '' || from !== '' || to !== '';

    const clearFilters = () => {
        setSearch('');
        setStatus('');
        setEventId('');
        setFormId('');
        setFrom('');
        setTo('');
    };

    const toggleSort = (column) => {
        if (sort === column) {
            setDir(dir === 'asc' ? 'desc' : 'asc');
            return;
        }

        setSort(column);
        setDir('desc');
    };

    /**
     * Ask Razorpay what really happened to this attempt.
     *
     * For the one case the webhook cannot cover on its own — a delivery that
     * never arrived — so the organiser can settle it without anyone touching
     * the database.
     */
    const reconcile = async (row) => {
        setBusy(row.id);

        try {
            const response = await api.post(`/payments/${row.id}/reconcile`);

            response.data?.changed ? toast.success(response.message) : toast(response.message);

            await load();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not check that payment.');
        } finally {
            setBusy(null);
        }
    };

    // Where the last "check pending" batch stopped, so each click takes the next ten.
    const [checkCursor, setCheckCursor] = useState({ after: 0, remaining: null });

    const checkPending = async () => {
        setBusy('check');

        try {
            const response = await api.post('/payments/check-pending', {
                after: checkCursor.after,
                limit: 10,
                formId: formId || undefined,
            });
            const { checked, results, next, remaining } = response.data;

            if (checked === 0) {
                toast('Nothing is waiting on payment.');
                setCheckCursor({ after: 0, remaining: 0 });
                return;
            }

            const parts = [
                results.paid && `${results.paid} paid`,
                results.failed && `${results.failed} failed`,
                results.abandoned && `${results.abandoned} abandoned`,
                results.unchanged && `${results.unchanged} unchanged`,
            ].filter(Boolean);

            toast.success(`Checked ${checked}: ${parts.join(', ')}.${remaining ? ` ${remaining} more waiting.` : ''}`);
            // Once the end is reached, the next click starts over from the oldest.
            setCheckCursor({ after: remaining ? next : 0, remaining });

            await load();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not check the payments.');
        } finally {
            setBusy(null);
        }
    };

    const exportAll = async () => {
        setBusy('export');

        try {
            const params = Object.fromEntries(
                Object.entries(query)
                    .filter(([key]) => key !== 'page' && key !== 'perPage')
                    .filter(([, value]) => value !== '' && value != null)
            );

            const payload = await api.get('/payments/export', { params });
            const data = payload.data || [];

            if (data.length === 0) {
                toast.error('Nothing to export with the current filters.');
                return;
            }

            await exportExcelRows(
                {
                    columns: [
                        'Date', 'Event', 'Form', 'Registration ID', 'Email', 'Attempt',
                        'Status', 'Amount', 'Currency', 'Order ID', 'Payment ID',
                        'Paid At', 'Error', 'Registration status',
                    ],
                    rows: data.map((row) => [
                        row.createdAt,
                        row.event.title,
                        row.form.name,
                        row.registration.reference,
                        row.registration.email ?? '',
                        String(row.attempt),
                        STATUS_WORDS[row.status] ?? row.status,
                        String(row.amount),
                        row.currency,
                        row.orderId,
                        row.paymentId ?? '',
                        row.paidAt ?? '',
                        row.error ? `${row.error.code}: ${row.error.message}` : '',
                        row.registration.paymentStatus,
                    ]),
                },
                'payments',
                'Payments'
            );
        } catch {
            toast.error('Export failed.');
        } finally {
            setBusy(null);
        }
    };

    const pageNumbers = useMemo(() => {
        const window = [];

        for (let i = Math.max(1, page - 2); i <= Math.min(meta?.pages ?? 1, page + 2); i++) {
            window.push(i);
        }

        return window;
    }, [meta?.pages, page]);

    return (
        <div className="max-w-[1400px] mx-auto space-y-5 pb-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Payments</h1>
                    <p className="text-sm text-gray-500">
                        Every payment attempt on your registration forms.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                <button
                    onClick={checkPending}
                    disabled={busy !== null}
                    title="Ask Razorpay about the next 10 registrations still waiting on payment"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors disabled:opacity-40"
                >
                    {busy === 'check' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    {checkCursor.after > 0 ? 'Check next 10' : 'Check pending (10)'}
                </button>

                <button
                    onClick={exportAll}
                    disabled={busy !== null || (meta?.total ?? 0) === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors disabled:opacity-40"
                >
                    {busy === 'export' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <FileSpreadsheet className="w-4 h-4" />
                    )}
                    Export
                </button>
                </div>
            </div>

            {/* Money, over everything the filters match */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Total label="Collected" value={totals?.collected} icon={Wallet} tone="text-green-600" loading={!totals} />
                <Total label="Awaiting payment" value={totals?.outstanding} icon={Clock} tone="text-amber-600" loading={!totals} />
                <Total label="Refunded" value={totals?.refunded} icon={RotateCcw} tone="text-gray-400" loading={!totals} />
                <Total
                    label="Failed attempts"
                    value={totals?.failures}
                    icon={AlertTriangle}
                    tone="text-red-500"
                    loading={!totals}
                    isCount
                />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search reference, order id, payment id, email…"
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                        />
                    </div>

                    <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                        <option value="">All statuses</option>
                        {(filters?.statuses ?? []).map((value) => (
                            <option key={value} value={value}>
                                {STATUS_WORDS[value] ?? value}
                            </option>
                        ))}
                    </select>

                    <select value={eventId} onChange={(e) => setEventId(e.target.value)} className={selectClass}>
                        <option value="">All events</option>
                        {(filters?.events ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label} ({option.count})
                            </option>
                        ))}
                    </select>

                    <select value={formId} onChange={(e) => setFormId(e.target.value)} className={selectClass}>
                        <option value="">All forms</option>
                        {(filters?.forms ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label} ({option.count})
                            </option>
                        ))}
                    </select>

                    <div className="flex items-center gap-1.5">
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            aria-label="From date"
                            className={selectClass}
                        />
                        <span className="text-xs text-gray-400">to</span>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            aria-label="To date"
                            className={selectClass}
                        />
                    </div>

                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                            Clear
                        </button>
                    )}

                    <select
                        value={perPage}
                        onChange={(e) => setPerPage(Number(e.target.value))}
                        className={`${selectClass} ml-auto`}
                    >
                        {(filters?.pageSizes ?? [10, 25, 50, 100]).map((size) => (
                            <option key={size} value={size}>
                                {size} / page
                            </option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr className="text-left">
                                <th className="w-8" />
                                {[
                                    ['created_at', 'Date'],
                                    ['reference', 'Registration'],
                                ].map(([key, label]) => (
                                    <th key={key} className="px-4 py-3">
                                        <button
                                            onClick={() => toggleSort(key)}
                                            className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider ${sort === key ? 'text-regx-orange' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            {label}
                                            <ArrowUpDown className="w-3 h-3" />
                                        </button>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                    Event / form
                                </th>
                                {[
                                    ['amount', 'Amount'],
                                    ['status', 'Status'],
                                ].map(([key, label]) => (
                                    <th key={key} className="px-4 py-3">
                                        <button
                                            onClick={() => toggleSort(key)}
                                            className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider ${sort === key ? 'text-regx-orange' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            {label}
                                            <ArrowUpDown className="w-3 h-3" />
                                        </button>
                                    </th>
                                ))}
                                <th className="w-10" />
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {isLoading &&
                                [0, 1, 2, 3, 4].map((i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-3" colSpan={7}>
                                            <Skeleton className="h-5 w-full" />
                                        </td>
                                    </tr>
                                ))}

                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                                        <p className="font-semibold text-gray-900">
                                            {hasFilters ? 'No payments match those filters' : 'No payments yet'}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {hasFilters
                                                ? 'Try widening the date range or clearing a filter.'
                                                : 'Payments appear here once a form that collects fees is registered against.'}
                                        </p>
                                    </td>
                                </tr>
                            )}

                            {!isLoading &&
                                rows.map((row) => (
                                    <React.Fragment key={row.id}>
                                        <tr
                                            onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                                            className="hover:bg-gray-50/70 cursor-pointer transition-colors"
                                        >
                                            <td className="pl-3">
                                                <ChevronDown
                                                    className={`w-4 h-4 text-gray-400 transition-transform ${expanded === row.id ? 'rotate-180' : ''
                                                        }`}
                                                />
                                            </td>

                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                {when(row.createdAt)}
                                            </td>

                                            <td className="px-4 py-3">
                                                <p className="font-mono text-sm text-gray-900">
                                                    {row.registration.reference}
                                                </p>
                                                {row.registration.hiddenAt && (
                                                    <p
                                                        className="text-[11px] text-amber-600"
                                                        title="This registration was removed from the lists. The payment still counts."
                                                    >
                                                        registration hidden
                                                    </p>
                                                )}
                                                {row.attempt > 1 && (
                                                    <p className="text-[11px] text-gray-400">
                                                        attempt {row.attempt}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 min-w-[180px]">
                                                <p className="text-sm text-gray-900 truncate">{row.event.title}</p>
                                                <p className="text-xs text-gray-500 truncate">{row.form.name}</p>
                                            </td>

                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                                                {money(row.amount, row.currency)}
                                            </td>

                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap ${STATUS_STYLES[row.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'
                                                        }`}
                                                >
                                                    {STATUS_WORDS[row.status] ?? row.status}
                                                </span>
                                            </td>

                                            <td className="pr-3">
                                                {/* Only worth offering where our record might be behind. */}
                                                {['created', 'authorized'].includes(row.status) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            reconcile(row);
                                                        }}
                                                        disabled={busy === row.id}
                                                        title="Check this payment with Razorpay"
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-regx-orange hover:bg-orange-50 transition-colors"
                                                    >
                                                        {busy === row.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>

                                        {expanded === row.id && (
                                            <tr className="bg-gray-50/60">
                                                <td colSpan={7} className="px-4 py-4">
                                                    <Detail row={row} />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                        </tbody>
                    </table>
                </div>

                {/* Paging */}
                {(meta?.pages ?? 1) > 1 && (
                    <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                            Showing {meta.from}–{meta.to} of {meta.total}
                        </p>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page <= 1}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {pageNumbers.map((number) => (
                                <button
                                    key={number}
                                    onClick={() => setPage(number)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${number === page
                                            ? 'bg-regx-orange text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {number}
                                </button>
                            ))}

                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page >= meta.pages}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Total = ({ label, value, icon: Icon, tone, loading, isCount = false }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>

        {loading ? (
            <Skeleton className="h-6 w-24" />
        ) : (
            <p className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Icon className={`w-4 h-4 ${tone}`} />
                {isCount ? Number(value || 0).toLocaleString('en-IN') : money(value)}
            </p>
        )}
    </div>
);

/** Everything about one attempt — the ids a dispute would be answered with. */
const Detail = ({ row }) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
        <Pair label="Order ID" value={row.orderId} mono />
        <Pair label="Payment ID" value={row.paymentId ?? '—'} mono />
        <Pair label="Paid at" value={when(row.paidAt)} />
        <Pair label="Attempt" value={`#${row.attempt}`} />
        <Pair label="Registration status" value={row.registration.paymentStatus} />
        <Pair label="Email" value={row.registration.email ?? '—'} />

        {row.error && (
            <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Why it failed
                </p>
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <span className="font-mono text-xs">{row.error.code}</span> — {row.error.message}
                </p>
            </div>
        )}

        <div className="sm:col-span-2 lg:col-span-3 pt-1">
            <Link
                to={`/events/${encodeId(row.event.id)}/forms/${encodeId(row.form.id)}/data`}
                className="text-sm font-medium text-regx-orange hover:underline inline-flex items-center gap-1"
            >
                <IndianRupee className="w-3.5 h-3.5" />
                Open the registration this belongs to
            </Link>
        </div>
    </div>
);

const Pair = ({ label, value, mono = false }) => (
    <div className="min-w-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-sm text-gray-900 truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
);

export default Payments;

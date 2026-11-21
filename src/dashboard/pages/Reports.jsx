import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
    AlertCircle, ArrowDownToLine, ArrowUpRight, BarChart3, CalendarDays, CheckCircle2,
    Clock3, FileSpreadsheet, FileText, Inbox, IndianRupee, Loader2, Printer, RefreshCw,
    UsersRound,
} from 'lucide-react';

import api from '../../services/api';
import {
    fetchFormsList,
    selectAllForms,
    selectFormsStatus,
} from '../../store/slices/formsSlice';
import SubmissionSummary from '../components/SubmissionSummary';
import PaymentReport from '../components/PaymentReport';
import FixtureResults from '../components/FixtureResults';
import {
    exportEventReportPdf,
    exportExcel,
} from '../utils/submissionExport';
import {
    exportCategoryList,
    printWeighInSheet,
} from '../utils/sportSheets';
import { parseServerDate } from '../../shared/utils/dates';
import { encodeId } from '../../shared/utils/ids';

const EMPTY_SUBMISSIONS = [];

const money = (amount, currency = 'INR') =>
    `${currency === 'INR' ? '₹' : `${currency} `}${Number(amount || 0).toLocaleString('en-IN', {
        maximumFractionDigits: 2,
    })}`;

const PAYMENT_BARS = {
    paid_online: ['Paid online', 'bg-emerald-500'],
    paid_cash: ['Paid in cash', 'bg-teal-500'],
    waived: ['Fee waived', 'bg-blue-400'],
    pending: ['Pending', 'bg-amber-400'],
    abandoned: ['Abandoned', 'bg-orange-400'],
    failed: ['Failed', 'bg-red-400'],
    refunded: ['Refunded', 'bg-gray-400'],
};

const statusLabel = (value) =>
    String(value || 'unknown').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value) => {
    if (!value) return '—';

    const date = parseServerDate(value);
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const makeTrend = (rows) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));

        return {
            key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
            label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
            count: 0,
        };
    });
    const byDay = new Map(days.map((day) => [day.key, day]));

    rows.forEach((row) => {
        const date = parseServerDate(row.created_at);
        if (Number.isNaN(date.getTime())) return;
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const day = byDay.get(key);
        if (day) day.count += 1;
    });

    return days;
};

const entryStats = (rows) => {
    const categories = new Map();
    let total = 0;

    rows.forEach((submission) => {
        (submission.entries ?? []).forEach((grid) => {
            (grid.rows ?? []).forEach((entry) => {
                total += 1;
                const label = grid.columns
                    .filter((column) => (column.type ?? 'select') === 'select')
                    .map((column) => entry[column.key])
                    .filter(Boolean)
                    .join(' · ');
                if (label) categories.set(label, (categories.get(label) ?? 0) + 1);
            });
        });
    });

    return {
        total,
        categories: [...categories.entries()]
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
            .slice(0, 5),
    };
};

const Reports = () => {
    const dispatch = useDispatch();
    const [searchParams, setSearchParams] = useSearchParams();
    const forms = useSelector(selectAllForms);
    const formsStatus = useSelector(selectFormsStatus);
    const [reportState, setReportState] = useState({ formId: '', report: null, error: '' });
    const [exporting, setExporting] = useState('');
    const [tab, setTab] = useState('overview');
    const [refresh, setRefresh] = useState(0);

    const selectedFormId = searchParams.get('formId') ?? '';
    const selectedForm = forms.find((form) => String(form.id) === selectedFormId);

    useEffect(() => {
        dispatch(fetchFormsList())
            .catch((error) => toast.error(typeof error === 'string' ? error : 'Could not load forms.'));
    }, [dispatch]);

    useEffect(() => {
        if (forms.length === 0) return;
        if (forms.some((form) => String(form.id) === selectedFormId)) return;

        const firstForm = forms.find((form) => Number(form.submission_count) > 0) ?? forms[0];
        setSearchParams({ formId: String(firstForm.id) }, { replace: true });
    }, [forms, selectedFormId, setSearchParams]);

    useEffect(() => {
        if (!selectedFormId || !selectedForm) {
            return undefined;
        }

        let current = true;

        api.get(`/forms/${selectedFormId}/submissions/export`)
            .then((response) => {
                if (current) setReportState({ formId: selectedFormId, report: response, error: '' });
            })
            .catch((error) => {
                if (current) {
                    const message = error?.response?.data?.message || 'Could not load this report.';
                    setReportState({ formId: selectedFormId, report: null, error: message });
                    toast.error(message);
                }
            });

        return () => {
            current = false;
        };
    }, [selectedFormId, selectedForm, refresh]);

    useEffect(() => {
        document.title = selectedForm?.name ? `${selectedForm.name} — reports` : 'Reports & exports';
    }, [selectedForm?.name]);

    const report = reportState.formId === selectedFormId ? reportState.report : null;
    const reportError = reportState.formId === selectedFormId ? reportState.error : '';
    const reportLoading = Boolean(selectedForm && reportState.formId !== selectedFormId);
    const submissions = report?.data ?? EMPTY_SUBMISSIONS;
    const trend = useMemo(() => makeTrend(submissions), [submissions]);
    const entries = useMemo(() => entryStats(submissions), [submissions]);
    const total = report?.meta?.total ?? Number(selectedForm?.submission_count ?? 0);
    const paid = submissions.filter((row) => row.payment_status === 'paid');
    const collected = paid.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    // Paid is split by how it was paid; waived and the rest keep their own rows.
    const paymentCounts = submissions.reduce((counts, row) => {
        const status =
            row.payment_status === 'paid'
                ? row.payment_method === 'cash' ? 'paid_cash' : 'paid_online'
                : row.payment_status || 'unknown';
        counts[status] = (counts[status] ?? 0) + 1;
        return counts;
    }, {});
    // A form that takes payment gets a payments tab; one that never charged does not.
    const takesPayment =
        (selectedForm?.payment_mode && selectedForm.payment_mode !== 'none') ||
        submissions.some((row) => Number(row.amount) > 0);
    const maxTrend = Math.max(1, ...trend.map((day) => day.count));
    const maxPayment = Math.max(1, ...Object.values(paymentCounts));
    const latest = submissions.slice(0, 6);

    const runExport = async (kind) => {
        if (!report) return;
        setExporting(kind);

        try {
            const labels = {
                formName: selectedForm.name,
                eventTitle: selectedForm.event_name,
            };

            // Excel and the weigh-in sheet list only people whose fee is settled
            // (paid online or in cash, or waived), so they ask for just those.
            const settled = ['excel', 'weighin'].includes(kind)
                ? await api.get(`/forms/${selectedFormId}/submissions/export`, { params: { settled: 1 } })
                : null;

            if (kind === 'excel' && settled && (settled.data ?? []).length === 0) {
                toast.error('No registration with a settled fee to export.');
                return;
            }

            if (kind === 'excel') await exportExcel(settled.sheet, selectedForm.name);
            if (kind === 'pdf') {
                const reportResponse = await api.get(`/forms/${selectedFormId}/report`);
                await exportEventReportPdf(reportResponse.data);
            }
            if (kind === 'print') {
                const { printSubmissions } = await import('../utils/submissionExport');
                printSubmissions(submissions, labels);
            }
            if (kind === 'categories') await exportCategoryList(submissions, selectedForm.name);
            if (kind === 'weighin') printWeighInSheet(settled.data ?? [], labels);
        } catch (error) {
            toast.error(
                error?.response?.data?.messages?.error
                || error?.response?.data?.message
                || error?.message
                || 'Could not export this report.'
            );
        } finally {
            setExporting('');
        }
    };

    const noForms = formsStatus === 'succeeded' && forms.length === 0;
    const noSubmissions = !reportLoading && report && total === 0;

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
            <header
                className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white shadow-sm"
                style={{ background: 'linear-gradient(120deg, #111827 0%, #1f2937 58%, #7c2d12 100%)' }}
            >
                <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
                <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="min-w-0 w-full">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-orange-100">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Reports &amp; exports
                        </div>
                        <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight">Your event, at a glance.</h1>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-gray-300">
                            See registration, payment and category trends, then export a clean report for your team.
                        </p>
                    </div>

                    <div className="w-full min-w-0">
                        <label htmlFor="report-form" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-300">
                            Report for
                        </label>
                        <select
                            id="report-form"
                            value={selectedFormId}
                            disabled={formsStatus === 'loading' || forms.length === 0}
                            onChange={(event) => setSearchParams(
                                event.target.value ? { formId: event.target.value } : {},
                                { replace: true }
                            )}
                            className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-3 text-sm text-white outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-400/30 disabled:opacity-60 [&>option]:text-gray-900"
                        >
                            {formsStatus === 'loading' && <option value="">Loading forms…</option>}
                            {forms.map((form) => (
                                <option key={form.id} value={form.id}>
                                    {form.event_name ? `${form.event_name} · ` : ''}{form.name}
                                </option>
                            ))}
                        </select>
                        {selectedForm && (
                            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-300">
                                <span className="truncate">{selectedForm.event_name || 'Standalone form'}</span>
                                <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 capitalize">{selectedForm.status}</span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {formsStatus === 'loading' && forms.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-12 flex items-center justify-center gap-3 text-sm text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin text-regx-orange" /> Loading your forms…
                </div>
            ) : noForms ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-regx-orange">
                        <Inbox className="h-6 w-6" />
                    </div>
                    <h2 className="mt-4 text-base font-semibold text-gray-900">No forms to report on yet</h2>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
                        Create a registration form first. Reports will appear here as people sign up.
                    </p>
                    <Link to="/dashboard/forms" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-regx-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">
                        Go to forms <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </div>
            ) : selectedForm ? (
                <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{selectedForm.name}</h2>
                            <p className="mt-0.5 text-xs text-gray-500">
                                {selectedForm.event_name || 'Standalone form'} · {total.toLocaleString('en-IN')} registrations
                                {report?.meta?.capped && ' · report data capped at 5,000'}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => runExport('excel')}
                                disabled={!report || reportLoading || Boolean(exporting)}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-green-300 hover:text-green-700 disabled:opacity-50"
                            >
                                {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                                Excel
                            </button>
                            <button
                                type="button"
                                onClick={() => runExport('pdf')}
                                disabled={!report || reportLoading || Boolean(exporting)}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-red-300 hover:text-red-700 disabled:opacity-50"
                            >
                                {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                Full report PDF
                            </button>
                            <button
                                type="button"
                                onClick={() => runExport('print')}
                                disabled={!report || reportLoading || Boolean(exporting)}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-gray-400 disabled:opacity-50"
                            >
                                {exporting === 'print' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                Print
                            </button>
                            {selectedForm.is_sport && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => runExport('categories')}
                                        disabled={!report || reportLoading || Boolean(exporting)}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-orange-300 hover:text-regx-orange disabled:opacity-50"
                                    >
                                        {exporting === 'categories' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
                                        Categories
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => runExport('weighin')}
                                        disabled={!report || reportLoading || Boolean(exporting)}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-orange-300 hover:text-regx-orange disabled:opacity-50"
                                    >
                                        {exporting === 'weighin' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                        Weigh-in sheet
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-1 border-b border-gray-200">
                        {[
                            ['overview', 'Overview'],
                            ['insights', 'Answer insights'],
                            ...(takesPayment ? [['payments', 'Payments']] : []),
                            ...(selectedForm.is_sport ? [['results', 'Results']] : []),
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setTab(key)}
                                className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                                    tab === key ? 'border-regx-orange text-regx-orange' : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {tab === 'insights' ? (
                        <SubmissionSummary formId={selectedForm.id} />
                    ) : tab === 'payments' && takesPayment ? (
                        <PaymentReport submissions={submissions} formName={selectedForm.name} />
                    ) : tab === 'results' && selectedForm.is_sport ? (
                        <FixtureResults formId={selectedForm.id} formName={selectedForm.name} />
                    ) : (
                        <>
                            {reportError ? (
                                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 h-5 w-5 text-red-600 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-red-900">Report could not be loaded</p>
                                        <p className="mt-1 text-sm text-red-700">{reportError}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setRefresh((value) => value + 1)}
                                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-800"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" /> Retry
                                    </button>
                                </div>
                            ) : reportLoading ? (
                                <div className="rounded-2xl border border-gray-200 bg-white p-12 flex items-center justify-center gap-3 text-sm text-gray-500">
                                    <Loader2 className="h-5 w-5 animate-spin text-regx-orange" /> Building your report…
                                </div>
                            ) : noSubmissions ? (
                                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                                    <CalendarDays className="mx-auto h-8 w-8 text-gray-300" />
                                    <h3 className="mt-3 font-semibold text-gray-900">Waiting for the first registration</h3>
                                    <p className="mt-1 text-sm text-gray-500">Once someone submits this form, the report will fill in automatically.</p>
                                </div>
                            ) : report && (
                                <>
                                    {report.meta?.capped && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                                            This form has more than 5,000 registrations. Charts use the first 5,000 available rows; the total count remains exact.
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                        <MetricCard label="Registrations" value={total.toLocaleString('en-IN')} hint="All submitted entries" icon={UsersRound} tone="orange" />
                                        <MetricCard label="Paid registrations" value={paid.length.toLocaleString('en-IN')} hint={`${submissions.length ? Math.round((paid.length / submissions.length) * 100) : 0}% of loaded registrations`} icon={CheckCircle2} tone="green" />
                                        <MetricCard label="Collected" value={money(collected, paid[0]?.currency)} hint="From paid registrations" icon={IndianRupee} tone="blue" />
                                        <MetricCard label="Category entries" value={entries.total.toLocaleString('en-IN')} hint="Players / categories entered" icon={BarChart3} tone="violet" />
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                                        <section className="xl:col-span-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">Registration activity</h3>
                                                    <p className="mt-1 text-xs text-gray-500">Daily sign-ups · last 7 days</p>
                                                </div>
                                                <span className="rounded-lg bg-orange-50 p-2 text-regx-orange"><CalendarDays className="h-4 w-4" /></span>
                                            </div>
                                            <div className="mt-6 flex h-44 items-end gap-2 sm:gap-4">
                                                {trend.map((day) => (
                                                    <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                                                        <span className="text-[11px] font-medium tabular-nums text-gray-500">{day.count || ''}</span>
                                                        <div className="flex h-32 w-full items-end rounded-t-md bg-gray-50">
                                                            <div
                                                                className="w-full rounded-t-md bg-gradient-to-t from-orange-500 to-amber-400 transition-all"
                                                                style={{ height: `${day.count ? Math.max(8, (day.count / maxTrend) * 100) : 0}%` }}
                                                                title={`${day.count} registrations`}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] text-gray-400">{day.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">Payment status</h3>
                                                    <p className="mt-1 text-xs text-gray-500">Across loaded registrations</p>
                                                </div>
                                                <span className="rounded-lg bg-green-50 p-2 text-green-700"><IndianRupee className="h-4 w-4" /></span>
                                            </div>
                                            {Object.keys(paymentCounts).length === 0 ? (
                                                <p className="py-12 text-center text-sm text-gray-400">No payment data yet.</p>
                                            ) : (
                                                <div className="mt-6 space-y-4">
                                                    {Object.entries(paymentCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                                                        <div key={status}>
                                                            <div className="mb-1.5 flex items-center justify-between text-xs">
                                                                <span className="font-medium text-gray-700">{PAYMENT_BARS[status]?.[0] ?? statusLabel(status)}</span>
                                                                <span className="tabular-nums text-gray-500">{count} <span className="text-gray-400">· {Math.round((count / submissions.length) * 100)}%</span></span>
                                                            </div>
                                                            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                                                <div className={`h-full rounded-full ${PAYMENT_BARS[status]?.[1] ?? 'bg-gray-400'}`} style={{ width: `${(count / maxPayment) * 100}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                                        <section className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">Popular categories</h3>
                                                    <p className="mt-1 text-xs text-gray-500">Most selected entries</p>
                                                </div>
                                                <span className="rounded-lg bg-violet-50 p-2 text-violet-700"><BarChart3 className="h-4 w-4" /></span>
                                            </div>
                                            {entries.categories.length === 0 ? (
                                                <p className="py-10 text-center text-sm text-gray-400">This form has no category entries.</p>
                                            ) : (
                                                <div className="mt-5 space-y-4">
                                                    {entries.categories.map((category) => (
                                                        <div key={category.label}>
                                                            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                                                                <span className="truncate font-medium text-gray-700">{category.label}</span>
                                                                <span className="shrink-0 tabular-nums text-gray-500">{category.count}</span>
                                                            </div>
                                                            <div className="h-1.5 rounded-full bg-gray-100">
                                                                <div className="h-full rounded-full bg-violet-500" style={{ width: `${(category.count / entries.categories[0].count) * 100}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </section>

                                        <section className="xl:col-span-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                                            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">Recent registrations</h3>
                                                    <p className="mt-0.5 text-xs text-gray-500">Latest activity for this form</p>
                                                </div>
                                                <Link to={`/forms/${encodeId(selectedForm.id)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-regx-orange hover:underline">
                                                    View all <ArrowUpRight className="h-3.5 w-3.5" />
                                                </Link>
                                            </div>
                                            {latest.length === 0 ? (
                                                <p className="p-8 text-center text-sm text-gray-400">No recent activity to show.</p>
                                            ) : (
                                                <div className="divide-y divide-gray-100">
                                                    {latest.map((row) => (
                                                        <div key={row.id} className="flex items-center gap-3 px-5 py-3">
                                                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gray-100 text-xs font-bold text-gray-500">
                                                                {(row.participant || '?').trim().slice(0, 1).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-sm font-semibold text-gray-800">{row.participant || row.reference}</p>
                                                                <p className="mt-0.5 truncate text-[11px] text-gray-400">{row.email || row.reference} · {formatDate(row.created_at)}</p>
                                                            </div>
                                                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                                                row.payment_status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                                                            }`}>
                                                                {statusLabel(row.payment_status)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-400">
                                        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> Report data refreshes each time you open or change forms.</span>
                                        <span>{submissions.length.toLocaleString('en-IN')} rows loaded</span>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </>
            ) : formsStatus === 'failed' ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    Could not load your forms. Refresh the page to try again.
                </div>
            ) : null}
        </div>
    );
};

const MetricCard = ({ label, value, hint, icon: Icon, tone }) => {
    const tones = {
        orange: 'bg-orange-50 text-orange-600',
        green: 'bg-emerald-50 text-emerald-600',
        blue: 'bg-blue-50 text-blue-600',
        violet: 'bg-violet-50 text-violet-600',
    };

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <p className="mt-2 truncate text-2xl font-bold tracking-tight text-gray-900">{value}</p>
                </div>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
                    <Icon className="h-5 w-5" />
                </span>
            </div>
            <p className="mt-3 truncate text-[11px] text-gray-400">{hint}</p>
        </div>
    );
};

export default Reports;

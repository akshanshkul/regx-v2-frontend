import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportExcelRows } from '../utils/submissionExport';

const money = (amount, currency = 'INR') =>
    `${currency === 'INR' ? '₹' : `${currency} `}${Number(amount || 0).toLocaleString('en-IN', {
        maximumFractionDigits: 2,
    })}`;

const label = (value) =>
    String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const STYLES = {
    paid: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    refunded: 'bg-gray-100 text-gray-600 border-gray-200',
    waived: 'bg-blue-50 text-blue-700 border-blue-200',
    abandoned: 'bg-orange-50 text-orange-700 border-orange-200',
};

/**
 * What a form that takes payment has earned, and who still owes.
 *
 * Built from the registrations already loaded for the report, so it agrees with
 * the table. A waived fee is shown on its own and never counted as collected.
 */
const PaymentReport = ({ submissions, formName }) => {
    const [exporting, setExporting] = useState(false);

    const charged = useMemo(() => submissions.filter((row) => Number(row.amount) > 0), [submissions]);
    const currency = charged[0]?.currency || 'INR';

    const sum = (rows) => rows.reduce((total, row) => total + Number(row.amount || 0), 0);

    const stats = useMemo(() => {
        const by = (predicate) => charged.filter(predicate);
        const paid = by((row) => row.payment_status === 'paid');

        return {
            billed: sum(charged),
            paid,
            online: paid.filter((row) => row.payment_method !== 'cash'),
            cash: paid.filter((row) => row.payment_method === 'cash'),
            owed: by((row) => ['pending', 'failed', 'abandoned'].includes(row.payment_status)),
            waived: by((row) => row.payment_status === 'waived'),
            refunded: by((row) => row.payment_status === 'refunded'),
        };
    }, [charged]);

    const cards = [
        ['Total billed', stats.billed, charged.length, 'text-gray-900'],
        ['Collected', sum(stats.paid), stats.paid.length, 'text-green-700'],
        ['Still to collect', sum(stats.owed), stats.owed.length, 'text-amber-700'],
        ['Waived', sum(stats.waived), stats.waived.length, 'text-blue-700'],
    ];

    const methods = [
        ['Online', stats.online],
        ['Cash', stats.cash],
    ];

    const exportSheet = async () => {
        setExporting(true);

        try {
            await exportExcelRows(
                {
                    columns: ['Reference', 'Participant', 'Email', 'Amount', 'Status', 'Method', 'Submitted'],
                    rows: charged.map((row) => [
                        row.reference,
                        row.participant ?? '',
                        row.email ?? '',
                        Number(row.amount),
                        label(row.payment_status),
                        row.payment_status === 'paid' ? label(row.payment_method || 'online') : '',
                        row.created_at ?? '',
                    ]),
                },
                `${formName} — payments`,
                'Payments'
            );
        } catch {
            toast.error('Could not export the payment report.');
        } finally {
            setExporting(false);
        }
    };

    if (charged.length === 0) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
                No registration on this form has a fee yet.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(([title, amount, count, tone]) => (
                    <div key={title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
                        <p className={`mt-2 text-2xl font-bold ${tone}`}>{money(amount, currency)}</p>
                        <p className="mt-1 text-xs text-gray-400">
                            {count} registration{count === 1 ? '' : 's'}
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
                    <h3 className="font-semibold text-gray-900">How it was paid</h3>

                    <dl className="mt-4 space-y-3">
                        {methods.map(([name, rows]) => (
                            <div key={name} className="flex items-center justify-between text-sm">
                                <dt className="text-gray-600">
                                    {name} <span className="text-gray-400">· {rows.length}</span>
                                </dt>
                                <dd className="font-semibold text-gray-900">{money(sum(rows), currency)}</dd>
                            </div>
                        ))}
                        {stats.refunded.length > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <dt className="text-gray-600">
                                    Refunded <span className="text-gray-400">· {stats.refunded.length}</span>
                                </dt>
                                <dd className="font-semibold text-gray-900">{money(sum(stats.refunded), currency)}</dd>
                            </div>
                        )}
                    </dl>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-3">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                        <div>
                            <h3 className="font-semibold text-gray-900">Payment by registration</h3>
                            <p className="mt-0.5 text-xs text-gray-500">Unpaid first</p>
                        </div>

                        <button
                            type="button"
                            onClick={exportSheet}
                            disabled={exporting}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-orange-300 hover:text-regx-orange disabled:opacity-50"
                        >
                            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                            Excel
                        </button>
                    </div>

                    <div className="max-h-[420px] overflow-auto">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-gray-50">
                                <tr>
                                    {['Reference', 'Participant', 'Amount', 'Status'].map((heading) => (
                                        <th key={heading} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {[...charged]
                                    .sort((a, b) => Number(a.payment_status === 'paid') - Number(b.payment_status === 'paid'))
                                    .map((row) => (
                                        <tr key={row.id}>
                                            <td className="px-4 py-2.5 font-mono text-xs text-gray-900">{row.reference}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{row.participant ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{money(row.amount, currency)}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`rounded border px-2 py-0.5 text-[11px] ${STYLES[row.payment_status] ?? 'border-gray-200 bg-gray-100 text-gray-600'}`}>
                                                    {label(row.payment_status)}
                                                    {row.payment_status === 'paid' && row.payment_method ? ` · ${label(row.payment_method)}` : ''}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default PaymentReport;

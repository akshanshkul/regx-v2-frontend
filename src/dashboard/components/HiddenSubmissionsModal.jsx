import React, { useCallback, useEffect, useState } from 'react';
import { X, Loader2, RotateCcw, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { parseServerDate } from '../../shared/utils/dates';
import { SubmissionDetail } from './SubmissionsTable';

const when = (value) =>
    parseServerDate(value).toLocaleString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

/**
 * The registrations that were reset or removed from view. They are still
 * stored, so this lists them with their full answers and lets one come back
 * without restoring everything.
 */
const HiddenSubmissionsModal = ({ formId, onClose, onRestored }) => {
    const [search, setSearch] = useState('');
    const [term, setTerm] = useState('');
    const [page, setPage] = useState(1);
    const [state, setState] = useState({ loading: true, rows: [], meta: null });
    const [open, setOpen] = useState(null);
    const [busy, setBusy] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setTerm(search.trim());
            setPage(1);
        }, 350);

        return () => clearTimeout(timer);
    }, [search]);

    const load = useCallback(async () => {
        setState((current) => ({ ...current, loading: true }));

        try {
            const response = await api.get(`/forms/${formId}/submissions`, {
                params: { hidden: 1, page, perPage: 25, search: term, sort: 'created_at', dir: 'desc' },
            });

            setState({ loading: false, rows: response.data ?? [], meta: response.meta ?? null });
        } catch (error) {
            setState({ loading: false, rows: [], meta: null });
            toast.error(error?.response?.data?.message || 'Could not load the hidden registrations.');
        }
    }, [formId, page, term]);

    useEffect(() => {
        load();
    }, [load]);

    const restore = async (row) => {
        setBusy(row.id);

        try {
            const response = await api.post(`/forms/${formId}/submissions/${row.id}/restore`);

            toast.success(response.message || 'Restored.');
            onRestored();
            await load();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not restore that registration.');
        } finally {
            setBusy(null);
        }
    };

    const { rows, meta, loading } = state;

    return (
        <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm px-4 py-8">
            <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl">
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Hidden registrations</h3>
                        <p className="text-xs text-gray-500">
                            Still stored, but not shown in lists, reports or counts. {meta ? `${meta.total} hidden.` : ''}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search reference, name, email…"
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                        />
                    </div>
                </div>

                {loading && rows.length === 0 ? (
                    <div className="py-16 flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : rows.length === 0 ? (
                    <p className="py-16 text-center text-sm text-gray-500">
                        {term ? 'Nothing hidden matches that search.' : 'No hidden registrations.'}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="w-8" />
                                    {['Reference', 'Participant', 'Amount', 'Payment', 'Hidden on', ''].map((heading, index) => (
                                        <th key={index} className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rows.map((row) => (
                                    <React.Fragment key={row.id}>
                                        <tr
                                            onClick={() => setOpen(open === row.id ? null : row.id)}
                                            className="cursor-pointer hover:bg-gray-50/60"
                                        >
                                            <td className="pl-3 text-gray-400">
                                                {open === row.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-900">{row.reference}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{row.participant ?? '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                ₹{Number(row.amount).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-4 py-3 text-xs capitalize text-gray-600">
                                                {row.payment_status?.replace('_', ' ')}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                {row.deleted_at ? when(row.deleted_at) : '—'}
                                            </td>
                                            <td className="pr-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    disabled={busy === row.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        restore(row);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange disabled:opacity-50"
                                                >
                                                    {busy === row.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                    )}
                                                    Restore
                                                </button>
                                            </td>
                                        </tr>

                                        {open === row.id && (
                                            <tr className="bg-gray-50/70">
                                                <td colSpan={7} className="px-4 py-4">
                                                    <SubmissionDetail row={row} />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {meta && meta.pages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                        <span>
                            Showing {meta.from}–{meta.to} of {meta.total}
                        </span>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                                aria-label="Previous page"
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-2">
                                Page {page} of {meta.pages}
                            </span>
                            <button
                                type="button"
                                disabled={page >= meta.pages}
                                onClick={() => setPage(page + 1)}
                                aria-label="Next page"
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
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

export default HiddenSubmissionsModal;

import React, { useCallback, useEffect, useState } from 'react';
import { Mail, Loader2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const REFRESH_SECONDS = 5;

/**
 * Emailing each recipient their own ID card or certificate.
 *
 * Generating comes first: only an up-to-date batch can be sent, so what
 * people receive is what is on screen. The send itself is queued in the
 * certificate service and goes out over the next minutes; this window shows
 * how far it has got and can be closed at any time.
 */
const SendCertificatesModal = ({ collection, onClose }) => {
    const what = collection.type === 'idcard' ? 'ID cards' : 'certificates';
    const upToDate = collection.canDownload && !collection.canGenerate;

    const [status, setStatus] = useState(null);
    const [sending, setSending] = useState(false);

    const load = useCallback(
        () =>
            api
                .get(`/certificates/${collection.id}/email`)
                .then((res) => setStatus(res.data ?? null))
                .catch(() => setStatus((s) => s ?? { total: 0, counts: {}, done: true, failures: [] })),
        [collection.id]
    );

    useEffect(() => {
        load();
    }, [load]);

    // Keep counting while anything is still queued.
    useEffect(() => {
        if (!status || status.done) return undefined;

        const timer = setTimeout(load, REFRESH_SECONDS * 1000);
        return () => clearTimeout(timer);
    }, [status, load]);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const send = async () => {
        setSending(true);

        try {
            const res = await api.post(`/certificates/${collection.id}/email/send`);
            toast.success(res.message || 'Queued.');
            setStatus(res.data ?? null);
            load();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not start sending.');
        } finally {
            setSending(false);
        }
    };

    const c = status?.counts ?? {};
    const waiting = (c.pending ?? 0) + (c.sending ?? 0);
    const finished = (c.sent ?? 0) + (c.failed ?? 0) + (c.skipped ?? 0);
    const percent = status?.total ? Math.round((finished / status.total) * 100) : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label={`Send ${what}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 text-regx-orange flex items-center justify-center shrink-0">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Send {what} to users</h3>
                            <p className="text-xs text-gray-500">
                                Each person gets their own as a PDF attachment, at the email on their registration.
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {!upToDate && (
                        <p className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            {collection.canDownload
                                ? 'Something changed since the last generate. Generate again first, so people receive the latest version.'
                                : `Generate the ${what} first — there is nothing to send yet.`}
                        </p>
                    )}

                    {status === null ? (
                        <div className="flex justify-center py-4 text-gray-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                    ) : status.total > 0 ? (
                        <div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-800">
                                    {status.done ? 'Last send' : 'Sending…'}
                                </span>
                                <span className="text-gray-500">{finished} of {status.total}</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden mt-2">
                                <span className="block h-full bg-regx-orange transition-all" style={{ width: `${percent}%` }} />
                            </div>
                            <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                                {[
                                    ['Sent', c.sent, 'text-green-700'],
                                    ['Waiting', waiting, 'text-gray-700'],
                                    ['Failed', c.failed, 'text-red-600'],
                                    ['No email', c.skipped, 'text-amber-700'],
                                ].map(([label, n, tone]) => (
                                    <div key={label} className="rounded-lg bg-gray-50 py-2">
                                        <p className={`text-lg font-bold ${tone}`}>{n ?? 0}</p>
                                        <p className="text-[11px] text-gray-500">{label}</p>
                                    </div>
                                ))}
                            </div>

                            {status.done && (c.failed ?? 0) + (c.skipped ?? 0) === 0 && (
                                <p className="flex items-center gap-1.5 text-sm text-green-700 mt-3">
                                    <CheckCircle2 className="w-4 h-4" /> Everyone in this batch has been sent theirs.
                                </p>
                            )}

                            {status.failures?.length > 0 && (
                                <details className="mt-3 text-xs">
                                    <summary className="cursor-pointer text-gray-600">Who did not get one, and why</summary>
                                    <ul className="mt-2 max-h-40 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
                                        {status.failures.map((f, i) => (
                                            <li key={i} className="px-2 py-1.5">
                                                <span className="font-medium text-gray-800">{f.to_name || f.to_email || '—'}</span>
                                                {f.to_email && <span className="text-gray-400"> · {f.to_email}</span>}
                                                <span className="block text-gray-500">{f.last_error}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Nothing has been sent from this collection yet.</p>
                    )}

                    <p className="text-[11px] text-gray-400">
                        Emails go out in the background, a few every minute — you can close this window. Sending the
                        same batch again never emails anyone twice.
                    </p>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={send}
                        disabled={!upToDate || sending || (status && !status.done)}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-regx-orange rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        Send to everyone
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SendCertificatesModal;

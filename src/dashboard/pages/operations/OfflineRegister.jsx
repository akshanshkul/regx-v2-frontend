import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Banknote, CheckCircle2, Loader2, QrCode, RotateCcw, UserPlus, X, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';
import DynamicForm from '../../../shared/forms/DynamicForm';
import { openCheckout } from '../../../forms/checkout';
import { useRouteIds } from '../../../shared/utils/ids';

/**
 * Registering someone at the desk.
 *
 * The same form the public sees, filled in by a member of staff. When it is
 * submitted the desk is asked how the fee was paid:
 *
 *   cash    settled here and now, and written into the payments ledger
 *   online  Razorpay opens on this screen — its UPI option is a QR code, which
 *           is turned to the person to scan — and the usual verification and
 *           webhook confirm it
 *
 * The registration is saved before money is asked for, so a payment that fails
 * costs nobody their form: the desk can try online again, or take cash, against
 * the same reference.
 */

const money = (amount, currency = 'INR') =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount) || 0);

const messageOf = (error, fallback) =>
    error?.response?.data?.messages?.error || error?.response?.data?.message || fallback;

/** How was it paid? Asked once the form itself is valid. */
const PaymentChoice = ({ amount, currency, onlineAvailable, busy, onChoose, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">How are they paying?</h2>
                <button onClick={onClose} disabled={busy !== null} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Close">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-5">
                <p className="text-sm text-gray-500">Amount to collect</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-0.5">{money(amount, currency)}</p>

                <div className="grid gap-3 mt-5">
                    <button
                        type="button"
                        onClick={() => onChoose('cash')}
                        disabled={busy !== null}
                        className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition disabled:opacity-50"
                    >
                        <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center shrink-0">
                            {busy === 'cash' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5" />}
                        </span>
                        <span>
                            <span className="block font-semibold text-gray-900">Cash</span>
                            <span className="block text-xs text-gray-500">You have the money in hand. Recorded as paid in cash.</span>
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onChoose('online')}
                        disabled={busy !== null || !onlineAvailable}
                        className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-regx-orange hover:bg-orange-50/50 text-left transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="w-10 h-10 rounded-xl bg-orange-50 text-regx-orange grid place-items-center shrink-0">
                            {busy === 'online' ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                        </span>
                        <span>
                            <span className="block font-semibold text-gray-900">Online — QR, UPI or card</span>
                            <span className="block text-xs text-gray-500">
                                {onlineAvailable
                                    ? 'Razorpay opens here. Choose UPI and turn the QR code to them to scan.'
                                    : 'Online payment is not set up on this server.'}
                            </span>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const OfflineRegister = () => {
    const { formId } = useRouteIds();

    const [state, setState] = useState({ loading: true, error: null, data: null });
    const [serverErrors, setServerErrors] = useState({});
    const [pending, setPending] = useState(null);      // { answers, fee } waiting on the payment choice
    const [busy, setBusy] = useState(null);            // 'cash' | 'online' | 'free'
    const [result, setResult] = useState(null);        // the registration, once saved
    const [round, setRound] = useState(0);             // remounts the form for the next person

    const polling = useRef(null);

    useEffect(() => {
        api.get(`/offline/forms/${formId}`)
            .then((response) => {
                setState({ loading: false, error: null, data: response.data });
                document.title = `${response.data.form.name} — desk registration`;
            })
            .catch((error) => setState({ loading: false, error: messageOf(error, 'Could not load the form'), data: null }));

        return () => clearInterval(polling.current);
    }, [formId]);

    const data = state.data;

    /**
     * The form is valid on this side. Ask the server what it costs — pricing is
     * worked out there, and the amount the desk asks for has to be the amount
     * that will be charged — then find out how they are paying.
     */
    /**
     * The desk attaches files through the same endpoint the public form uses —
     * it is the form's own upload path, and a registration taken at a table
     * should produce exactly the same record as one taken online.
     */
    const handleUpload = async (field, file) => {
        const body = new FormData();

        body.append('field', field.key);
        body.append('file', file);

        try {
            const response = await api.post(`/form/${data.form.slug}/upload`, body);

            return response.data;
        } catch (error) {
            const payload = error.response?.data;

            throw (
                payload?.messages?.file ||
                payload?.messages?._form ||
                payload?.message ||
                'That file could not be uploaded.'
            );
        }
    };

    const handleSubmit = async (answers) => {
        setServerErrors({});
        setBusy('free');

        try {
            const response = await api.post(`/offline/forms/${formId}/evaluate`, { answers });
            const { fee, currency, category } = response.data;

            if (fee > 0) {
                setBusy(null);
                setPending({ answers, fee, currency, category });
            } else {
                await send(answers, null);
            }
        } catch (error) {
            const messages = error?.response?.data?.messages;

            if (messages && typeof messages === 'object' && !messages.error) {
                setServerErrors(messages);
                toast.error('Some answers need fixing');
            } else {
                toast.error(messageOf(error, 'Could not check the registration'));
            }

            setBusy(null);
        }
    };

    const send = async (answers, paymentMethod) => {
        setBusy(paymentMethod ?? 'free');

        try {
            const response = await api.post(`/offline/forms/${formId}/submit`, { answers, paymentMethod });
            const saved = response.data;

            setPending(null);

            if (saved.paid) {
                setResult({ ...saved, stage: 'done' });
                toast.success(response.message);
            } else if (saved.payment) {
                setResult({ ...saved, stage: 'paying' });
                await collectOnline(saved, saved.payment, answers);
            } else {
                setResult({ ...saved, stage: 'unpaid', note: saved.paymentError });
            }
        } catch (error) {
            const messages = error?.response?.data?.messages;

            // Field errors go back onto the form; anything else is said aloud.
            if (messages && typeof messages === 'object' && !messages.error) {
                setServerErrors(messages);
                setPending(null);
                toast.error('Some answers need fixing');
            } else {
                toast.error(messageOf(error, 'Could not save the registration'));
            }
        } finally {
            setBusy(null);
        }
    };

    /** Razorpay on the desk's screen. Every way out of it ends somewhere sensible. */
    const collectOnline = async (saved, intent, answers = {}) => {
        let outcome;

        try {
            outcome = await openCheckout(intent, {
                name: answers.full_name || answers.name || answers.team_name || '',
                email: answers.email || '',
                contact: answers.phone || '',
            });
        } catch {
            setResult((current) => ({ ...current, stage: 'unpaid', note: 'The payment window could not be opened. Check the connection, or take cash.' }));
            return;
        }

        if (outcome.outcome !== 'paid') {
            api.post(`/form/${saved.slug}/payment/failed`, {
                razorpay_order_id: intent.orderId,
                code: outcome.error?.code ?? 'CHECKOUT_DISMISSED',
                description: outcome.error?.description ?? 'The payment window was closed.',
            }).catch(() => {});

            setResult((current) => ({
                ...current,
                stage: 'unpaid',
                note: outcome.outcome === 'failed' ? outcome.error?.description || 'The payment failed.' : 'The payment window was closed before it finished.',
            }));
            return;
        }

        try {
            const verified = await api.post(`/form/${saved.slug}/payment/verify`, outcome.response);

            if (verified.data?.status === 'paid') {
                setResult((current) => ({ ...current, stage: 'done', method: 'online' }));
                toast.success('Payment received');
                return;
            }
        } catch {
            // Falls through to waiting: the webhook may still confirm it.
        }

        setResult((current) => ({ ...current, stage: 'waiting' }));
        waitForPayment(saved);
    };

    /** Money can land a moment after the window closes; ask until it does. */
    const waitForPayment = (saved) => {
        let tries = 0;

        clearInterval(polling.current);

        polling.current = setInterval(async () => {
            tries += 1;

            try {
                const status = await api.get(`/form/${saved.slug}/status/${saved.reference}`);

                if (status.data?.paymentStatus === 'paid' || status.data?.status === 'paid') {
                    clearInterval(polling.current);
                    setResult((current) => ({ ...current, stage: 'done', method: 'online' }));
                    toast.success('Payment received');
                }
            } catch {
                // Try again on the next tick.
            }

            if (tries >= 20) {
                clearInterval(polling.current);
                setResult((current) => (current?.stage === 'waiting'
                    ? { ...current, stage: 'unpaid', note: 'No payment has arrived yet. If money left their account it will be matched to this reference automatically.' }
                    : current));
            }
        }, 3000);
    };

    const retryOnline = async () => {
        setBusy('online');

        try {
            const response = await api.post(`/offline/submissions/${result.id}/pay`);

            setResult((current) => ({ ...current, stage: 'paying', note: null }));
            await collectOnline({ ...result, slug: response.data.slug }, response.data.payment);
        } catch (error) {
            toast.error(messageOf(error, 'Could not open the payment'));
        } finally {
            setBusy(null);
        }
    };

    const tookCash = async () => {
        setBusy('cash');

        try {
            const response = await api.post(`/offline/submissions/${result.id}/cash`);

            clearInterval(polling.current);
            setResult((current) => ({ ...current, stage: 'done', method: 'cash' }));
            toast.success(response.message);
        } catch (error) {
            toast.error(messageOf(error, 'Could not record the cash'));
        } finally {
            setBusy(null);
        }
    };

    const next = () => {
        clearInterval(polling.current);
        setResult(null);
        setServerErrors({});
        setRound((value) => value + 1);
        window.scrollTo({ top: 0 });
    };

    if (state.loading) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    if (state.error) {
        return (
            <div className="max-w-md mx-auto text-center py-20">
                <p className="text-sm text-red-700">{state.error}</p>
                <Link to="/operations/offline" className="inline-block mt-5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium">
                    Back to forms
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-16">
            <div className="flex items-center gap-3 mb-6">
                <Link to="/operations/offline" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Back to forms">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="min-w-0">
                    <h1 className="text-xl font-bold text-gray-900 truncate">{data.form.name}</h1>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">Desk registration{data.event?.name ? ` · ${data.event.name}` : ''}</p>
                </div>
            </div>

            {result ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
                    {result.stage === 'done' && (
                        <>
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                            <h2 className="text-lg font-bold text-gray-900">Registered</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {Number(result.amount) > 0
                                    ? `${money(result.amount, result.currency)} received ${result.method === 'cash' ? 'in cash' : 'online'}.`
                                    : 'Nothing to pay for this registration.'}
                            </p>
                        </>
                    )}

                    {(result.stage === 'paying' || result.stage === 'waiting') && (
                        <>
                            <Loader2 className="w-10 h-10 text-regx-orange mx-auto mb-3 animate-spin" />
                            <h2 className="text-lg font-bold text-gray-900">
                                {result.stage === 'paying' ? 'Waiting for payment…' : 'Confirming the payment…'}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {result.stage === 'paying'
                                    ? 'Choose UPI in the payment window and turn the QR code to them to scan.'
                                    : 'The bank is taking a moment. This updates by itself.'}
                            </p>
                        </>
                    )}

                    {result.stage === 'unpaid' && (
                        <>
                            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                            <h2 className="text-lg font-bold text-gray-900">Registered — not paid yet</h2>
                            <p className="text-sm text-gray-500 mt-1">{result.note}</p>
                        </>
                    )}

                    <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200">
                        <span className="text-xs text-gray-500">Reference</span>
                        <span className="font-mono text-sm font-bold text-gray-900">{result.reference}</span>
                    </div>

                    {result.category && <p className="text-xs text-gray-500 mt-2">{result.category}</p>}

                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                        {result.stage === 'unpaid' && (
                            <>
                                <button
                                    onClick={tookCash}
                                    disabled={busy !== null}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {busy === 'cash' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />} Took cash instead
                                </button>
                                {data.onlineAvailable && (
                                    <button
                                        onClick={retryOnline}
                                        disabled={busy !== null}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        {busy === 'online' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Try online again
                                    </button>
                                )}
                            </>
                        )}

                        {(result.stage === 'done' || result.stage === 'unpaid') && (
                            <button
                                onClick={next}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-semibold hover:opacity-90"
                            >
                                <UserPlus className="w-4 h-4" /> Register the next person
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <DynamicForm
                    key={round}
                    schema={data.schema}
                    serverErrors={serverErrors}
                    isSubmitting={busy === 'free'}
                    onSubmit={handleSubmit}
                    onUpload={handleUpload}
                />
            )}

            {pending && (
                <PaymentChoice
                    amount={pending.fee}
                    currency={pending.currency}
                    onlineAvailable={data.onlineAvailable}
                    busy={busy}
                    onChoose={(method) => send(pending.answers, method)}
                    onClose={() => setPending(null)}
                />
            )}
        </div>
    );
};

export default OfflineRegister;

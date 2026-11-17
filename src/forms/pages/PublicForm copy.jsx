import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
    CheckCircle2, CalendarDays, MapPin, Lock, Loader2, AlertTriangle, CreditCard, Clock,
} from 'lucide-react';
import DynamicForm from '../../shared/forms/DynamicForm';
import Skeleton from '../../shared/components/Skeleton';
import { openCheckout } from '../checkout';
import { receiptState } from '../receiptState';

/**
 * Participant-facing registration form at /form/:slug.
 *
 * Uses a bare axios client rather than the shared api instance: this page is
 * public, and the shared instance attaches the organiser's token and bounces to
 * /login on a 401 — neither of which should ever happen to a participant.
 */
const publicApi = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081/api',
    headers: { Accept: 'application/json' },
});

const formatDate = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const Shell = ({ children }) => (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto">{children}</div>
    </div>
);

/**
 * Name, email and phone for the checkout's prefill, found by field type so it
 * works on any form without either side naming the other's keys.
 */
const guessPayer = (schema, answers = {}) => {
    const byType = (types, keys) => {
        const field = (schema?.fields ?? []).find(
            (f) => types.includes(f.type) || keys.includes(f.key)
        );

        const value = field ? answers[field.key] : null;

        return typeof value === 'string' ? value : '';
    };

    return {
        name: byType([], ['full_name', 'name', 'team_name', 'participant_name']),
        email: byType(['email'], ['email', 'manager_email']),
        phone: byType(['phone'], ['phone', 'manager_phone', 'mobile']),
    };
};

const PublicForm = () => {
    const { slug } = useParams();

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverErrors, setServerErrors] = useState({});
    const [receipt, setReceipt] = useState(null);

    // Where the payment stands, as the page understands it. The server is the
    // authority; this only decides what is on screen.
    //   idle | opening | verifying | paid | pending | failed | unpaid
    const [payment, setPayment] = useState({ stage: 'idle', message: null });

    // The answers just submitted, so a retry can prefill the checkout the same
    // way the first attempt did.
    const [lastAnswers, setLastAnswers] = useState({});

    // Read inside timers, where the state value would be the one captured when
    // the timer was scheduled.
    const receiptRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        publicApi
            .get(`/form/${slug}`)
            .then((response) => {
                if (!cancelled) setData(response.data.data);
            })
            .catch((error) => {
                if (cancelled) return;
                setLoadError(
                    error.response?.status === 404
                        ? 'This registration form does not exist, or is no longer available.'
                        : 'Could not load this form. Please try again.'
                );
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [slug]);

    const handleSubmit = async (answers) => {
        setIsSubmitting(true);
        setServerErrors({});

        try {
            const response = await publicApi.post(`/form/${slug}/submit`, { answers });
            const data = response.data.data;

            // The registration is saved at this point whatever happens next, so
            // the receipt is shown before any money is asked for.
            setReceipt(data);
            setLastAnswers(answers);
            window.scrollTo({ top: 0, behavior: 'smooth' });

            if (data.payment) {
                await runCheckout(data.payment, answers);
            } else if (data.paymentDue) {
                // A fee is owed but this form does not take it here, so the
                // participant is told how it will be collected rather than
                // being shown a button that cannot work.
                setPayment({
                    stage: data.paymentMode === 'online' ? 'unpaid' : 'offline',
                    message: data.paymentError ?? null,
                });
            }
        } catch (error) {
            const messages = error.response?.data?.messages;
            setServerErrors(
                messages && typeof messages === 'object'
                    ? messages
                    : { _form: 'Could not submit the registration. Please try again.' }
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Opens the checkout and reports whatever comes of it.
     *
     * Nothing here decides that a payment succeeded — the response is handed to
     * our own API, which checks the signature, and its answer is what the page
     * shows. Every other way out of the checkout leaves the registration
     * standing and offers another go.
     */
    const runCheckout = async (intent, answers = lastAnswers) => {
        setPayment({ stage: 'opening', message: null });

        let result;

        try {
            result = await openCheckout(intent, guessPayer(data?.schema, answers));
        } catch {
            setPayment({
                stage: 'unpaid',
                message: 'The payment window could not be opened. Please check your connection or '
                    + 'any ad blocker, then try again.',
            });
            return;
        }

        if (result.outcome === 'dismissed') {
            // Told to the server so the organiser can see the attempt was
            // abandoned rather than failing silently.
            publicApi
                .post(`/form/${slug}/payment/failed`, {
                    razorpay_order_id: intent.orderId,
                    code: 'CHECKOUT_DISMISSED',
                    description: 'The payment window was closed.',
                })
                .catch(() => { });

            setPayment({ stage: 'unpaid', message: 'You closed the payment window before it finished.' });
            return;
        }

        if (result.outcome === 'failed') {
            publicApi
                .post(`/form/${slug}/payment/failed`, {
                    razorpay_order_id: intent.orderId,
                    code: result.error?.code ?? 'PAYMENT_FAILED',
                    description: result.error?.description ?? 'The payment failed.',
                })
                .catch(() => { });

            setPayment({
                stage: 'failed',
                message: result.error?.description ?? 'That payment did not go through.',
            });
            return;
        }

        setPayment({ stage: 'verifying', message: null });

        try {
            const verified = await publicApi.post(`/form/${slug}/payment/verify`, result.response);
            const status = verified.data.data?.status;

            setPayment({
                stage: status === 'paid' ? 'paid' : 'pending',
                message: verified.data.message,
            });

            if (status !== 'paid') pollStatus();
        } catch {
            // The money may well have left their account — the server just did
            // not hear us say so. The webhook will settle it, so this polls
            // rather than declaring a failure.
            setPayment({
                stage: 'pending',
                message: 'We are confirming your payment with the bank. This page will update itself.',
            });

            pollStatus();
        }
    };

    /**
     * Waits for the server to agree the payment landed.
     *
     * Used whenever our confirmation did not get through: the webhook, or the
     * status endpoint asking Razorpay directly, will settle it within seconds.
     * Gives up after a while and tells the participant their reference rather
     * than spinning forever.
     */
    const pollStatus = () => {
        let tries = 0;

        const tick = async () => {
            tries += 1;

            try {
                const response = await publicApi.get(`/form/${slug}/status/${receiptRef.current}`);

                if (response.data.data?.paymentStatus === 'paid') {
                    setPayment({ stage: 'paid', message: 'Payment received.' });
                    return;
                }
            } catch {
                // Ignored — this is a retry loop, not the source of truth.
            }

            if (tries < 10) {
                setTimeout(tick, 3000);
            } else {
                setPayment({
                    stage: 'pending',
                    message: 'Your payment is still being confirmed. If money has left your account it '
                        + 'will be matched to this reference automatically — no need to pay again.',
                });
            }
        };

        setTimeout(tick, 2500);
    };

    /** Start again on a registration that was never paid. */
    const retryPayment = async () => {
        setPayment({ stage: 'opening', message: null });

        try {
            const response = await publicApi.post(`/form/${slug}/pay`, {
                reference: receiptRef.current,
            });

            const intent = response.data.data?.payment;

            if (!intent) {
                setPayment({ stage: 'paid', message: 'This registration is already paid.' });
                return;
            }

            await runCheckout(intent);
        } catch (error) {
            setPayment({
                stage: 'unpaid',
                message: error.response?.data?.messages?.error
                    ?? 'We could not start the payment. Please try again in a moment.',
            });
        }
    };

    useEffect(() => {
        receiptRef.current = receipt?.reference ?? null;
    }, [receipt?.reference]);

    if (isLoading) {
        return (
            <Shell>
                <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading registration form">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-3">
                        <Skeleton className="h-7 w-64" />
                        <Skeleton className="h-4 w-full max-w-sm" />
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-5">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i}>
                                <Skeleton className="h-3.5 w-32 mb-2" />
                                <Skeleton rounded="rounded-lg" className="h-11 w-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </Shell>
        );
    }

    if (loadError) {
        return (
            <Shell>
                <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center">
                    <h1 className="text-lg font-bold text-gray-900">Form unavailable</h1>
                    <p className="text-sm text-gray-500 mt-2">{loadError}</p>
                </div>
            </Shell>
        );
    }

    const { form, event, schema, acceptance } = data;

    if (receipt) {
        const { settled, inFlight, heading, message } = receiptState(receipt, payment);

        return (
            <Shell>
                <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center">
                    {settled ? (
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    ) : inFlight ? (
                        <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    ) : (
                        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    )}

                    <h1 className="text-xl font-bold text-gray-900">{heading}</h1>

                    <p className="text-sm text-gray-500 mt-2">{message}</p>

                    <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-gray-500">Reference</span>
                            <span className="font-mono text-sm font-semibold text-gray-900">{receipt.reference}</span>
                        </div>
                        {receipt.category && (
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-gray-500">Category</span>
                                <span className="text-sm font-semibold text-gray-900">{receipt.category}</span>
                            </div>
                        )}
                        {receipt.paymentDue && (
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-gray-500">Amount due</span>
                                <span className="text-sm font-bold text-gray-900">
                                    ₹ {Number(receipt.amount).toLocaleString('en-IN')}
                                </span>
                            </div>
                        )}
                    </div>

                    {receipt.paymentDue && (
                        <PaymentState
                            payment={payment}
                            onRetry={retryPayment}
                            amount={receipt.amount}
                            mode={receipt.paymentMode}
                        />
                    )}

                    <p className="text-xs text-gray-400 mt-4">Keep this reference for your records.</p>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="w-full overflow-hidden rounded-xl mb-2">
                {event?.eventBannerUrl && (
                    <img
                        src={event.eventBannerUrl}
                        alt=""
                        className="block w-full h-auto max-h-64 sm:max-h-72 lg:max-h-80 object-cover rounded-xl"
                    />
                )}
            </div>

            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6">
                <div className="flex items-start gap-4">

                    {event?.logoUrl && (
                        <img
                            src={event.logoUrl}
                            alt=""
                            className="w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0"
                        />
                    )}

                    <div className="min-w-0 flex-1">
                        {/* Form title */}
                        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-gray-900 font-display">
                            {form.name}
                        </h1>

                        {/* Event / organiser name */}
                        {event?.name && (
                            <p className="mt-2 text-base text-gray-700">
                                {event.name}
                            </p>
                        )}

                        {/* Google Forms-style divider */}
                        <div className="my-4 border-t border-gray-200" />

                        {/* Form description */}
                        {form.description && (
                            <p className="text-sm sm:text-base leading-6 text-gray-600 whitespace-pre-line">
                                {form.description}
                            </p>
                        )}

                        {/* Event details */}
                        {event && (event.date || event.venue || event.state) && (
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-gray-500">
                                {event.date && (
                                    <span className="inline-flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-gray-400" />
                                        <span>{formatDate(event.date)}</span>
                                    </span>
                                )}

                                {event.venue && (
                                    <span className="inline-flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        <span>
                                            {[event.venue, event.state]
                                                .filter(Boolean)
                                                .join(', ')}
                                        </span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {acceptance.open ? (
                <DynamicForm
                    schema={schema}
                    serverErrors={serverErrors}
                    isSubmitting={isSubmitting}
                    onSubmit={handleSubmit}
                />
            ) : (
                <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center">
                    <Lock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <h2 className="font-bold text-gray-900">Registration closed</h2>
                    <p className="text-sm text-gray-500 mt-1">{acceptance.reason}</p>
                </div>
            )}

            <p className="text-center text-xs text-gray-400 mt-8">Powered by RegX</p>
        </Shell>
    );
};


/**
 * What is happening with the money, in the participant's terms.
 *
 * Deliberately never says "failed" for something that might still succeed: a
 * payment we have not heard back about is "being confirmed", because telling
 * someone their payment failed when it did not is how people pay twice.
 */
const PaymentState = ({ payment, onRetry, amount, mode }) => {
    const money = `₹ ${Number(amount).toLocaleString('en-IN')}`;

    if (payment.stage === 'paid') {
        return (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-left flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-green-900">Payment received — {money}</p>
                    <p className="text-xs text-green-800 mt-0.5">
                        Your place is confirmed. A record of this payment is on your registration.
                    </p>
                </div>
            </div>
        );
    }

    if (payment.stage === 'opening' || payment.stage === 'verifying') {
        return (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left flex items-start gap-3">
                <Loader2 className="w-5 h-5 text-gray-400 shrink-0 mt-0.5 animate-spin" />
                <div>
                    <p className="text-sm font-semibold text-gray-900">
                        {payment.stage === 'opening' ? 'Opening the payment window…' : 'Confirming your payment…'}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                        Please keep this page open.
                    </p>
                </div>
            </div>
        );
    }

    if (payment.stage === 'pending') {
        return (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-amber-900">Payment is being confirmed</p>
                    <p className="text-xs text-amber-800 mt-0.5">
                        {payment.message
                            || 'This usually takes a few seconds. Do not pay again — if the money has '
                            + 'left your account it will be matched to this reference automatically.'}
                    </p>
                </div>
            </div>
        );
    }

    // A fee is owed, but not through this page. No button, because there is
    // nothing here for it to do — what the participant needs is to know the fee
    // is real and how it will be collected.
    if (payment.stage === 'offline' || mode !== 'online') {
        return (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-amber-900">{money} is payable</p>
                    <p className="text-xs text-amber-800 mt-0.5">
                        This fee is not collected on this page. The organiser will arrange it with you —
                        keep your reference to hand.
                    </p>
                </div>
            </div>
        );
    }

    // Not paid, and nothing in flight: declined, dismissed, or never started.
    return (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{money} is still to pay</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                        {payment.message || 'Your registration is saved. It is confirmed once the fee is paid.'}
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={onRetry}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-regx-orange text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
                <CreditCard className="w-4 h-4" />
                Pay {money} now
            </button>
        </div>
    );
};

export default PublicForm;

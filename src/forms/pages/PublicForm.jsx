import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import FormHead from '../../shared/forms/FormHead';
import axios from 'axios';
import {
    CheckCircle2, CalendarDays, MapPin, Lock, Loader2, AlertTriangle, CreditCard, Clock,
} from 'lucide-react';
import DynamicForm from '../../shared/forms/DynamicForm';
import Skeleton from '../../shared/components/Skeleton';
import { openCheckout } from '../checkout';
import { receiptState } from '../receiptState';
import {
    DEFAULT_THEME, THEMES, themeFor, loadThemeFont,
    customThemeStyle, customThemeClasses, loadCustomFonts, normaliseCustom,
} from '../themes';
import '../formThemes.css';

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


const getImageAccent = (url, fallback = '#f97316') => new Promise((resolve) => {
    if (!url || typeof window === 'undefined') return resolve(fallback);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 40;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, 40, 40);

            const pixels = ctx.getImageData(0, 0, 40, 40).data;
            const buckets = new Map();

            for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
                if (a < 180) continue;

                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const saturation = max ? (max - min) / max : 0;

                if (max > 245 || max < 35 || saturation < 0.18) continue;

                const key = `${Math.round(r / 24) * 24},${Math.round(g / 24) * 24},${Math.round(b / 24) * 24}`;
                buckets.set(key, (buckets.get(key) || 0) + 1);
            }

            let winner = null;
            let count = 0;
            buckets.forEach((value, key) => {
                if (value > count) {
                    winner = key;
                    count = value;
                }
            });

            if (!winner) return resolve(fallback);

            const [r, g, b] = winner.split(',').map(Number);
            resolve(`#${[r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`);
        } catch {
            resolve(fallback);
        }
    };

    img.onerror = () => resolve(fallback);
    img.src = url;
});

const getReadableText = (hex) => {
    const clean = String(hex || '').replace('#', '');
    if (clean.length !== 6) return '#ffffff';

    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);

    return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) > 0.62
        ? '#111827'
        : '#ffffff';
};

const hexToRgb = (hex) => {
    const clean = String(hex || '').replace('#', '');
    if (clean.length !== 6) return { r: 249, g: 115, b: 22 };

    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16),
    };
};

const luminance = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

/**
 * The page frame in the form's theme: background, width and the accent the
 * theme's CSS reads. Every state of the page — loading, closed, the form, the
 * receipt — sits in the same frame, so the look holds from first paint to the
 * end of payment.
 */
const Shell = ({ theme = DEFAULT_THEME, accent, custom, children }) => {
    const rgb = hexToRgb(accent || themeFor(theme).accent);

    // The custom theme carries its own colours, accent included; every other
    // theme takes the accent worked out for it from the event's pictures.
    const style = theme === 'custom'
        ? customThemeStyle(custom)
        : {
            '--rf-accent': accent || themeFor(theme).accent,
            '--rf-accent-rgb': `${rgb.r}, ${rgb.g}, ${rgb.b}`,
            '--rf-accent-text': getReadableText(accent || themeFor(theme).accent),
            // The older names, still read by the payment panel.
            '--regx-accent': accent || themeFor(theme).accent,
            '--regx-accent-text': getReadableText(accent || themeFor(theme).accent),
        };

    return (
        <div
            className={`rf-theme rf-theme--${theme}${theme === 'custom' ? ` ${customThemeClasses(custom)}` : ''}`}
            style={style}
        >
            <div className="rf-bg" aria-hidden="true" />
            <div className="rf-wrap">{children}</div>
        </div>
    );
};

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
    const [searchParams] = useSearchParams();

    const [data, setData] = useState(null);
    // The colour taken from the event's banner or logo. Null until there is
    // one, so the theme's own accent shows instead.
    const [imageAccent, setImageAccent] = useState(null);
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

    useEffect(() => {
        const source = data?.event?.eventBannerUrl || data?.event?.logoUrl;
        if (!source) return;

        let cancelled = false;
        getImageAccent(source, null).then((color) => {
            if (!cancelled) setImageAccent(color);
        });

        return () => {
            cancelled = true;
        };
    }, [data?.event?.eventBannerUrl, data?.event?.logoUrl]);

    // ?theme= lets the builder show a theme before it is saved; otherwise the
    // form's own choice.
    const requested = searchParams.get('theme');
    const theme = THEMES.some((t) => t.key === requested)
        ? requested
        : themeFor(data?.form?.settings?.theme).key;

    const custom = data?.form?.settings?.customTheme;

    useEffect(() => {
        if (theme === 'custom') loadCustomFonts(custom);
        else loadThemeFont(themeFor(theme));
    }, [theme, custom]);

    // Wording the custom theme lets the organiser set; blank keeps the default.
    const wording = theme === 'custom' ? normaliseCustom(custom) : null;

    // The banner's colour where it suits the theme. On a dark ground a dark
    // banner colour would vanish; on paper or white a washed-out one would.
    const accentColor = (() => {
        const own = themeFor(theme);
        if (!imageAccent) return own.accent;

        const light = luminance(imageAccent);
        if (own.ground === 'dark' && light < 0.42) return own.accent;
        if (own.ground === 'paper' && light > 0.62) return own.accent;
        if (own.ground === 'light' && light > 0.8) return own.accent;

        return imageAccent;
    })();

    /**
     * Sends one attached file and hands back the reference the answer keeps.
     *
     * Separate from submitting so a file that is too big or the wrong type is
     * refused while the participant is still looking at that question, rather
     * than after they have filled in everything else.
     */
    const handleUpload = async (field, file) => {
        const body = new FormData();

        body.append('field', field.key);
        body.append('file', file);

        try {
            const response = await publicApi.post(`/form/${slug}/upload`, body);

            return response.data.data;
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
            <Shell theme={theme} custom={custom}>
                <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading registration form">
                    <div className="rf-panel bg-white p-6 rounded-2xl border border-gray-200 space-y-3">
                        <Skeleton className="h-7 w-64" />
                        <Skeleton className="h-4 w-full max-w-sm" />
                    </div>
                    <div className="rf-panel bg-white p-6 rounded-2xl border border-gray-200 space-y-5">
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
            <Shell theme={theme} custom={custom}>
                <div className="rf-panel bg-white p-10 rounded-2xl border border-gray-200 text-center">
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
            <Shell theme={theme} custom={custom} accent={accentColor}>
                <div className="rf-panel bg-white p-10 rounded-2xl border border-gray-200 text-center">
                    {settled ? (
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    ) : inFlight ? (
                        <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    ) : (
                        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    )}

                    <h1 className="rf-panel-title text-xl font-bold text-gray-900">{heading}</h1>

                    <p className="text-sm text-gray-500 mt-2">{message}</p>

                    {/* A category that was already full: they wait for a place in it. */}
                    {receipt.waitlisted?.length > 0 && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900">
                            <p className="font-semibold">You are on the waitlist for:</p>
                            <ul className="mt-1 list-disc pl-5">
                                {receipt.waitlisted.map((c) => <li key={c}>{c}</li>)}
                            </ul>
                            <p className="mt-1 text-xs text-amber-800">
                                {receipt.waitlisted.length === 1 ? 'This category is' : 'These categories are'} full. You move in automatically, in the order you registered, if a place opens.
                            </p>
                        </div>
                    )}

                    <div className="rf-summary mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2">
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
                                <span className="rf-total text-sm font-bold text-gray-900">
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

    const venue = [event?.venue, event?.state].filter(Boolean).join(', ');

    // Up to three, in the order the organiser set them. An API from before
    // the logo row sends only the event's.
    const logos = data.logos ?? (event?.logoUrl ? [event.logoUrl] : []);

    return (
        <Shell theme={theme} custom={custom} accent={accentColor}>
            {/* Title, description, share image and structured data, as the API
                resolved them. The server sends the same block for a cold load. */}
            <FormHead seo={data?.seo} />

            {/* The logos stand on the page above the header box, spread across
                its width, rather than crowded inside it. */}
            {logos.length > 0 && (
                <div className={`rf-logos${logos.length > 1 ? ' has-many' : ''}`}>
                    {logos.map((src) => (
                        <img key={src} src={src} alt="" className="rf-logo w-14 h-14 rounded-xl object-contain" />
                    ))}
                </div>
            )}

            <header className="rf-hero bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
                {event?.eventBannerUrl && <img src={event.eventBannerUrl} alt="" className="rf-banner" />}

                <div className="rf-hero-body p-6 flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                        <p className="rf-eyebrow">{wording?.eyebrow || event?.name || 'Registration form'}</p>

                        <h1 className="rf-title text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                            {form.name}
                        </h1>

                        <div className="rf-rule" aria-hidden="true" />

                        {form.description && (
                            <p className="rf-desc text-sm sm:text-base leading-6 text-gray-600 whitespace-pre-line">
                                {form.description}
                            </p>
                        )}

                        {event && (event.date || venue) && (
                            <div className="rf-meta">
                                {event.date && (
                                    <span className="rf-chip">
                                        <CalendarDays aria-hidden="true" />
                                        {formatDate(event.date)}
                                    </span>
                                )}
                                {venue && (
                                    <span className="rf-chip">
                                        <MapPin aria-hidden="true" />
                                        {venue}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {acceptance.open ? (
                <DynamicForm
                    schema={schema}
                    serverErrors={serverErrors}
                    isSubmitting={isSubmitting}
                    onSubmit={handleSubmit}
                    onUpload={handleUpload}
                    submitLabel={wording?.submitLabel || undefined}
                />
            ) : (
                <div className="rf-panel bg-white p-10 rounded-2xl border border-gray-200 text-center">
                    <Lock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <h2 className="rf-panel-title font-bold text-gray-900">Registration closed</h2>
                    <p className="text-sm text-gray-500 mt-1">{acceptance.reason}</p>
                </div>
            )}

            <footer className="rf-footer mt-10 text-center text-xs">
                <p className="font-semibold tracking-wide">Powered by RegX</p>
                <nav className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                    <a href="/privacy">Privacy Policy</a>
                    <a href="/terms">Terms & Conditions</a>
                    <a href="/refund">Refund Policy</a>
                    <a href="/dpdp-policy">Data Protection Policy</a>
                    <a href="/contact">Contact Us</a>
                </nav>
            </footer>
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
                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--regx-accent)', color: 'var(--regx-accent-text)' }}
            >
                <CreditCard className="w-4 h-4" />
                Pay {money} now
            </button>
        </div>
    );
};

export default PublicForm;

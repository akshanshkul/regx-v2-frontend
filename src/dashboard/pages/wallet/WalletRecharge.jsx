import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { selectUser } from '../../../store/slices/authSlice';
import Button from '../../../shared/components/Button';
import Spinner from '../../../shared/components/Spinner';
import { loadCheckout } from '../../../forms/checkout';
import WalletNav from './WalletNav';
import { formatInr, formatRp } from './walletFormat';

const WalletRecharge = () => {
    const navigate = useNavigate();
    const user = useSelector(selectUser);
    const [catalog, setCatalog] = useState(null);
    const [selectedRule, setSelectedRule] = useState(null);
    const [customAmount, setCustomAmount] = useState('');
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);

    useEffect(() => {
        api.get('/wallet/recharge-plans')
            .then((response) => {
                if (!response?.success) throw new Error(response?.message || 'Could not load recharge options.');
                setCatalog(response.data);
            })
            .catch((error) => toast.error(error.response?.data?.message || error.message || 'Could not load recharge options.'))
            .finally(() => setLoading(false));
    }, []);

    const selected = useMemo(
        () => catalog?.plans?.find((plan) => plan.id === selectedRule) || null,
        [catalog?.plans, selectedRule]
    );
    const customValue = Number(customAmount);
    const customValid = Number.isFinite(customValue)
        && customValue >= Number(catalog?.minAmount || 0)
        && customValue <= Number(catalog?.maxAmount || 0);
    const matchingTierAmount = customValid
        ? (catalog?.plans || []).reduce((highest, plan) => (
            Number(plan.minimumAmount) <= customValue
                ? Math.max(highest, Number(plan.minimumAmount))
                : highest
        ), -Infinity)
        : -Infinity;
    const matchingPlans = Number.isFinite(matchingTierAmount)
        ? (catalog?.plans || []).filter((plan) => Number(plan.minimumAmount).toFixed(2) === matchingTierAmount.toFixed(2))
        : [];
    const rpCredited = selected && customValid
        ? customValue * Number(selected.rpMultiplier)
        : 0;
    const expiryDays = selected?.expiryDays;

    const startRecharge = async () => {
        if (!selected || !customValid) {
            toast.error('Enter an amount and choose one of its matched recharge options.');
            return;
        }

        setPaying(true);
        try {
            const orderResponse = await api.post('/wallet/recharge/create-order', {
                rule_id: selected.id,
                amount: Number(customValue.toFixed(2)),
            });
            if (!orderResponse?.success) throw new Error(orderResponse?.message || 'Could not create the payment order.');

            const intent = orderResponse.data;
            const Razorpay = await loadCheckout();
            const checkout = new Razorpay({
                key: intent.keyId,
                order_id: intent.orderId,
                amount: intent.amountPaise,
                currency: intent.currency,
                name: 'RegX',
                description: `Recharge ${formatRp(intent.rpCredited)}`,
                prefill: {
                    name: user?.name || '',
                    email: user?.email || '',
                    contact: user?.phone || '',
                },
                theme: { color: '#F26522' },
                handler: async (paymentResponse) => {
                    try {
                        await api.post('/wallet/recharge/verify-payment', {
                            razorpay_order_id: paymentResponse.razorpay_order_id,
                            razorpay_payment_id: paymentResponse.razorpay_payment_id,
                            razorpay_signature: paymentResponse.razorpay_signature,
                        });
                        toast.success(`${formatRp(intent.rpCredited)} added to your wallet.`);
                        window.dispatchEvent(new Event('regx:wallet-updated'));
                        navigate('/dashboard/wallet', { replace: true });
                    } catch (error) {
                        toast.error(error.response?.data?.message
                            || 'Payment was received but could not yet be verified. Your wallet will update after confirmation.');
                    } finally {
                        setPaying(false);
                    }
                },
                modal: {
                    ondismiss: () => setPaying(false),
                    escape: true,
                    confirm_close: true,
                },
            });

            checkout.on('payment.failed', (event) => {
                setPaying(false);
                toast.error(event?.error?.description || 'Payment did not complete. No RP was added.');
            });
            checkout.open();
        } catch (error) {
            setPaying(false);
            toast.error(
                error.response?.data?.messages?.error
                || error.response?.data?.message
                || error.message
                || 'Could not start wallet recharge.'
            );
        }
    };

    if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Spinner size="lg" /></div>;

    return (
        <div className="mx-auto max-w-8xl pb-12"> 
            <div className="mb-6">
                <p className="text-sm font-semibold text-regx-orange">RegX Paisa</p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">Recharge wallet</h1>
                <p className="mt-1 text-sm text-gray-500">Enter an amount to see the matching RP and expiry options. Credits are added after payment confirmation.</p>
            </div>
            <WalletNav />

            {!catalog?.enabled ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
                    Wallet recharges are not enabled right now.
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                    <div className="space-y-6">
                        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h2 className="font-semibold text-gray-900">Recharge amount</h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Enter between {formatInr(catalog.minAmount)} and {formatInr(catalog.maxAmount)}.
                                The highest matching tier is applied.
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <span className="text-sm font-medium text-gray-600">₹</span>
                                <input
                                    type="number"
                                    min={catalog.minAmount}
                                    max={catalog.maxAmount}
                                    step="0.01"
                                    value={customAmount}
                                    onChange={(event) => {
                                        setCustomAmount(event.target.value);
                                        setSelectedRule(null);
                                    }}
                                    placeholder="Enter INR amount"
                                    className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-regx-orange focus:outline-none focus:ring-1 focus:ring-regx-orange"
                                />
                            </div>
                        </section>

                        {customValid && matchingPlans.length > 0 && (
                            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                <h2 className="font-semibold text-gray-900">
                                    Options for the {formatInr(matchingTierAmount)} tier
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Your entered amount is {formatInr(customValue)}. Choose one option below.
                                </p>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {matchingPlans.map((plan) => (
                                        <button
                                            key={plan.id}
                                            type="button"
                                            onClick={() => setSelectedRule(plan.id)}
                                            className={`rounded-xl border p-4 text-left transition ${
                                                selectedRule === plan.id
                                                    ? 'border-regx-orange bg-orange-50 ring-1 ring-regx-orange'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <span className="block text-sm font-semibold text-gray-800">
                                                {plan.expiryDays ? `Valid for ${plan.expiryDays} days` : 'No expiry'}
                                            </span>
                                            <span className="mt-2 block text-lg font-bold text-regx-orange">
                                                {formatRp(customValue * Number(plan.rpMultiplier))}
                                            </span>
                                            <span className="mt-1 block text-xs text-gray-500">
                                                {plan.rpMultiplier} RP per ₹1
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}
                        {customValid && matchingPlans.length === 0 && (
                            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                No recharge tier matches this amount yet.
                            </p>
                        )}

                    </div>

                    <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="font-semibold text-gray-900">Recharge summary</h2>
                        {selected && customValid ? (
                            <>
                                <dl className="mt-4 space-y-3 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">You pay</dt><dd className="font-semibold text-gray-900">{formatInr(customValue)}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">RP received</dt><dd className="font-semibold text-regx-orange">{formatRp(rpCredited)}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">Conversion rate</dt><dd className="font-medium text-gray-900">{selected.rpMultiplier} RP / INR</dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">Validity</dt><dd className="font-medium text-gray-900">{expiryDays ? `${expiryDays} days` : 'No expiry'}</dd>
                                    </div>
                                </dl>
                                <div className="mt-5 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-900">
                                    <CalendarClock className="mr-1 inline h-4 w-4" />
                                    Expiry is calculated from successful payment time.
                                </div>
                                <Button className="mt-5 w-full" isLoading={paying} onClick={startRecharge} disabled={paying}>
                                    <CreditCard className="mr-2 h-4 w-4" />Pay securely
                                </Button>
                                <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-gray-500">
                                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                                    RP is credited after server-side payment confirmation. Recharges are non-refundable.
                                </p>
                                <p className="mt-3 flex items-center gap-1 text-xs text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4" /> Secure Razorpay checkout
                                </p>
                            </>
                        ) : (
                            <p className="mt-3 text-sm text-gray-500">Enter an amount and choose one of its matching options to see the summary.</p>
                        )}
                    </aside>
                </div>
            )}
        </div>
    );
};

export default WalletRecharge;

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Clock3, Coins } from 'lucide-react';
import api from '../../services/api';
import Button from '../../shared/components/Button';
import Spinner from '../../shared/components/Spinner';
import { formatInr, formatRp } from '../../dashboard/pages/wallet/walletFormat';

const Pricing = () => {
    const [catalog, setCatalog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let active = true;

        api.get('/wallet/recharge-plans')
            .then((response) => {
                if (!response?.success) {
                    throw new Error(response?.message || 'Could not load RP pricing.');
                }
                if (active) setCatalog(response.data);
            })
            .catch((requestError) => {
                if (active) {
                    setError(
                        requestError.response?.data?.message
                        || requestError.message
                        || 'Could not load RP pricing.'
                    );
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [retry]);

    const plans = catalog?.plans || [];

    return (
        <div className="min-h-screen bg-[#Fbfaf8] pb-20 pt-32">
            <Helmet>
                <title>RP Recharge Pricing | RegX Paisa</title>
                <meta
                    name="description"
                    content="View RegX Paisa recharge options, RP rates, minimum amounts and credit validity before adding RP to your wallet."
                />
                <meta property="og:title" content="RP Recharge Pricing | RegX Paisa" />
                <meta
                    property="og:description"
                    content="Compare current RegX Paisa recharge options, RP rates and validity."
                />
                <link rel="canonical" href="https://regx.techcov.in/pricing" />
            </Helmet>

            <div className="mx-auto max-w-6xl px-4">
                <header className="mx-auto max-w-3xl text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-regx-orange">RegX Paisa</p>
                    <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
                        RP recharge pricing
                    </h1>
                    <p className="mt-4 text-base leading-7 text-gray-600 md:text-lg">
                        Compare available recharge options by minimum amount, RP rate and validity.
                        Your wallet receives RP after your payment is confirmed.
                    </p>
                </header>

                {loading ? (
                    <div className="flex min-h-64 items-center justify-center">
                        <Spinner size="lg" />
                    </div>
                ) : error ? (
                    <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                        <p className="text-sm text-red-800">{error}</p>
                        <Button
                            className="mt-4"
                            variant="light"
                            onClick={() => {
                                setLoading(true);
                                setError('');
                                setRetry((value) => value + 1);
                            }}
                        >
                            Try again
                        </Button>
                    </div>
                ) : !catalog?.enabled ? (
                    <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900">
                        RP recharges are temporarily unavailable.
                    </div>
                ) : plans.length === 0 ? (
                    <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
                        RP recharge options are not available yet. Please check back later.
                    </div>
                ) : (
                    <>
                        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {plans.map((plan) => (
                                <article key={plan.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                                        <Coins className="h-4 w-4 text-regx-orange" />
                                        RP recharge option
                                    </div>
                                    <p className="mt-5 text-sm text-gray-500">Minimum recharge</p>
                                    <p className="mt-1 text-2xl font-bold text-gray-900">{formatInr(plan.minimumAmount)}</p>
                                    <div className="mt-5 rounded-xl bg-orange-50 p-4">
                                        <p className="text-sm text-gray-600">RP at the minimum recharge</p>
                                        <p className="mt-1 text-2xl font-bold text-regx-orange">{formatRp(plan.rpCredited)}</p>
                                        <p className="mt-1 text-xs text-gray-600">
                                            {plan.rpMultiplier} RP per ₹1 paid
                                        </p>
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                                        <Clock3 className="h-4 w-4 shrink-0 text-gray-400" />
                                        {plan.expiryDays ? `Valid for ${plan.expiryDays} days` : 'No expiry'}
                                    </div>
                                </article>
                            ))}
                        </div>

                        <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-6 text-gray-500">
                            The selected RP rate applies to the actual recharge amount. Credit validity depends on the option chosen.
                        </p>
                    </>
                )}

                <section className="mx-auto mt-12 flex max-w-3xl flex-col items-center justify-between gap-5 rounded-2xl border border-orange-100 bg-orange-50/70 p-6 text-center sm:flex-row sm:text-left">
                    <div>
                        <h2 className="font-semibold text-gray-900">Ready to add RP to your wallet?</h2>
                        <p className="mt-1 text-sm text-gray-600">Sign in to choose an amount and complete a secure recharge.</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-center gap-3">
                        <Link to="/login">
                            <Button variant="light">Sign in</Button>
                        </Link>
                        <Link to="/signup">
                            <Button>Get started <ArrowRight className="ml-2 h-4 w-4" /></Button>
                        </Link>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Pricing;

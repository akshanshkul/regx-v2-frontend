import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Coins, History, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import Button from '../../../shared/components/Button';
import Spinner from '../../../shared/components/Spinner';
import WalletNav from './WalletNav';
import { formatRp, formatWalletDate } from './walletFormat';

const transactionName = (type) => ({
    recharge_credit: 'Recharge credit',
    welcome_credit: 'Welcome credit',
    service_debit: 'Service debit',
    expired_rp: 'Expired RP',
    refund: 'Refund',
    credit_adjustment: 'Credit adjustment',
}[type] || String(type || 'Wallet activity').replaceAll('_', ' '));

const WalletOverview = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadWallet = useCallback(async () => {
        try {
            const response = await api.get('/wallet');
            if (!response?.success) throw new Error(response?.message || 'Could not load wallet.');
            setData(response.data);
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Could not load wallet.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadWallet();
        window.addEventListener('regx:wallet-updated', loadWallet);
        return () => window.removeEventListener('regx:wallet-updated', loadWallet);
    }, [loadWallet]);

    if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Spinner size="lg" /></div>;

    const wallet = data?.wallet || {};
    const cards = [
        { label: 'Available RP', value: formatRp(wallet.availableBalance), icon: Coins, tone: 'text-regx-orange bg-orange-50' },
        { label: 'Total recharged', value: formatRp(wallet.totalRecharged), icon: TrendingUp, tone: 'text-emerald-700 bg-emerald-50' },
        { label: 'Total consumed', value: formatRp(wallet.totalConsumed), icon: TrendingDown, tone: 'text-blue-700 bg-blue-50' },
        { label: 'Total expired', value: formatRp(wallet.totalExpired), icon: Clock3, tone: 'text-gray-700 bg-gray-100' },
    ];

    return (
        <div className="mx-auto  pb-12">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-regx-orange">RegX Paisa</p>
                    <h1 className="mt-1 text-2xl font-bold text-gray-900">Your RP wallet</h1>
                    <p className="mt-1 text-sm text-gray-500">Recharge RP and keep track of your wallet activity.</p>
                </div>
                <Link to="/dashboard/wallet/recharge">
                    <Button><Plus className="mr-2 h-4 w-4" />Recharge wallet</Button>
                </Link>
            </div>

            <WalletNav />

            {!data?.settings?.isEnabled && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Wallet recharges are not enabled yet. Your existing balance and history remain available.
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(({ label, value, icon: Icon, tone }) => (
                    <section key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-500">{label}</p>
                            <span className={`rounded-lg p-2 ${tone}`}><Icon className="h-4 w-4" /></span>
                        </div>
                        <p className="mt-4 text-2xl font-bold text-gray-900">{value}</p>
                    </section>
                ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                        <div className="flex items-center gap-2">
                            <History className="h-4 w-4 text-gray-400" />
                            <h2 className="font-semibold text-gray-900">Recent activity</h2>
                        </div>
                        <Link className="inline-flex items-center gap-1 text-sm font-medium text-regx-orange" to="/dashboard/wallet/transactions">
                            All activity <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    {(data?.recentTransactions || []).length === 0 ? (
                        <p className="p-6 text-sm text-gray-500">Your wallet transactions will appear here.</p>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {data.recentTransactions.map((transaction) => (
                                <div key={transaction.id} className="flex items-center justify-between gap-4 px-5 py-4">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium capitalize text-gray-900">
                                            {transactionName(transaction.transaction_type)}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {formatWalletDate(transaction.created_at)}
                                        </p>
                                    </div>
                                    <p className={`shrink-0 text-sm font-semibold ${
                                        Number(transaction.credit_amount) > 0 ? 'text-emerald-700' : 'text-gray-900'
                                    }`}>
                                        {Number(transaction.credit_amount) > 0 ? '+' : '-'}
                                        {formatRp(Number(transaction.credit_amount) > 0
                                            ? transaction.credit_amount
                                            : transaction.debit_amount)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-5 py-4">
                        <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-gray-400" />
                            <h2 className="font-semibold text-gray-900">Upcoming expiry</h2>
                        </div>
                    </div>
                    {(data?.upcomingExpiries || []).length === 0 ? (
                        <p className="p-5 text-sm text-gray-500">No RP lots are currently due to expire.</p>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {data.upcomingExpiries.map((lot) => (
                                <div key={lot.id} className="flex items-center justify-between gap-4 px-5 py-4">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{formatRp(lot.remaining_rp)}</p>
                                        <p className="mt-1 text-xs text-gray-500">Expires {formatWalletDate(lot.expires_at)}</p>
                                    </div>
                                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">Active</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default WalletOverview;

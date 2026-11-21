import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
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

const WalletTransactions = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        api.get('/wallet/transactions')
            .then((response) => {
                if (!response?.success) throw new Error(response?.message || 'Could not load RP activity.');
                if (active) setRows(response.data || []);
            })
            .catch((error) => {
                if (active) toast.error(error.response?.data?.message || error.message || 'Could not load RP activity.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, []);

    return (
        <div className="mx-auto pb-12">
            <div className="mb-6">
                <p className="text-sm font-semibold text-regx-orange">RegX Paisa</p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">RP activity</h1>
                <p className="mt-1 text-sm text-gray-500">A ledger of credits, expiry events, and future service usage.</p>
            </div>
            <WalletNav />

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex min-h-48 items-center justify-center"><Spinner /></div>
                ) : rows.length === 0 ? (
                    <div className="p-10 text-center">
                        <Activity className="mx-auto h-8 w-8 text-gray-300" />
                        <p className="mt-3 font-medium text-gray-900">No wallet activity yet</p>
                        <p className="mt-1 text-sm text-gray-500">Every wallet credit and expiry will be recorded here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-5 py-3">Transaction</th>
                                    <th className="px-5 py-3">RP change</th>
                                    <th className="px-5 py-3">Balance after</th>
                                    <th className="px-5 py-3">Reference</th>
                                    <th className="px-5 py-3">Date</th>
                                    <th className="px-5 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rows.map((row) => {
                                    const credit = Number(row.credit_amount) > 0;
                                    return (
                                        <tr key={row.id}>
                                            <td className="px-5 py-4">
                                                <p className="font-medium capitalize text-gray-900">{transactionName(row.transaction_type)}</p>
                                                <p className="mt-1 text-xs text-gray-500">{row.description}</p>
                                            </td>
                                            <td className={`px-5 py-4 font-semibold ${credit ? 'text-emerald-700' : 'text-gray-900'}`}>
                                                {credit ? '+' : '-'}{formatRp(credit ? row.credit_amount : row.debit_amount)}
                                            </td>
                                            <td className="px-5 py-4 font-medium text-gray-900">{formatRp(row.balance_after)}</td>
                                            <td className="px-5 py-4 text-gray-600">{row.reference_id || '—'}</td>
                                            <td className="px-5 py-4 text-gray-600">{formatWalletDate(row.created_at)}</td>
                                            <td className="px-5 py-4">
                                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">{row.status}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default WalletTransactions;

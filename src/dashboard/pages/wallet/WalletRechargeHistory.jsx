import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import Spinner from '../../../shared/components/Spinner';
import WalletNav from './WalletNav';
import { formatInr, formatRp, formatWalletDate } from './walletFormat';

const filters = ['all', 'success', 'pending', 'failed', 'expired'];

const statusClass = (status) => ({
    success: 'bg-emerald-50 text-emerald-700',
    credited: 'bg-emerald-50 text-emerald-700',
    expired: 'bg-amber-50 text-amber-800',
    pending: 'bg-blue-50 text-blue-700',
    failed: 'bg-red-50 text-red-700',
}[status] || 'bg-gray-100 text-gray-700');

const WalletRechargeHistory = () => {
    const [status, setStatus] = useState('all');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        const query = status === 'all' ? '' : `?status=${encodeURIComponent(status)}`;
        api.get(`/wallet/recharge-history${query}`)
            .then((response) => {
                if (!response?.success) throw new Error(response?.message || 'Could not load recharge history.');
                if (active) setRows(response.data || []);
            })
            .catch((error) => {
                if (active) toast.error(error.response?.data?.message || error.message || 'Could not load recharge history.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [status]);

    return (
        <div className="mx-auto  pb-12">
            <div className="mb-6">
                <p className="text-sm font-semibold text-regx-orange">RegX Paisa</p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">Recharge history</h1>
                <p className="mt-1 text-sm text-gray-500">Payments and the RP credited to your wallet.</p>
            </div>
            <WalletNav />

            <div className="mb-4 flex flex-wrap gap-2">
                {filters.map((filter) => (
                    <button
                        key={filter}
                        type="button"
                        onClick={() => setStatus(filter)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${
                            status === filter ? 'bg-regx-orange text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex min-h-48 items-center justify-center"><Spinner /></div>
                ) : rows.length === 0 ? (
                    <div className="p-10 text-center">
                        <History className="mx-auto h-8 w-8 text-gray-300" />
                        <p className="mt-3 font-medium text-gray-900">No recharges found</p>
                        <p className="mt-1 text-sm text-gray-500">Completed and pending wallet recharges will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-5 py-3">Recharge</th>
                                    <th className="px-5 py-3">RP credited</th>
                                    <th className="px-5 py-3">Payment</th>
                                    <th className="px-5 py-3">Wallet credit</th>
                                    <th className="px-5 py-3">Purchased</th>
                                    <th className="px-5 py-3">Expires</th>
                                    <th className="px-5 py-3">Razorpay reference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rows.map((row) => (
                                    <tr key={row.id}>
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-gray-900">{formatInr(row.recharge_amount)}</p>
                                            <p className="mt-1 text-xs text-gray-500">Recharge #{row.id}</p>
                                        </td>
                                        <td className="px-5 py-4 font-semibold text-regx-orange">{formatRp(row.rp_credited)}</td>
                                        <td className="px-5 py-4">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(row.payment_status)}`}>
                                                {row.payment_status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(row.wallet_credit_status)}`}>
                                                {row.wallet_credit_status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-gray-600">{formatWalletDate(row.credited_at || row.created_at)}</td>
                                        <td className="px-5 py-4 text-gray-600">{formatWalletDate(row.expires_at)}</td>
                                        <td className="px-5 py-4 text-xs text-gray-500">
                                            {row.razorpay_payment_id || row.razorpay_order_id || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default WalletRechargeHistory;

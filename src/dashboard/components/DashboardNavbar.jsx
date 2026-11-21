import React, { useCallback, useEffect, useState } from 'react';
import { Coins, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AccountSwitcher from './AccountSwitcher';
import NotificationBell from './NotificationBell';
import api from '../../services/api';

const DashboardNavbar = ({ setIsOpen }) => {
    const { user } = useAuth();
    const [walletBalance, setWalletBalance] = useState(null);
    
    // Get initials
    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

    const loadWalletBalance = useCallback(async () => {
        if (!user?.id) {
            setWalletBalance(null);
            return;
        }

        try {
            const response = await api.get('/wallet/balance');
            if (!response?.success || !Number.isFinite(Number(response?.data?.availableBalance))) {
                throw new Error(response?.message || 'Wallet balance response was invalid.');
            }
            setWalletBalance(Number(response.data.availableBalance));
        } catch (error) {
            console.warn('Could not load RP wallet balance:', error);
            setWalletBalance(null);
        }
    }, [user?.id]);

    useEffect(() => {
        loadWalletBalance();
        window.addEventListener('regx:wallet-updated', loadWalletBalance);
        return () => window.removeEventListener('regx:wallet-updated', loadWalletBalance);
    }, [loadWalletBalance]);

    return (
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
                <button 
                    onClick={() => setIsOpen(true)}
                    className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
                >
                    <Menu className="w-6 h-6" />
                </button>

                <div className="hidden lg:flex items-center bg-gray-100 px-3 py-2 rounded-lg w-full max-w-md border border-gray-200 focus-within:bg-white focus-within:border-regx-orange focus-within:ring-1 focus-within:ring-regx-orange transition-all">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input 
                        type="text" 
                        placeholder="Search players, events, teams..." 
                        className="bg-transparent border-none focus:outline-none w-full ml-2 text-sm text-gray-700 placeholder-gray-400"
                    />
                    <div className="hidden sm:flex items-center text-xs text-gray-400 font-medium px-2 py-0.5 rounded border border-gray-200 bg-gray-50 whitespace-nowrap">
                        Ctrl + K
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Link
                    to="/dashboard/wallet"
                    className="inline-flex items-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm font-semibold text-regx-orange hover:bg-orange-100"
                    title="RegX Paisa wallet balance"
                >
                    <Coins className="h-4 w-4" />
                    <span>{walletBalance === null ? 'RP Wallet' : `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(walletBalance)} RP`}</span>
                </Link>

                {/* Only for someone who belongs to more than one account. */}
                <AccountSwitcher />

                <NotificationBell />
                <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{user?.email}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-regx-orange/10 text-regx-orange flex items-center justify-center font-bold text-sm border border-regx-orange/20">
                        {user?.avatar ? (
                            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                        ) : initials}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default DashboardNavbar;

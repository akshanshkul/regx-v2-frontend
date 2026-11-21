import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, CircleDollarSign, History, Wallet } from 'lucide-react';

const links = [
    { to: '/dashboard/wallet', label: 'Overview', icon: Wallet, end: true },
    { to: '/dashboard/wallet/recharge', label: 'Recharge', icon: CircleDollarSign },
    { to: '/dashboard/wallet/recharge-history', label: 'Recharges', icon: History },
    { to: '/dashboard/wallet/transactions', label: 'RP activity', icon: Activity },
];

const WalletNav = () => (
    <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-gray-200 pb-2">
        {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-orange-50 text-regx-orange' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                <Icon className="h-4 w-4" />
                {label}
            </NavLink>
        ))}
    </nav>
);

export default WalletNav;

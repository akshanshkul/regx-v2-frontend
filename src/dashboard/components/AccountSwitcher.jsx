import React, { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import api, { getAccountId, setAccountId } from '../../services/api';

/**
 * Which account the dashboard is showing.
 *
 * Someone invited into another organiser's team has two: their own, and the
 * one they were invited to. Nothing appears at all for the usual case of a
 * person who is only in their own.
 *
 * Switching reloads the page, because every screen was loaded with the other
 * account's data.
 */
const AccountSwitcher = () => {
    const [accounts, setAccounts] = useState([]);
    const [open, setOpen] = useState(false);
    const box = useRef(null);

    useEffect(() => {
        api.get('/accounts')
            .then((response) => setAccounts(response.data ?? []))
            .catch(() => setAccounts([]));
    }, []);

    useEffect(() => {
        const away = (event) => {
            if (box.current && !box.current.contains(event.target)) setOpen(false);
        };

        document.addEventListener('mousedown', away);

        return () => document.removeEventListener('mousedown', away);
    }, []);

    if (accounts.length < 2) {
        return null;
    }

    const currentId = getAccountId() ?? accounts[0].id;
    const current = accounts.find((account) => account.id === currentId) ?? accounts[0];

    const choose = (account) => {
        setAccountId(account.id === accounts[0].id ? null : account.id);
        window.location.reload();
    };

    return (
        <div className="relative" ref={box}>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm hover:border-gray-300 transition-colors max-w-[15rem]"
            >
                <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate font-medium text-gray-700">{current.name}</span>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                    <p className="px-3 py-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase border-b border-gray-100">
                        Accounts
                    </p>

                    {accounts.map((account) => (
                        <button
                            key={account.id}
                            type="button"
                            onClick={() => choose(account)}
                            className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center gap-2"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{account.name}</p>
                                <p className="text-xs text-gray-500 truncate">
                                    {account.role === 'owner' ? 'Your account' : `You are ${account.role} here`}
                                </p>
                            </div>
                            {account.id === current.id && <Check className="w-4 h-4 text-regx-orange shrink-0" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AccountSwitcher;

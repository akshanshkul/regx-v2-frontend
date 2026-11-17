import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
    Wallet, Landmark, Smartphone, Plus, Star, Pencil, Trash2, X, Loader2,
    ArrowUpRight, Search, RefreshCw, CheckCircle2, Clock, AlertTriangle, Ban,
    ShieldCheck, ShieldAlert, ShieldQuestion, Zap,
} from 'lucide-react';
import {
    fetchPayoutOverview, fetchBanks, fetchPayoutHistory, savePayoutAccount,
    deletePayoutAccount, makePayoutAccountDefault, verifyPayoutAccount,
    savePayoutSettings, requestPayout, cancelPayout,
} from '../../store/slices/payoutsSlice';
import { parseServerDate } from '../../shared/utils/dates';

const money = (value) => `₹ ${Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLES = {
    requested: { label: 'Requested', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    processing: { label: 'Processing', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: Loader2 },
    paid: { label: 'Paid', className: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
    failed: { label: 'Failed', className: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 border-gray-200', icon: Ban },
};

/** Where an account stands: money only goes to a verified one. */
const VERIFICATION = {
    unverified: { label: 'Not verified', className: 'bg-gray-100 text-gray-600 border-gray-200', icon: ShieldQuestion },
    pending: { label: 'Verification pending', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    verified: { label: 'Verified', className: 'bg-green-50 text-green-700 border-green-200', icon: ShieldCheck },
    failed: { label: 'Verification failed', className: 'bg-red-50 text-red-700 border-red-200', icon: ShieldAlert },
};

const formatDate = (value) =>
    value
        ? parseServerDate(value).toLocaleString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })
        : '—';

const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none';

const Field = ({ label, hint, children }) => (
    <label className="block">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <div className="mt-1">{children}</div>
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
    </label>
);

/**
 * Add or change where money is sent.
 *
 * A bank account and a UPI id need different things, so the form asks for one
 * or the other rather than showing both and hoping.
 */
const AccountForm = ({ account, banks, saving, onClose, onSave }) => {
    const [form, setForm] = useState(() => ({
        type: account?.type ?? 'bank',
        label: account?.label ?? '',
        holderName: account?.holderName ?? '',
        mobile: account?.mobile ?? '',
        bankCode: account?.bankCode ?? '',
        accountNumber: '',
        ifsc: account?.ifsc ?? '',
        upiId: account?.upiId ?? '',
        isDefault: account?.isDefault ?? false,
    }));

    const set = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }));

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-900">
                        {account ? 'Edit payout account' : 'Add payout account'}
                    </h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Bank or UPI */}
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            ['bank', 'Bank account', Landmark],
                            ['upi', 'UPI', Smartphone],
                        ].map(([value, label, Icon]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setForm((current) => ({ ...current, type: value }))}
                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                                    form.type === value
                                        ? 'border-regx-orange bg-orange-50 text-regx-orange'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                <Icon className="w-4 h-4" /> {label}
                            </button>
                        ))}
                    </div>

                    <Field label="Account holder name">
                        <input value={form.holderName} onChange={set('holderName')} className={inputClass} placeholder="As it appears at the bank" />
                    </Field>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Mobile number" hint="Used for payout updates">
                            <input value={form.mobile} onChange={set('mobile')} className={inputClass} placeholder="10-digit mobile" inputMode="numeric" />
                        </Field>

                        <Field label="Label" hint="Optional — e.g. Club account">
                            <input value={form.label} onChange={set('label')} className={inputClass} placeholder="Optional" />
                        </Field>
                    </div>

                    {form.type === 'bank' ? (
                        <>
                            <Field label="Bank">
                                <select value={form.bankCode} onChange={set('bankCode')} className={inputClass}>
                                    <option value="">Select a bank</option>
                                    {banks.map((bank) => (
                                        <option key={bank.code} value={bank.code}>{bank.name}</option>
                                    ))}
                                </select>
                            </Field>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Account number" hint={account ? 'Leave blank to keep the saved number' : '9 to 18 digits'}>
                                    <input
                                        value={form.accountNumber}
                                        onChange={set('accountNumber')}
                                        className={inputClass}
                                        placeholder={account?.accountMasked ?? 'Account number'}
                                        inputMode="numeric"
                                    />
                                </Field>

                                <Field label="IFSC" hint="e.g. HDFC0001234">
                                    <input
                                        value={form.ifsc}
                                        onChange={(e) => setForm((current) => ({ ...current, ifsc: e.target.value.toUpperCase() }))}
                                        className={`${inputClass} uppercase`}
                                        placeholder="IFSC code"
                                    />
                                </Field>
                            </div>
                        </>
                    ) : (
                        <Field label="UPI id" hint="e.g. name@okhdfcbank">
                            <input value={form.upiId} onChange={set('upiId')} className={inputClass} placeholder="yourname@bank" />
                        </Field>
                    )}

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={form.isDefault}
                            onChange={(e) => setForm((current) => ({ ...current, isDefault: e.target.checked }))}
                            className="accent-regx-orange"
                        />
                        Use this account for payouts by default
                    </label>
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onSave(form)}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {account ? 'Save changes' : 'Add account'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/** Ask for money to be sent. */
const RequestForm = ({ balance, accounts, saving, onClose, onRequest }) => {
    // Money only goes to an account that has been checked.
    const usable = accounts.filter((account) => account.verification.verified);

    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState(usable.find((a) => a.isDefault)?.id ?? usable[0]?.id ?? '');
    const [notes, setNotes] = useState('');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
            <div role="dialog" aria-modal="true" className="w-full max-w-md bg-white rounded-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-900">Request a payout</h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex items-center justify-between">
                        <span className="text-sm text-gray-600">Available</span>
                        <span className="text-lg font-bold text-gray-900">{money(balance?.available)}</span>
                    </div>

                    <Field label="Amount" hint={`Minimum ${money(balance?.minimum)}`}>
                        <input
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={inputClass}
                            placeholder="0.00"
                            inputMode="decimal"
                        />
                    </Field>

                    {usable.length === 0 && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                            None of your accounts is verified yet. Verify one before requesting a payout.
                        </p>
                    )}

                    <Field label="To">
                        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
                            {usable.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.type === 'upi' ? account.upiId : `${account.bankName} ${account.accountMasked}`}
                                    {account.isDefault ? ' (default)' : ''}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Note" hint="Optional, for your own records">
                        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Optional" />
                    </Field>

                    <button
                        type="button"
                        onClick={() => setAmount(String(balance?.available ?? 0))}
                        className="text-xs font-medium text-regx-orange hover:underline"
                    >
                        Request everything available
                    </button>
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onRequest({ amount: Number(amount), accountId, notes })}
                        disabled={saving || usable.length === 0}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                        Request payout
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Pay out on its own, once the balance is worth moving.
 *
 * Only offered with a verified account, because this fires when nobody is
 * watching — an error nobody reads is worse than asking each time.
 */
const AutoPayout = ({ settings, accounts, saving, onSave }) => {
    const verified = accounts.filter((account) => account.verification.verified);

    const [enabled, setEnabled] = useState(settings?.autoEnabled ?? false);
    const [threshold, setThreshold] = useState(String(settings?.autoThreshold ?? 1000));
    const [accountId, setAccountId] = useState(settings?.autoAccountId ?? verified[0]?.id ?? '');

    useEffect(() => {
        if (!settings) return;

        setEnabled(settings.autoEnabled);
        setThreshold(String(settings.autoThreshold));
        setAccountId(settings.autoAccountId ?? verified[0]?.id ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings]);

    return (
        <section className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
                <span className="p-2 rounded-lg bg-orange-50 text-regx-orange shrink-0"><Zap className="w-5 h-5" /></span>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <h2 className="font-semibold text-gray-900">Automatic payouts</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Pay out on its own once the available balance reaches a limit you set.
                            </p>
                        </div>

                        <button
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                            onClick={() => setEnabled((on) => !on)}
                            disabled={verified.length === 0}
                            className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-40 ${enabled ? 'bg-regx-orange' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
                        </button>
                    </div>

                    {verified.length === 0 ? (
                        <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                            Verify an account first — automatic payouts run unattended, so they only go to a verified account.
                        </p>
                    ) : (
                        enabled && (
                            <div className="mt-3 grid sm:grid-cols-[10rem_1fr_auto] gap-3 items-end">
                                <Field label="Pay out when balance reaches" hint={`Minimum ₹500`}>
                                    <input
                                        value={threshold}
                                        onChange={(e) => setThreshold(e.target.value)}
                                        className={inputClass}
                                        inputMode="decimal"
                                    />
                                </Field>

                                <Field label="Into">
                                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
                                        {verified.map((account) => (
                                            <option key={account.id} value={account.id}>
                                                {account.type === 'upi' ? account.upiId : `${account.bankName} ${account.accountMasked}`}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <button
                                    type="button"
                                    onClick={() => onSave({ autoEnabled: true, autoThreshold: Number(threshold), autoAccountId: accountId })}
                                    disabled={saving}
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
                                </button>
                            </div>
                        )
                    )}

                    {settings?.autoEnabled && !enabled && (
                        <button
                            type="button"
                            onClick={() => onSave({ autoEnabled: false })}
                            className="mt-3 text-xs font-medium text-red-600 hover:underline"
                        >
                            Turn automatic payouts off
                        </button>
                    )}

                    {settings?.autoEnabled && settings.lastRunAt && (
                        <p className="mt-2 text-[11px] text-gray-400">Last automatic payout {formatDate(settings.lastRunAt)}</p>
                    )}
                </div>
            </div>
        </section>
    );
};

/**
 * Payouts: what is available, where it goes, and everything that has gone.
 */
const Payouts = () => {
    const dispatch = useDispatch();

    const { balance, accounts, settings, summary, banks, history, meta, loading, saving } = useSelector((state) => state.payouts);

    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const [editing, setEditing] = useState(null); // account | 'new' | null
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        document.title = 'Payouts';
        dispatch(fetchPayoutOverview());
        dispatch(fetchBanks());
    }, [dispatch]);

    useEffect(() => {
        dispatch(fetchPayoutHistory({ page, status, search }));
    }, [dispatch, page, status, search]);

    const reload = () => {
        dispatch(fetchPayoutOverview());
        dispatch(fetchPayoutHistory({ page, status, search }));
    };

    const act = async (thunk, args, success) => {
        const result = await dispatch(thunk(args));

        if (result.error) {
            toast.error(result.payload ?? 'That did not work');
            return false;
        }

        toast.success(success);
        return true;
    };

    const saveAccount = async (form) => {
        const payload = { ...form, id: editing === 'new' ? undefined : editing?.id };

        // An edit that leaves the number blank keeps the stored one.
        if (payload.id && payload.type === 'bank' && !payload.accountNumber) {
            toast.error('Enter the account number again to save changes.');
            return;
        }

        if (await act(savePayoutAccount, payload, editing === 'new' ? 'Payout account added' : 'Payout account updated')) {
            setEditing(null);
        }
    };

    const cards = useMemo(() => ([
        { label: 'Available', value: balance?.available, icon: Wallet, className: 'bg-green-50/60 text-green-600' },
        { label: 'On its way', value: balance?.inFlight, icon: Clock, className: 'bg-amber-50/60 text-amber-600' },
        { label: 'Paid out', value: balance?.paidOut, icon: CheckCircle2, className: 'bg-blue-50/60 text-blue-600' },
        { label: 'Collected', value: balance?.collected, icon: ArrowUpRight, className: 'bg-gray-50 text-gray-600' },
    ]), [balance]);

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Payouts</h1>
                    <p className="text-xs text-gray-500 mt-1">Move what you have collected into your bank account or UPI.</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={reload}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>

                    <button
                        type="button"
                        onClick={() => (accounts.length === 0 ? setEditing('new') : setRequesting(true))}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90"
                    >
                        <ArrowUpRight className="w-4 h-4" /> Request payout
                    </button>
                </div>
            </div>

            {/* Balance */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card) => (
                    <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{card.label}</p>
                            <span className={`p-1.5 rounded-lg ${card.className}`}><card.icon className="w-4 h-4" /></span>
                        </div>
                        <p className="text-xl font-bold text-gray-900 mt-2">{balance ? money(card.value) : '—'}</p>
                    </div>
                ))}
            </div>

            {/* Accounts */}
            <section className="bg-white border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Payout accounts</h2>
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange"
                    >
                        <Plus className="w-4 h-4" /> Add account
                    </button>
                </div>

                {accounts.length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-500">
                        {loading ? 'Loading…' : 'No payout account yet. Add one to receive money.'}
                    </p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {accounts.map((account) => (
                            <li key={account.id} className="p-4 flex items-center gap-3 flex-wrap">
                                <span className="p-2 rounded-lg bg-gray-100 text-gray-600">
                                    {account.type === 'upi' ? <Smartphone className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium text-gray-900">
                                            {account.type === 'upi' ? account.upiId : account.bankName}
                                        </p>

                                        {(() => {
                                            const state = VERIFICATION[account.verification.status] ?? VERIFICATION.unverified;

                                            return (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${state.className}`}>
                                                    <state.icon className="w-3 h-3" /> {state.label}
                                                </span>
                                            );
                                        })()}

                                        {account.isDefault && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[11px] font-medium border border-green-200">
                                                <Star className="w-3 h-3" /> Default
                                            </span>
                                        )}
                                        {account.label && <span className="text-xs text-gray-400">{account.label}</span>}
                                    </div>
                                    {account.verification.note && (
                                        <p className="text-[11px] text-gray-500 mt-1">{account.verification.note}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {account.holderName}
                                        {account.type === 'bank' && ` · ${account.accountMasked} · ${account.ifsc}`}
                                        {` · ${account.mobile}`}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1">
                                    {!account.verification.verified && account.verification.status !== 'pending' && (
                                        <button
                                            type="button"
                                            onClick={() => act(verifyPayoutAccount, { id: account.id }, 'Sent for verification')}
                                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-regx-orange hover:bg-orange-50"
                                        >
                                            Verify
                                        </button>
                                    )}
                                    {!account.isDefault && (
                                        <button
                                            type="button"
                                            onClick={() => act(makePayoutAccountDefault, { id: account.id }, 'Default account updated')}
                                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
                                        >
                                            Make default
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setEditing(account)}
                                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                                        aria-label="Edit account"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => act(deletePayoutAccount, { id: account.id }, 'Payout account removed')}
                                        className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                                        aria-label="Remove account"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <AutoPayout
                settings={settings}
                accounts={accounts}
                saving={saving}
                onSave={(body) => act(savePayoutSettings, body, body.autoEnabled ? 'Automatic payouts are on' : 'Automatic payouts are off')}
            />

            {/* History */}
            <section className="bg-white border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100 flex-wrap">
                    <h2 className="font-semibold text-gray-900">
                        Payout history
                        {summary && <span className="text-xs font-normal text-gray-500 ml-2">{summary.count} in total · {money(summary.paid)} paid</span>}
                    </h2>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Reference or UTR"
                                className="border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-regx-orange focus:border-regx-orange"
                            />
                        </div>

                        <select
                            value={status}
                            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white outline-none"
                        >
                            <option value="">All statuses</option>
                            {Object.entries(STATUS_STYLES).map(([value, { label }]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {history.length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-500">{loading ? 'Loading…' : 'No payouts yet.'}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-4 py-2.5 font-semibold">Reference</th>
                                    <th className="px-4 py-2.5 font-semibold">To</th>
                                    <th className="px-4 py-2.5 font-semibold text-right">Amount</th>
                                    <th className="px-4 py-2.5 font-semibold">Status</th>
                                    <th className="px-4 py-2.5 font-semibold">Requested</th>
                                    <th className="px-4 py-2.5 font-semibold">UTR</th>
                                    <th className="px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.map((payout) => {
                                    const state = STATUS_STYLES[payout.status] ?? STATUS_STYLES.requested;

                                    return (
                                        <tr key={payout.id} className="hover:bg-gray-50/60">
                                            <td className="px-4 py-3 font-mono text-xs text-gray-700">{payout.reference}</td>
                                            <td className="px-4 py-3">
                                                <p className="text-gray-900">{payout.destination}</p>
                                                {payout.bankName && <p className="text-xs text-gray-500">{payout.bankName}</p>}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{money(payout.amount)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${state.className}`}>
                                                    <state.icon className={`w-3 h-3 ${payout.status === 'processing' ? 'animate-spin' : ''}`} />
                                                    {state.label}
                                                </span>
                                                {payout.failureReason && <p className="text-[11px] text-red-600 mt-1">{payout.failureReason}</p>}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">{formatDate(payout.requestedAt)}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500">{payout.utr ?? '—'}</td>
                                            <td className="px-4 py-3 text-right">
                                                {payout.status === 'requested' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => act(cancelPayout, { id: payout.id }, 'Payout cancelled')}
                                                        className="text-xs font-medium text-gray-500 hover:text-red-600"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {meta && meta.pages > 1 && (
                    <div className="flex items-center justify-between p-3 border-t border-gray-100 text-sm">
                        <span className="text-xs text-gray-500">Page {meta.page} of {meta.pages} · {meta.total} payouts</span>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={meta.page <= 1}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={meta.page >= meta.pages}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {editing && (
                <AccountForm
                    account={editing === 'new' ? null : editing}
                    banks={banks}
                    saving={saving}
                    onClose={() => setEditing(null)}
                    onSave={saveAccount}
                />
            )}

            {requesting && (
                <RequestForm
                    balance={balance}
                    accounts={accounts}
                    saving={saving}
                    onClose={() => setRequesting(false)}
                    onRequest={async (body) => {
                        if (await act(requestPayout, body, 'Payout requested')) {
                            setRequesting(false);
                            dispatch(fetchPayoutHistory({ page: 1, status, search }));
                            setPage(1);
                        }
                    }}
                />
            )}
        </div>
    );
};

export default Payouts;

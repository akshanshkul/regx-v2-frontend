import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Users, Shield, Plus, X, Search, ShieldAlert, Calendar, FileText,
    Mail, Loader2, Copy, Send, Trash2, CheckCircle2, Lock, Pause, Play,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import api from '../../services/api';

/**
 * Who else may work inside this account.
 *
 * An invitation is an email address plus what that person will be allowed to
 * do. Until they accept it they are a pending row; afterwards they sign in with
 * their own login and switch into this account.
 *
 * Only the owner and an admin can change anything here. Everyone else sees the
 * team but not the controls — and the server refuses them regardless, since a
 * hidden button is not a permission.
 */

const ROLES = [
    { id: 'admin', title: 'Admin', desc: 'Everything the owner can do, including billing and the team.' },
    { id: 'manager', title: 'Event manager', desc: 'Every event and form, but not billing or the team.' },
    { id: 'custom', title: 'Custom access', desc: 'Exactly the events, forms and powers you choose.' },
];

const ABILITIES = [
    { key: 'createEvents', label: 'Create events' },
    { key: 'createForms', label: 'Create forms' },
    { key: 'manageBilling', label: 'Manage billing' },
];

const emptyPermissions = {
    createEvents: false,
    createForms: false,
    manageBilling: false,
    eventAccess: 'all',
    events: [],
    formAccess: 'all',
    forms: [],
};

const messageOf = (error, fallback) =>
    error?.response?.data?.messages?.error ||
    Object.values(error?.response?.data?.messages ?? {})[0] ||
    error?.response?.data?.message ||
    fallback;

const Avatar = ({ name, email }) => (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-600 font-bold shadow-sm shrink-0">
        {(name || email || '?').charAt(0).toUpperCase()}
    </div>
);

const InviteModal = ({ events, forms, onClose, onSend, sending }) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('manager');
    const [permissions, setPermissions] = useState(emptyPermissions);

    const set = (changes) => setPermissions((current) => ({ ...current, ...changes }));

    const toggleIn = (key, id) =>
        set({ [key]: permissions[key].includes(id) ? permissions[key].filter((x) => x !== id) : [...permissions[key], id] });

    // Only the forms of events this person will be able to reach.
    const reachableForms = useMemo(
        () => (permissions.eventAccess === 'all' ? forms : forms.filter((form) => permissions.events.includes(form.event_id))),
        [forms, permissions.eventAccess, permissions.events]
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900">Invite a team member</h2>
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Email address</label>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="them@example.com" type="email" />
                            <p className="text-xs text-gray-500 mt-1.5">They accept by signing in with this address.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Name <span className="font-normal text-gray-400">(optional)</span>
                            </label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">Role</label>
                        <div className="grid sm:grid-cols-3 gap-3">
                            {ROLES.map((option) => (
                                <button
                                    type="button"
                                    key={option.id}
                                    onClick={() => setRole(option.id)}
                                    className={`text-left p-4 rounded-2xl border-2 transition-all ${role === option.id ? 'border-regx-orange bg-orange-50/60' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <h4 className={`font-bold text-sm ${role === option.id ? 'text-orange-900' : 'text-gray-900'}`}>
                                            {option.title}
                                        </h4>
                                        {role === option.id && <CheckCircle2 className="w-4 h-4 text-regx-orange shrink-0" />}
                                    </div>
                                    <p className={`text-xs ${role === option.id ? 'text-orange-700' : 'text-gray-500'}`}>{option.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {role === 'custom' && (
                        <div className="space-y-5 border-t border-gray-100 pt-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-3">What they may do</label>
                                <div className="grid sm:grid-cols-3 gap-2">
                                    {ABILITIES.map((ability) => (
                                        <label key={ability.key} className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={permissions[ability.key]}
                                                onChange={(e) => set({ [ability.key]: e.target.checked })}
                                                className="w-4 h-4 accent-regx-orange"
                                            />
                                            <span className="text-sm font-medium text-gray-700">{ability.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400" /> Events
                                    </label>
                                    <select
                                        value={permissions.eventAccess}
                                        onChange={(e) => set({ eventAccess: e.target.value })}
                                        className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                                    >
                                        <option value="all">All events</option>
                                        <option value="specific">Chosen events</option>
                                    </select>
                                </div>

                                {permissions.eventAccess === 'specific' && (
                                    <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                                        {events.length === 0 && <p className="p-3 text-sm text-gray-500">This account has no events yet.</p>}
                                        {events.map((event) => (
                                            <label key={event.id} className="flex items-center gap-2.5 p-3 cursor-pointer hover:bg-gray-50">
                                                <input
                                                    type="checkbox"
                                                    checked={permissions.events.includes(event.id)}
                                                    onChange={() => toggleIn('events', event.id)}
                                                    className="w-4 h-4 accent-regx-orange"
                                                />
                                                <span className="text-sm text-gray-700 truncate">{event.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-gray-400" /> Forms
                                    </label>
                                    <select
                                        value={permissions.formAccess}
                                        onChange={(e) => set({ formAccess: e.target.value })}
                                        className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                                    >
                                        <option value="all">All forms in those events</option>
                                        <option value="specific">Chosen forms</option>
                                    </select>
                                </div>

                                {permissions.formAccess === 'specific' && (
                                    <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                                        {reachableForms.length === 0 && <p className="p-3 text-sm text-gray-500">No forms in the chosen events.</p>}
                                        {reachableForms.map((form) => (
                                            <label key={form.id} className="flex items-center gap-2.5 p-3 cursor-pointer hover:bg-gray-50">
                                                <input
                                                    type="checkbox"
                                                    checked={permissions.forms.includes(form.id)}
                                                    onChange={() => toggleIn('forms', form.id)}
                                                    className="w-4 h-4 accent-regx-orange"
                                                />
                                                <span className="text-sm text-gray-700 truncate">{form.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white">
                        Cancel
                    </button>
                    <Button onClick={() => onSend({ email, name, role, permissions })} disabled={sending} className="flex items-center gap-2 px-5">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send invitation
                    </Button>
                </div>
            </div>
        </div>
    );
};

const TeamPermissions = () => {
    const [state, setState] = useState({ loading: true, error: null, data: null });
    const [search, setSearch] = useState('');
    const [inviting, setInviting] = useState(false);
    const [sending, setSending] = useState(false);
    const [busy, setBusy] = useState(null);
    const [lowering, setLowering] = useState(false);
    const [lowerRole, setLowerRole] = useState('custom');
    const [lowerAbilities, setLowerAbilities] = useState({});

    const load = useCallback(() => {
        api.get('/team')
            .then((data) => setState({ loading: false, error: null, data }))
            .catch((error) => setState({ loading: false, error: messageOf(error, 'Could not load the team'), data: null }));
    }, []);

    useEffect(() => {
        document.title = 'Team & permissions';
        load();
    }, [load]);

    const data = state.data;
    const canManage = Boolean(data?.account?.managesTeam);

    const people = useMemo(() => {
        if (!data) return [];

        const owner = { ...data.owner, roleLabel: 'Owner', isOwner: true };

        return [owner, ...data.members].filter((person) =>
            `${person.name ?? ''} ${person.email ?? ''}`.toLowerCase().includes(search.toLowerCase())
        );
    }, [data, search]);

    const act = async (label, run) => {
        setBusy(label);

        try {
            const result = await run();
            toast.success(result?.message ?? 'Done');
            load();
        } catch (error) {
            toast.error(messageOf(error, 'That did not work'));
        } finally {
            setBusy(null);
        }
    };

    const sendInvite = async ({ email, name, role, permissions }) => {
        if (!email.trim()) {
            toast.error('Enter an email address');
            return;
        }

        setSending(true);

        try {
            const result = await api.post('/team/invite', { email, name, role, permissions });

            toast.success(result.message);

            if (!result.emailed) {
                toast('The email could not be sent — copy the invite link from the list instead.', { icon: '✉️' });
            }

            setInviting(false);
            load();
        } catch (error) {
            toast.error(messageOf(error, 'Could not send the invitation'));
        } finally {
            setSending(false);
        }
    };

    const copyLink = async (link) => {
        try {
            await navigator.clipboard.writeText(link);
            toast.success('Invite link copied');
        } catch {
            toast.error('Could not copy the link');
        }
    };

    if (state.loading) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    if (state.error) {
        return <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{state.error}</div>;
    }

    return (
        <div className=" mx-auto pb-16">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>


                    <h1 className="text-2xl font-bold text-gray-900 font-display">
                      
                        Team &amp; permissions
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Who may work in {data?.account?.isOwner ? 'your account' : `${data?.account?.name ?? 'this'} account`}, and on what.
                    </p>
                </div>

                {canManage && (
                    <Button onClick={() => setInviting(true)} className="shrink-0 flex items-center gap-2 h-11 px-5 text-sm font-semibold">
                        <Plus className="w-4 h-4" />
                        Invite member
                    </Button>
                )}
            </div>

            {!canManage && (
                <>
                <div className="mb-6 flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-600">
                    <Lock className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                    <p className="flex-1">
                        You are <strong>{data?.account?.role}</strong> in this account, so you can see the team but not change it.
                        You can still give up some of your own access.
                    </p>
                    {data?.account?.role !== 'owner' && (
                        <button
                            type="button"
                            onClick={() => {
                                setLowerRole(data?.account?.role === 'admin' ? 'manager' : 'custom');
                                setLowerAbilities({ ...(data?.account?.abilities ?? {}) });
                                setLowering(true);
                            }}
                            className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:border-regx-orange hover:text-regx-orange"
                        >
                            Lower my access
                        </button>
                    )}
                </div>

                {lowering && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setLowering(false)}>
                        <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-gray-900">Lower my access</h3>
                            <p className="text-xs text-gray-500">
                                You can only reduce what you can do. Getting more access again needs the owner or an admin.
                            </p>

                            <label className="block text-sm font-medium text-gray-700">
                                Role
                                <select
                                    value={lowerRole}
                                    onChange={(e) => setLowerRole(e.target.value)}
                                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    {data?.account?.role === 'admin' && <option value="admin">Admin (keep)</option>}
                                    {['admin', 'manager'].includes(data?.account?.role) && <option value="manager">Manager (no billing)</option>}
                                    <option value="custom">Custom (choose below)</option>
                                </select>
                            </label>

                            {lowerRole === 'custom' && (
                                <div className="space-y-2">
                                    {[['createEvents', 'Create events'], ['createForms', 'Create forms'], ['manageBilling', 'Manage billing']].map(([key, label]) => (
                                        <label key={key} className={`flex items-center gap-2 text-sm ${data?.account?.abilities?.[key] ? 'text-gray-800' : 'text-gray-400'}`}>
                                            <input
                                                type="checkbox"
                                                disabled={!data?.account?.abilities?.[key]}
                                                checked={Boolean(lowerAbilities[key])}
                                                onChange={(e) => setLowerAbilities((a) => ({ ...a, [key]: e.target.checked }))}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setLowering(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={busy !== null}
                                    onClick={() =>
                                        act('lower', async () => {
                                            const result = await api.put('/team/me', {
                                                role: lowerRole,
                                                permissions: lowerRole === 'custom' ? { ...lowerAbilities, eventAccess: data?.account?.allEvents ? 'all' : 'specific', formAccess: data?.account?.allForms ? 'all' : 'specific' } : undefined,
                                            });
                                            setLowering(false);
                                            return result;
                                        })
                                    }
                                    className="px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                </>
            )}

            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-400" />
                        People ({people.length})
                    </h2>

                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people…" className="pl-9 h-10 w-full" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100">
                                <th className="px-6 py-4 font-semibold">Person</th>
                                <th className="px-6 py-4 font-semibold">Role</th>
                                <th className="px-6 py-4 font-semibold">Access</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {people.map((person) => (
                                <tr key={person.isOwner ? 'owner' : person.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <Avatar name={person.name} email={person.email} />
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-900 truncate">{person.name || '—'}</p>
                                                <p className="text-sm text-gray-500 truncate">{person.email}</p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {person.isOwner ? (
                                            <span className="inline-flex items-center gap-2 font-medium text-gray-700">
                                                <ShieldAlert className="w-4 h-4 text-amber-500" /> Owner
                                            </span>
                                        ) : canManage ? (
                                            <select
                                                value={person.role}
                                                disabled={busy !== null}
                                                onChange={(e) => act('role', () => api.put(`/team/members/${person.id}`, { role: e.target.value }))}
                                                className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                                            >
                                                {ROLES.map((role) => (
                                                    <option key={role.id} value={role.id}>{role.title}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="font-medium text-gray-700">{person.roleLabel}</span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {person.isOwner || person.role !== 'custom' ? (
                                            <span className="text-gray-400">Everything</span>
                                        ) : (
                                            <span>
                                                {person.permissions?.eventAccess === 'specific'
                                                    ? `${person.permissions.events.length} event${person.permissions.events.length === 1 ? '' : 's'}`
                                                    : 'All events'}
                                                {person.permissions?.formAccess === 'specific' &&
                                                    ` · ${person.permissions.forms.length} form${person.permissions.forms.length === 1 ? '' : 's'}`}
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {person.status === 'active' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 text-xs font-semibold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
                                            </span>
                                        ) : person.status === 'disabled' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                                                <Pause className="w-3.5 h-3.5" /> Suspended
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 text-gray-600 border border-gray-200 text-xs font-semibold">
                                                <Mail className="w-3.5 h-3.5" /> Invited
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {!person.isOwner && canManage && (
                                            <div className="flex items-center justify-end gap-1">
                                                {person.status === 'invited' && (
                                                    <>
                                                        {person.inviteLink && (
                                                            <button
                                                                onClick={() => copyLink(person.inviteLink)}
                                                                title="Copy the invite link"
                                                                className="p-2 rounded-lg text-gray-400 hover:text-regx-orange hover:bg-orange-50"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => act('resend', () => api.post(`/team/members/${person.id}/resend`))}
                                                            title="Send the invitation again"
                                                            className="p-2 rounded-lg text-gray-400 hover:text-regx-orange hover:bg-orange-50"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}

                                                {person.status === 'active' && (
                                                    <button
                                                        onClick={() => act('suspend', () => api.put(`/team/members/${person.id}`, { status: 'disabled' }))}
                                                        title="Suspend their access"
                                                        className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                                                    >
                                                        <Pause className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {person.status === 'disabled' && (
                                                    <button
                                                        onClick={() => act('restore', () => api.put(`/team/members/${person.id}`, { status: 'active' }))}
                                                        title="Give their access back"
                                                        className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50"
                                                    >
                                                        <Play className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => act('remove', () => api.delete(`/team/members/${person.id}`))}
                                                    title="Remove from the team"
                                                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {people.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                                        Nobody matches that search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {inviting && (
                <InviteModal
                    events={data?.events ?? []}
                    forms={data?.forms ?? []}
                    sending={sending}
                    onClose={() => setInviting(false)}
                    onSend={sendInvite}
                />
            )}
        </div>
    );
};

export default TeamPermissions;

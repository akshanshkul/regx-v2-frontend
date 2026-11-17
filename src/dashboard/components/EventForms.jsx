import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TemplatePicker from './TemplatePicker';
import DeletedForms from './DeletedForms';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
    Plus, Users, ExternalLink, Copy, Trash2, Settings2, Link2, Check, FileText, Table2, Sparkles,
} from 'lucide-react';
import {
    fetchForms, createForm, duplicateForm, deleteForm,
    selectFormsForEvent, selectFormsStatus,
} from '../../store/slices/formsSlice';
import Skeleton from '../../shared/components/Skeleton';
import { parseServerDate } from '../../shared/utils/dates';
import { encodeId } from '../../shared/utils/ids';

const REGISTRATION_TYPES = [
    ['general', 'General Participant'],
    ['athlete', 'Athlete'],
    ['volunteer', 'Volunteer'],
    ['coach', 'Coach'],
    ['team', 'Team'],
    ['media', 'Media'],
    ['vip', 'VIP'],
    ['workshop', 'Workshop'],
];

const statusStyle = (status) => {
    switch (status) {
        case 'published': return 'bg-green-50 text-green-600';
        case 'draft': return 'bg-gray-100 text-gray-600';
        case 'archived': return 'bg-amber-50 text-amber-700';
        default: return 'bg-gray-50 text-gray-600';
    }
};

const relativeTime = (value) => {
    if (!value) return 'never';

    const then = parseServerDate(value);
    if (Number.isNaN(then.getTime())) return 'unknown';

    const seconds = Math.floor((Date.now() - then.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;

    const days = Math.floor(seconds / 86400);
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;

    return then.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const EventForms = ({ eventId }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const forms = useSelector(selectFormsForEvent(eventId));
    const status = useSelector(selectFormsStatus);
    const isLoading = status === 'idle' || status === 'loading';

    const [showCreate, setShowCreate] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showTrash, setShowTrash] = useState(false);
    const [draft, setDraft] = useState({ name: '', description: '', registrationType: 'general' });
    const [isCreating, setIsCreating] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    // The form being copied, with the answers the copy needs. Null when the
    // dialog is closed.
    const [copying, setCopying] = useState(null);
    const [isCopying, setIsCopying] = useState(false);

    useEffect(() => {
        dispatch(fetchForms(eventId))
            .unwrap()
            .catch((message) => toast.error(message || 'Failed to load forms'));
    }, [dispatch, eventId]);

    const handleCreate = async (e) => {
        e.preventDefault();

        if (draft.name.trim().length < 2) {
            toast.error('Give the form a name.');
            return;
        }

        setIsCreating(true);
        try {
            const form = await dispatch(createForm({ eventId, ...draft })).unwrap();
            toast.success('Form created.');
            setShowCreate(false);
            setDraft({ name: '', description: '', registrationType: 'general' });
            navigate(`/events/${encodeId(eventId)}/forms/${encodeId(form.id)}`);
        } catch (message) {
            toast.error(message || 'Failed to create the form');
        } finally {
            setIsCreating(false);
        }
    };

    /**
     * Copying a form is rarely "give me the same thing again" — it is usually
     * the same questions for a different occasion, and often one that does not
     * charge. Asking for the name and the fees here saves opening the copy and
     * zeroing every category by hand.
     */
    const handleDuplicate = async (e) => {
        e.preventDefault();

        if (copying.name.trim().length < 2) {
            toast.error('Give the copy a name.');
            return;
        }

        setIsCopying(true);

        try {
            const form = await dispatch(
                duplicateForm({
                    formId: copying.id,
                    name: copying.name.trim(),
                    free: copying.free,
                    publish: copying.publish,
                })
            ).unwrap();

            toast.success(copying.free ? 'Copied with no fees.' : 'Form duplicated.');
            setCopying(null);
            navigate(`/events/${encodeId(eventId)}/forms/${encodeId(form.id)}`);
        } catch (message) {
            toast.error(message);
        } finally {
            setIsCopying(false);
        }
    };

    const handleDelete = async (form) => {
        // Only registrations somebody can still see stop a delete; hidden or
        // reset ones do not. A deleted form waits in Deleted forms.
        const warning = form.submission_count > 0
            ? `"${form.name}" still has ${form.submission_count} active registration(s), so it cannot be deleted. `
                + 'It will be switched off instead. Hide or reset the registrations first to delete it. Continue?'
            : `Delete "${form.name}"? It moves to Deleted forms, where you can restore it or delete it permanently.`;

        if (!window.confirm(warning)) return;

        try {
            const result = await dispatch(deleteForm(form.id)).unwrap();
            toast.success(result.message || 'Form deleted.');
            // Switching off keeps the row, so reload rather than trusting the local removal.
            dispatch(fetchForms(eventId));
        } catch (message) {
            toast.error(message);
        }
    };

    const copyLink = (form) => {
        const url = `${window.location.origin}/form/${form.slug}`;
        navigator.clipboard?.writeText(url);
        setCopiedId(form.id);
        setTimeout(() => setCopiedId(null), 1800);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Registration Forms</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Each form has its own public link, fields and rules.
                    </p>
                </div>

                {/* Two ways in: a blank canvas, or a form that already knows
                    what a championship entry looks like. */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setShowTrash(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:border-regx-orange hover:text-regx-orange transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Deleted forms
                    </button>

                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:border-regx-orange hover:text-regx-orange transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Form by Builder
                    </button>

                    <button
                        onClick={() => setShowTemplates(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-regx-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                    >
                        <Sparkles className="w-4 h-4" />
                        Create Form by Template
                    </button>
                </div>
            </div>

            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <div className="flex justify-between">
                                <Skeleton rounded="rounded-xl" className="w-11 h-11" />
                                <Skeleton rounded="rounded" className="h-5 w-16" />
                            </div>
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-3.5 w-28" />
                            <div className="pt-4 border-t border-gray-100 flex justify-between">
                                <Skeleton className="h-6 w-24" />
                                <Skeleton rounded="rounded-full" className="h-8 w-8" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && forms.length === 0 && (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-900">No registration forms yet</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                        Create one for each kind of participant — athletes, volunteers, coaches — each with its
                        own fields and its own public link.
                    </p>
                    <div className="mt-5 flex items-center justify-center gap-2">
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:border-regx-orange hover:text-regx-orange transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Build from scratch
                        </button>

                        <button
                            onClick={() => setShowTemplates(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-regx-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                        >
                            <Sparkles className="w-4 h-4" />
                            Start from a template
                        </button>
                    </div>
                </div>
            )}

            {!isLoading && forms.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {forms.map((form) => (
                        <div
                            key={form.id}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow group"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize ${statusStyle(form.status)}`}>
                                        {form.status}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-1 leading-snug">{form.name}</h3>

                                <p className="text-xs text-gray-400 capitalize mb-1">
                                    {form.registration_type?.replace('_', ' ')}
                                </p>

                                <p className="text-sm text-gray-500 mb-4">
                                    Last updated {relativeTime(form.updated_at)}
                                </p>

                                {form.status === 'published' && (
                                    <button
                                        onClick={() => copyLink(form)}
                                        title="Copy the public link"
                                        className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-regx-orange transition-colors mb-4 max-w-full"
                                    >
                                        {copiedId === form.id ? (
                                            <>
                                                <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                                <span className="text-green-600 font-sans">Link copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Link2 className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">/form/{form.slug}</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                {/* The response count is the way into the data,
                                    which is what an organiser wants once a form
                                    is live. */}
                                <button
                                    onClick={() => navigate(`/events/${encodeId(eventId)}/forms/${encodeId(form.id)}/data`)}
                                    title="View all submitted data"
                                    className="flex items-center gap-2 -ml-1 px-1 py-0.5 rounded-lg hover:bg-gray-50 transition-colors group/data"
                                >
                                    <span className="text-xl font-bold text-gray-900">{form.submission_count ?? 0}</span>
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Response{form.submission_count === 1 ? '' : 's'}
                                    </span>
                                    <Table2 className="w-3.5 h-3.5 text-gray-300 group-hover/data:text-regx-orange transition-colors" />
                                </button>

                                <div className="flex items-center gap-1">
                                    {form.status === 'published' && (
                                        <a
                                            href={`/form/${form.slug}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            title="Open the public form"
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-regx-orange hover:bg-gray-50 transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                    <button
                                        onClick={() =>
                                            setCopying({
                                                id: form.id,
                                                name: `${form.name} (copy)`,
                                                free: false,
                                                publish: form.status === 'published',
                                            })
                                        }
                                        title="Duplicate"
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(form)}
                                        title={form.submission_count > 0 ? 'Archive' : 'Delete'}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => navigate(`/events/${encodeId(eventId)}/forms/${encodeId(form.id)}/data`)}
                                        title="View all submitted data"
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-regx-orange hover:bg-orange-50 transition-colors"
                                    >
                                        <Table2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => navigate(`/events/${encodeId(eventId)}/forms/${encodeId(form.id)}`)}
                                        title="Open the builder"
                                        className="ml-1 p-1.5 rounded-lg bg-gray-50 text-gray-500 group-hover:bg-regx-orange group-hover:text-white transition-colors"
                                    >
                                        <Settings2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showTrash && (
                <DeletedForms
                    eventId={eventId}
                    onClose={() => setShowTrash(false)}
                    onChanged={() => dispatch(fetchForms(eventId))}
                />
            )}

            {/* Create modal */}
            {showTemplates && (
                <TemplatePicker
                    eventId={eventId}
                    onClose={() => setShowTemplates(false)}
                    onCreated={(form, validation) => {
                        setShowTemplates(false);
                        dispatch(fetchForms(eventId));

                        // A form that could not be published straight away has
                        // something left to configure, so go where that happens.
                        if (!validation?.valid) {
                            navigate(`/events/${encodeId(eventId)}/forms/${encodeId(form.id)}`);
                        }
                    }}
                />
            )}

            {copying && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <form
                        onSubmit={handleDuplicate}
                        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                    >
                        <div className="p-5 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 text-lg">Duplicate this form</h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                                The copy gets the same sections, fields, categories and rules. The
                                original is not touched.
                            </p>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name of the copy <span className="text-red-500">*</span>
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={copying.name}
                                    onChange={(e) => setCopying({ ...copying, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                />
                            </div>

                            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={copying.free}
                                    onChange={(e) => setCopying({ ...copying, free: e.target.checked })}
                                    className="mt-0.5 w-4 h-4 rounded accent-regx-orange"
                                />
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium text-gray-900">
                                        Charge nothing for the copy
                                    </span>
                                    <span className="block text-xs text-gray-500 mt-0.5">
                                        Keeps every category exactly as it is and sets each price to ₹0,
                                        so nobody is asked to pay.
                                    </span>
                                </span>
                            </label>

                            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={copying.publish}
                                    onChange={(e) => setCopying({ ...copying, publish: e.target.checked })}
                                    className="mt-0.5 w-4 h-4 rounded accent-regx-orange"
                                />
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium text-gray-900">
                                        Publish it straight away
                                    </span>
                                    <span className="block text-xs text-gray-500 mt-0.5">
                                        Gives the copy a working public link. Left off, it waits as a draft.
                                    </span>
                                </span>
                            </label>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setCopying(null)}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isCopying}
                                className="px-5 py-2 bg-regx-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                            >
                                {isCopying ? 'Copying…' : 'Duplicate'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showCreate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <form
                        onSubmit={handleCreate}
                        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                    >
                        <div className="p-5 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 text-lg">New registration form</h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                                You will add fields and rules next.
                            </p>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Form name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={draft.name}
                                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                                    placeholder="e.g. Athlete Registration"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Registration type</label>
                                <select
                                    value={draft.registrationType}
                                    onChange={(e) => setDraft({ ...draft, registrationType: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                >
                                    {REGISTRATION_TYPES.map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    value={draft.description}
                                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                                    placeholder="Shown to participants at the top of the form."
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                />
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="px-5 py-2 bg-regx-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-60"
                            >
                                {isCreating ? 'Creating…' : 'Create form'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default EventForms;

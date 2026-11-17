import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Search, MoreVertical, ExternalLink, X, Trash2, Edit, FileText, Loader2, Calendar,
    Sparkles, PenLine,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchFormsList,
    createForm,
    deleteForm,
    setFormStatus,
    selectFormsStatus,
    makeSelectFilteredForms,
} from '../../store/slices/formsSlice';
import { fetchEvents, selectEvents } from '../../store/slices/eventsSlice';
import TemplatePicker from '../components/TemplatePicker';
import DeletedForms from '../components/DeletedForms';
import { encodeId } from '../../shared/utils/ids';

const PAGE_SIZE = 10;

const Registrations = () => {
    const navigate = useNavigate();
    
    const dispatch = useDispatch();

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    /*
     * Making a form happens in two steps.
     *
     * `starting` is the first: which event it is for, and whether to begin from
     * a template or from nothing. Only once that is answered does either the
     * blank-form dialog (`draft`) or the template picker (`picking`) open —
     * because a template already decides most of what the blank dialog asks.
     */
    const [starting, setStarting] = useState(null);
    const [picking, setPicking] = useState(null);
    const [draft, setDraft] = useState(null);
    const [creating, setCreating] = useState(false);

    const events = useSelector(selectEvents);

    const selectFilteredForms = useMemo(makeSelectFilteredForms, []);
    const filteredForms = useSelector((state) => selectFilteredForms(state, searchQuery));

    const status = useSelector(selectFormsStatus);
    const isLoading = status === 'loading' || status === 'idle';

    useEffect(() => {
        dispatch(fetchFormsList())
            .catch((err) => {
                const errorMsg = typeof err === 'string' ? err : err?.message || 'Failed to load forms';
                toast.error(errorMsg);
            });
    }, [dispatch]);

    const [activeMenuId, setActiveMenuId] = useState(null);
    const menuRef = useRef(null);

    const [selectedForm, setSelectedForm] = useState(null);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [showTrash, setShowTrash] = useState(false);
    
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getStatusColor = (status) => {
        switch((status || '').toLowerCase()) {
            case 'published':
            case 'live': return 'bg-green-50 text-green-600';
            case 'draft': return 'bg-gray-100 text-gray-600';
            case 'archived': return 'bg-orange-50 text-orange-600';
            default: return 'bg-gray-50 text-gray-600';
        }
    };

    const handleNavigateToForm = (e, id) => {
        e.stopPropagation();
        // Assuming forms have a view or builder route
        navigate(`/forms/${encodeId(id)}`);
    };

    const handleActionClick = (e, action, form) => {
        e.stopPropagation();
        setActiveMenuId(null);
        setSelectedForm(form);
        
        if (action === 'go') {
            navigate(`/forms/${encodeId(form.id)}`);
        } else if (action === 'status') {
            setNewStatus(form.status);
            setStatusModalOpen(true);
        } else if (action === 'delete') {
            setDeleteModalOpen(true);
        }
    };

    const handleUpdateStatus = () => {
        setIsUpdatingStatus(true);
        dispatch(setFormStatus({ id: selectedForm.id, status: newStatus }));
        toast.success('Form status updated locally.');
        setIsUpdatingStatus(false);
        setStatusModalOpen(false);
    };

    /**
     * Deleting a form moves it to Deleted forms — it is not erased. A form with
     * registrations somebody can still see is only switched off instead; hide or
     * reset those first and it can be deleted. The server decides which, so the
     * toast says what actually happened.
     */
    const handleDelete = async () => {
        setIsDeleting(true);

        try {
            const result = await dispatch(deleteForm(selectedForm.id)).unwrap();
            toast.success(result.message || 'Form deleted.');
            setDeleteModalOpen(false);

            // A form that was only switched off is still listed, with a new status.
            if (!result.deleted) dispatch(fetchFormsList({ force: true })).catch(() => {});
        } catch (err) {
            toast.error(typeof err === 'string' ? err : err?.message || 'Failed to delete form.');
        } finally {
            setIsDeleting(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(filteredForms.length / PAGE_SIZE));

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    const paginatedForms = filteredForms.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const rangeStart = filteredForms.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredForms.length);

    const handleCreate = async (e) => {
        e.preventDefault();

        if (draft.name.trim().length < 2) return;

        setCreating(true);

        try {
            const form = await dispatch(
                createForm({
                    // Blank means no event, which is the default and the point:
                    // an application or a feedback round has no venue or date.
                    eventId: draft.eventId || undefined,
                    name: draft.name.trim(),
                    description: draft.description.trim() || undefined,
                })
            ).unwrap();

            toast.success('Form created.');
            setDraft(null);
            navigate(form.event_id
                ? `/events/${encodeId(form.event_id)}/forms/${encodeId(form.id)}`
                : `/forms/${encodeId(form.id)}/builder`);
        } catch (message) {
            toast.error(message || 'Could not create the form.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-display">Registration Forms</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage all your forms and registrations.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setShowTrash(true)}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:border-regx-orange hover:text-regx-orange transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Deleted forms
                    </button>

                    <button
                        onClick={() => {
                            // Only fetched when it is about to be offered.
                            dispatch(fetchEvents());
                            setStarting({ eventId: '' });
                        }}
                        className="flex items-center gap-2 bg-regx-orange hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shrink-0"
                    >
                        <Plus className="w-5 h-5" />
                        Create New Form
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search forms..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-regx-orange/20 focus:border-regx-orange transition-all"
                        />
                    </div>
                </div>

                <div className="min-h-[300px] overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Form Name</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Event ID</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submissions</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-sm text-gray-500">
                                        Loading forms...
                                    </td>
                                </tr>
                            )}

                            {!isLoading && paginatedForms.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center">
                                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm font-semibold text-gray-900">
                                            {searchQuery ? 'No forms match your search' : 'No forms yet'}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {searchQuery
                                                ? 'Try a different name or type.'
                                                : 'Create your first form to see it listed here.'}
                                        </p>
                                    </td>
                                </tr>
                            )}

                            {!isLoading && paginatedForms.map((form) => (
                                <tr 
                                    key={form.id} 
                                    onClick={(e) => handleNavigateToForm(e, form.id)}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-900 text-sm group-hover:text-regx-orange transition-colors">
                                                {form.name}
                                            </span>
                                            {form.description && (
                                                <span className="text-xs text-gray-500 line-clamp-1 mt-0.5" title={form.description}>
                                                    {form.description}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {form.event_id ? (
                                            <span className="text-sm text-gray-600 inline-flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                {form.event_name || `Event ${form.event_id}`}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                                                Standalone
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-700 capitalize">{form.registration_type || 'General'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                                            {form.submission_count || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${getStatusColor(form.status)}`}>
                                            {form.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-600">
                                            {new Date(form.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div 
                                            className="relative inline-block text-left"
                                            ref={activeMenuId === form.id ? menuRef : null}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuId(activeMenuId === form.id ? null : form.id);
                                                }}
                                                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>

                                            {activeMenuId === form.id && (
                                                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-50">
                                                    <div className="py-1">
                                                        <button
                                                            onClick={(e) => handleActionClick(e, 'go', form)}
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                                                        >
                                                            <ExternalLink className="w-4 h-4 text-gray-400" />
                                                            View / Edit
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleActionClick(e, 'status', form)}
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                                                        >
                                                            <span className="w-2 h-2 rounded-full bg-blue-500 ml-1 mr-1"></span>
                                                            Change Status
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleActionClick(e, 'delete', form)}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {!isLoading && filteredForms.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-xs text-gray-500">
                            Showing <span className="font-medium text-gray-700">{rangeStart}</span>
                            <span>&ndash;</span>
                            <span className="font-medium text-gray-700">{rangeEnd}</span> of{' '}
                            <span className="font-medium text-gray-700">{filteredForms.length}</span> forms
                        </p>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-2.5 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                            >
                                Previous
                            </button>

                            {Array.from({ length: totalPages }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                        currentPage === i + 1
                                            ? 'bg-regx-orange text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}

                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-2.5 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Modal */}
            {statusModalOpen && selectedForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 text-lg">Change Form Status</h3>
                            <button onClick={() => setStatusModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 mb-1 font-medium">Form Name</p>
                                <p className="font-semibold text-gray-900">{selectedForm.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1 font-medium">Current Status</p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(selectedForm.status)}`}>
                                    {selectedForm.status}
                                </span>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">New Status</label>
                                <select 
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-regx-orange focus:ring-1 focus:ring-regx-orange"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button 
                                onClick={() => setStatusModalOpen(false)}
                                disabled={isUpdatingStatus}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpdateStatus}
                                disabled={isUpdatingStatus || newStatus === selectedForm.status}
                                className="px-4 py-2 text-sm font-medium text-white bg-regx-orange rounded-lg hover:bg-orange-600 disabled:opacity-70 disabled:cursor-not-allowed w-32 flex justify-center"
                            >
                                {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation */}
            {deleteModalOpen && selectedForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-xl mb-2">
                                {selectedForm.submission_count > 0 ? 'Switch off this form?' : 'Delete form?'}
                            </h3>
                            <p className="font-semibold text-gray-900 text-sm mb-3 text-balance">"{selectedForm.name}"</p>

                            {selectedForm.submission_count > 0 ? (
                                <p className="text-amber-700 text-xs font-medium bg-amber-50 border border-amber-200 py-2 px-3 rounded-lg">
                                    It still has {selectedForm.submission_count} active registration
                                    {selectedForm.submission_count === 1 ? '' : 's'}, so it cannot be deleted. It will be
                                    switched off instead. Hide or reset the registrations first to delete it.
                                </p>
                            ) : (
                                <p className="text-gray-600 text-xs bg-gray-50 border border-gray-200 py-2 px-3 rounded-lg">
                                    It moves to Deleted forms, where you can restore it or delete it permanently.
                                </p>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? 'Working…' : selectedForm.submission_count > 0 ? 'Switch off' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTrash && (
                <DeletedForms
                    onClose={() => setShowTrash(false)}
                    onChanged={() => dispatch(fetchFormsList({ force: true })).catch(() => {})}
                />
            )}

            {starting && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">New form</h3>
                                <p className="text-sm text-gray-500 mt-0.5">How would you like to start?</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStarting(null)}
                                aria-label="Close"
                                className="p-1.5 -m-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
                                <select
                                    value={starting.eventId}
                                    onChange={(e) => setStarting({ eventId: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                >
                                    <option value="">No event — a form on its own</option>
                                    {(events ?? []).map((event) => (
                                        <option key={event.id} value={event.id}>
                                            {event.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    {starting.eventId
                                        ? 'The form shows the event’s date and venue, and is hidden while the event is a draft.'
                                        : 'For anything that is not a registration — an application, an onboarding pack, a feedback round.'}
                                </p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPicking({ eventId: starting.eventId });
                                        setStarting(null);
                                    }}
                                    className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-regx-orange hover:bg-orange-50/40 transition-colors"
                                >
                                    <Sparkles className="w-5 h-5 text-regx-orange mb-2" />
                                    <p className="text-sm font-semibold text-gray-900">From a template</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        A job application, onboarding, document collection, feedback, a
                                        survey or a registration — ready to edit.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setDraft({ name: '', description: '', eventId: starting.eventId });
                                        setStarting(null);
                                    }}
                                    className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-regx-orange hover:bg-orange-50/40 transition-colors"
                                >
                                    <PenLine className="w-5 h-5 text-gray-400 mb-2" />
                                    <p className="text-sm font-semibold text-gray-900">From scratch</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        An empty form. You add every question yourself.
                                    </p>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {picking && (
                <TemplatePicker
                    eventId={picking.eventId || undefined}
                    onClose={() => setPicking(null)}
                    onCreated={(form) => {
                        setPicking(null);
                        dispatch(fetchFormsList({ force: true })).catch(() => {});

                        // Straight into the builder: a template is a starting
                        // point, and the next thing anybody does is change it.
                        navigate(form.event_id
                            ? `/events/${encodeId(form.event_id)}/forms/${encodeId(form.id)}`
                            : `/forms/${encodeId(form.id)}/builder`);
                    }}
                />
            )}

            {draft && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <form
                        onSubmit={handleCreate}
                        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                    >
                        <div className="p-5 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 text-lg">New form</h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                                You will add the questions next.
                            </p>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Form name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    autoFocus
                                    value={draft.name}
                                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                                    placeholder="e.g. Software Engineer application"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    value={draft.description}
                                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                                    placeholder="Shown to people at the top of the form."
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                />
                            </div>

                            <p className="text-[11px] text-gray-500">
                                {draft.eventId
                                    ? `For ${(events ?? []).find((e) => String(e.id) === String(draft.eventId))?.name ?? 'the chosen event'}.`
                                    : 'This form will not belong to an event.'}
                            </p>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDraft(null)}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={creating || draft.name.trim().length < 2}
                                className="inline-flex items-center gap-2 px-5 py-2 bg-regx-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                            >
                                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                {creating ? 'Creating…' : 'Create form'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Registrations;

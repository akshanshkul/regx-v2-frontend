import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Search, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
    Inbox, Users, User, SlidersHorizontal, ArrowUpDown,
    Printer, FileSpreadsheet, FileText, Loader2, ListOrdered, Scale, Swords, Filter,
    Trash2, RotateCcw, AlertTriangle, Archive, Check, Ban, Undo2, Gavel, Pencil, Eye, Link2,
} from 'lucide-react';
import {
    fetchSubmissions,
    selectSubmissionsFor,
    selectSubmissionsMetaFor,
    selectSubmissionsFiltersFor,
    selectSubmissionsContextFor,
    selectSubmissionsLoading,
    resetSubmissions,
    reviewSubmission,
    selectReviewFor,
    hideSubmission,
    restoreSubmissions,
    fetchHiddenSubmissions,
    selectHiddenSubmissionsFor,
} from '../../store/slices/formsSlice';
import api from '../../services/api';
import EditSubmissionModal from './EditSubmissionModal';
import HiddenSubmissionsModal from './HiddenSubmissionsModal';
import { exportExcel, exportPdf, printSubmissions } from '../utils/submissionExport';
import { exportCategoryList, printWeighInSheet } from '../utils/sportSheets';
import { parseServerDate } from '../../shared/utils/dates';
import { encodeId } from '../../shared/utils/ids';

const SORTABLE = {
    reference: 'Reference',
    created_at: 'Submitted',
    amount: 'Amount',
    payment_status: 'Payment',
};

const PAYMENT_STYLES = {
    paid: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    refunded: 'bg-gray-100 text-gray-600 border-gray-200',
    waived: 'bg-blue-50 text-blue-700 border-blue-200',
    abandoned: 'bg-orange-50 text-orange-700 border-orange-200',
};

const selectClass =
    'border border-gray-300 rounded-lg px-2.5 py-2 text-sm bg-white text-gray-700 focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none';

const formatDate = (value) =>
    parseServerDate(value).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

/**
 * Submissions for one form.
 *
 * Every registration is a different shape — an individual carries their own
 * categories, a team carries a roster of players — so the table shows what is
 * common (who, which branch, how many entries, what they owe) and the expanded
 * row shows the rest, including the roster the old table dropped entirely.
 *
 * Searching, filtering, sorting and paging all go back to the server, so the
 * counts are true for the whole form rather than for one page of it.
 */
/**
 * Where one submission has got to.
 *
 * The organiser's own wording, not the database's — a form that calls its
 * approvals "Shortlisted" says Shortlisted here too. A row with no decision on
 * it at all belongs to a form that stopped asking for one, and says nothing
 * rather than inventing a state.
 */
const ReviewBadge = ({ row, labels = {} }) => {
    const status = row.review_status;

    if (!status) return <span className="text-xs text-gray-300">—</span>;

    const style = {
        pending: 'bg-amber-50 text-amber-700 border-amber-200',
        approved: 'bg-green-50 text-green-700 border-green-200',
        rejected: 'bg-gray-100 text-gray-600 border-gray-200',
    }[status] ?? 'bg-gray-100 text-gray-600 border-gray-200';

    return (
        <span className="inline-flex flex-col gap-0.5">
            <span className={`text-[11px] px-2 py-0.5 rounded border w-fit ${style}`}>
                {labels[status] ?? status}
            </span>
            {row.review_note && (
                <span className="text-[10px] text-gray-400 max-w-[160px] truncate" title={row.review_note}>
                    {row.review_note}
                </span>
            )}
        </span>
    );
};

const SubmissionsTable = ({ formId, eventId = null, isSport = false }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const submissions = useSelector(selectSubmissionsFor(formId));
    const meta = useSelector(selectSubmissionsMetaFor(formId));
    const filters = useSelector(selectSubmissionsFiltersFor(formId));
    const formContext = useSelector(selectSubmissionsContextFor(formId));
    const isLoading = useSelector(selectSubmissionsLoading);
    const hidden = useSelector(selectHiddenSubmissionsFor(formId));
    const review = useSelector(selectReviewFor(formId));

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [participantType, setParticipantType] = useState('');
    const [payment, setPayment] = useState('');
    const [status, setStatus] = useState('');
    // Which part of the review queue is showing. Empty is everything.
    const [reviewFilter, setReviewFilter] = useState('');
    const [perPage, setPerPage] = useState(25);
    const [sort, setSort] = useState('created_at');
    const [dir, setDir] = useState('desc');
    const [page, setPage] = useState(1);
    const [expanded, setExpanded] = useState(null);
    const [busy, setBusy] = useState(null);

    // What the confirmation dialog is currently asking about: the whole form,
    // or one registration. Null when nothing is being confirmed.
    const [confirming, setConfirming] = useState(null);
    const [working, setWorking] = useState(false);
    // The registration whose details are being edited, if any.
    const [editing, setEditing] = useState(null);
    const [showHidden, setShowHidden] = useState(false);

    // Filters the server discovered in this form's own answers, as
    // { 'entry:weight_category': '55' }. Empty until a page has loaded.
    const [parameters, setParameters] = useState({});

    // Typing shouldn't fire a request per keystroke.
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);

        return () => clearTimeout(timer);
    }, [search]);

    // A stable identity for the chosen parameters, so effects depend on what was
    // picked rather than on a new object every render.
    const parameterKey = JSON.stringify(parameters);

    // Any change to what is being asked for sends us back to page one —
    // otherwise a filter can land you on a page that no longer exists.
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, participantType, payment, status, reviewFilter, perPage, sort, dir, parameterKey]);

    useEffect(() => {
        dispatch(
            fetchSubmissions({
                formId,
                query: {
                    page, perPage, search: debouncedSearch,
                    participantType, payment, status, review: reviewFilter, sort, dir, parameters,
                },
            })
        );
        // parameterKey stands in for parameters; the object itself is new each render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, formId, page, perPage, debouncedSearch, participantType, payment, status, reviewFilter, sort, dir, parameterKey]);

    useEffect(() => {
        dispatch(fetchHiddenSubmissions({ formId }));
    }, [dispatch, formId]);

    /** Re-reads the page and the hidden summary after something has moved. */
    const refresh = () => {
        dispatch(
            fetchSubmissions({
                formId,
                query: {
                    page: 1, perPage, search: debouncedSearch,
                    participantType, payment, status, review: reviewFilter, sort, dir, parameters,
                },
            })
        );

        dispatch(fetchHiddenSubmissions({ formId }));
        setPage(1);
        setExpanded(null);
    };

    /** Re-reads the page being looked at, so an edit does not throw you back to page one. */
    const reload = () => {
        dispatch(
            fetchSubmissions({
                formId,
                query: {
                    page, perPage, search: debouncedSearch,
                    participantType, payment, status, review: reviewFilter, sort, dir, parameters,
                },
            })
        );
        dispatch(fetchHiddenSubmissions({ formId }));
    };

    const runConfirmed = async () => {
        setWorking(true);

        try {
            let result;

            if (confirming.kind === 'unpaid') {
                result = await api.post(`/forms/${formId}/submissions/hide-unpaid`);
            } else {
                const action =
                    confirming.kind === 'reset'
                        ? resetSubmissions({ formId })
                        : hideSubmission({ formId, submissionId: confirming.row.id });

                result = await dispatch(action).unwrap();
            }

            toast.success(result.message || 'Done.');
            setConfirming(null);
            refresh();
        } catch (message) {
            toast.error(
                (typeof message === 'string' ? message : message?.response?.data?.message) || 'That did not work.'
            );
        } finally {
            setWorking(false);
        }
    };

    /**
     * Records a decision on one row.
     *
     * The list is re-read afterwards rather than patched in place: with a queue
     * filter on, an approved row no longer belongs on the page it is sitting
     * on, and leaving it there would be a lie about what the filter means.
     */
    const decide = async (row, decision) => {
        const note =
            decision === 'rejected'
                ? window.prompt(`Why is ${row.reference} not accepted?\n\nThis is shown to them. Leave blank to say nothing.`, '')
                : null;

        // prompt returns null when cancelled, '' when they said nothing.
        if (decision === 'rejected' && note === null) return;

        setWorking(true);

        try {
            const result = await dispatch(
                reviewSubmission({ formId, submissionId: row.id, decision, note: note || undefined })
            ).unwrap();

            toast.success(result.message || 'Decision recorded.');
            refresh();
        } catch (message) {
            toast.error(message || 'Could not record that decision.');
        } finally {
            setWorking(false);
        }
    };

    const undo = async (hiddenAt = null) => {
        setWorking(true);

        try {
            const result = await dispatch(restoreSubmissions({ formId, hiddenAt })).unwrap();

            toast.success(result.message || 'Restored.');
            refresh();
        } catch (message) {
            toast.error(message || 'Could not restore the registrations.');
        } finally {
            setWorking(false);
        }
    };

    const chosenParameters = Object.entries(parameters).filter(([, value]) => value !== '');

    const hasFilters =
        debouncedSearch !== '' ||
        participantType !== '' ||
        payment !== '' ||
        status !== '' ||
        reviewFilter !== '' ||
        chosenParameters.length > 0;

    const clearFilters = () => {
        setSearch('');
        setParticipantType('');
        setPayment('');
        setStatus('');
        setReviewFilter('');
        setParameters({});
    };

    const chooseParameter = (key, value) =>
        setParameters((current) => {
            const next = { ...current };

            if (value === '') delete next[key];
            else next[key] = value;

            return next;
        });

    const toggleSort = (column) => {
        if (sort === column) {
            setDir(dir === 'asc' ? 'desc' : 'asc');
            return;
        }

        setSort(column);
        setDir(column === 'created_at' ? 'desc' : 'asc');
    };

    /**
     * Everything the current search and filters match, not just this page —
     * an export of "page 2 of the pending team entries" would be a trap.
     */
    const fetchAll = async (settledOnly = false) => {
        const params = Object.fromEntries(
            Object.entries({ search: debouncedSearch, participantType, payment, status, sort, dir })
                .filter(([, value]) => value !== '' && value != null)
        );

        chosenParameters.forEach(([key, value]) => {
            params[`parameters[${key}]`] = value;
        });

        // Excel and the weigh-in sheet list only people whose fee is settled.
        if (settledOnly) params.settled = 1;

        return api.get(`/forms/${formId}/submissions/export`, { params });
    };

    /**
     * Excel, PDF and print are all built in the browser from this one payload,
     * so the server never renders a file.
     */
    const runExport = async (kind) => {
        // The fixture engine loads its own data; nothing to fetch here.
        if (kind === 'fixtures') {
            navigate(
                eventId
                    ? `/events/${encodeId(eventId)}/form/${encodeId(formId)}/fixture`
                    : `/forms/${encodeId(formId)}/fixture`
            );
            return;
        }

        setBusy(kind);

        try {
            const payload = await fetchAll(kind === 'excel' || kind === 'weighin');
            const rows = payload.data ?? [];
            const labels = { formName: payload.form?.name ?? 'Registrations', eventTitle: payload.form?.event };

            if (rows.length === 0) {
                toast.error('Nothing to export with the current filters');
                return;
            }

            if (kind === 'excel') await exportExcel(payload.sheet, labels.formName);
            if (kind === 'pdf') await exportPdf(rows, labels);
            if (kind === 'print') printSubmissions(rows, labels);
            if (kind === 'categories') await exportCategoryList(rows, labels.formName);
            if (kind === 'weighin') printWeighInSheet(rows, labels);

            if (payload.meta?.capped) {
                toast('Only the first 5,000 registrations were included.', { icon: '\u26a0\ufe0f' });
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Export failed');
        } finally {
            setBusy(null);
        }
    };

    /** One registration on its own — a team prints with its full roster. */
    const printOne = (row) =>
        printSubmissions([row], { formName: `Registration ${row.reference}`, eventTitle: null });

    const participantTypes = filters?.participantTypes ?? [];
    const pageSizes = filters?.pageSizes ?? [10, 25, 50, 100];

    // Page numbers around the current page, so a form with 40 pages doesn't
    // render 40 buttons.
    const pageNumbers = useMemo(() => {
        const total = meta?.pages ?? 1;
        const window = [];

        for (let i = Math.max(1, page - 2); i <= Math.min(total, page + 2); i++) {
            window.push(i);
        }

        return window;
    }, [meta?.pages, page]);

    const isEmpty = submissions.length === 0 && !isLoading;

    const exportButtons = [
        ['print', 'Print all', Printer],
        ['excel', 'Excel', FileSpreadsheet],
        ['pdf', 'PDF', FileText],
    ];

    /**
     * Documents only a tournament has any use for. They read the entry grids, so
     * they are offered when the event's type is marked as a sport and the
     * registrations actually carry entries to group.
     */
    const hasEntries = submissions.some((row) => row.entryCount > 0);

    const sportButtons =
        isSport && hasEntries
            ? [
                  ['categories', 'Category list', ListOrdered, 'Every competitor grouped by category, as a spreadsheet'],
                  ['weighin', 'Weigh-in sheet', Scale, 'Printable sheet with blank columns for actual weight'],
                  ['fixtures', 'Create fixtures', Swords, 'Draw brackets from the competitors in each category'],
              ]
            : [];

    const dialog = confirming && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-5 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>

                    <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-lg">
                            {confirming.kind === 'reset'
                                ? 'Reset all form entries?'
                                : confirming.kind === 'unpaid'
                                  ? `Hide ${formContext?.form?.unpaidCount ?? 0} unpaid registrations?`
                                  : `Remove ${confirming.row.reference}?`}
                        </h3>

                        <p className="text-sm text-gray-600 mt-1.5">
                            {confirming.kind === 'unpaid' ? (
                                <>
                                    Every registration whose fee is still{' '}
                                    <strong className="font-semibold text-gray-900">pending, failed or abandoned</strong>{' '}
                                    will be hidden. Paid, cash and waived registrations are not touched. The data
                                    stays stored and can be restored.
                                </>
                            ) : confirming.kind === 'reset' ? (
                                <>
                                    This will hide{' '}
                                    <strong className="font-semibold text-gray-900">
                                        all {meta?.total ?? 0} existing registration
                                        {(meta?.total ?? 0) === 1 ? '' : 's'}
                                    </strong>{' '}
                                    from the application — lists, searches, reports, exports and counts. The
                                    data remains stored in the database and can be restored later.
                                </>
                            ) : (
                                <>
                                    This registration will be hidden everywhere in the application. The
                                    record stays in the database and can be restored later.
                                </>
                            )}
                        </p>

                        <p className="text-xs text-gray-500 mt-2">
                            The form itself — its fields, categories, prices and settings — is not changed.
                        </p>
                    </div>
                </div>

                <div className="p-5 pt-0 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        disabled={working}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={runConfirmed}
                        disabled={working}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                        {working && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirming.kind === 'unpaid' ? 'Hide unpaid' : confirming.kind === 'reset' ? 'Reset form data' : 'Remove it'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {dialog}
            {showHidden && (
                <HiddenSubmissionsModal
                    formId={formId}
                    onClose={() => setShowHidden(false)}
                    onRestored={() => reload()}
                />
            )}
            {editing && (
                <EditSubmissionModal
                    formId={formId}
                    row={editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        reload();
                    }}
                />
            )}
            {/* Print and export — always the full filtered set, never one page */}
            <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center gap-2">
                <div className="mr-auto min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                        {meta?.total ?? 0} registration{(meta?.total ?? 0) === 1 ? '' : 's'}
                        {hasFilters && <span className="text-gray-400 font-normal"> matching your filters</span>}
                    </p>

                    {chosenParameters.length > 0 && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                            <Filter className="w-3 h-3 shrink-0" />
                            {chosenParameters
                                .map(([key, value]) => {
                                    const parameter = (filters?.parameters ?? []).find((p) => p.key === key);
                                    const option = parameter?.options.find((o) => o.value === value);

                                    return `${parameter?.label ?? key}: ${option?.label ?? value}`;
                                })
                                .join('  ·  ')}
                        </p>
                    )}
                </div>

                {sportButtons.map(([kind, label, Icon, hint]) => (
                    <button
                        key={kind}
                        type="button"
                        title={hint}
                        onClick={() => runExport(kind)}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-regx-orange/30 bg-orange-50/50 text-sm font-medium text-regx-orange hover:bg-orange-50 transition-colors disabled:opacity-40"
                    >
                        {busy === kind ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Icon className="w-3.5 h-3.5" />
                        )}
                        {label}
                    </button>
                ))}

                {sportButtons.length > 0 && <span className="w-px h-6 bg-gray-200 mx-1" />}

                {exportButtons.map(([kind, label, Icon]) => (
                    <button
                        key={kind}
                        type="button"
                        onClick={() => runExport(kind)}
                        disabled={busy !== null || (meta?.total ?? 0) === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-700"
                    >
                        {busy === kind ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Icon className="w-3.5 h-3.5" />
                        )}
                        {label}
                    </button>
                ))}

                <span className="w-px h-6 bg-gray-200 mx-1" />

                {(formContext?.form?.unpaidCount ?? 0) > 0 && (
                        <button
                            type="button"
                            onClick={() => setConfirming({ kind: 'unpaid' })}
                            disabled={working}
                            title="Hide registrations whose fee is pending, failed or abandoned"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hide unpaid ({formContext.form.unpaidCount})
                        </button>
                    )}

                <button
                    type="button"
                    onClick={() => setConfirming({ kind: 'reset' })}
                    disabled={working || (meta?.total ?? 0) === 0}
                    title="Hide every registration on this form. The data is kept."
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset form data
                </button>
            </div>

            {/*
              * Nothing was destroyed, so say so and offer the way back. Without
              * this the only evidence a reset happened is an empty table, which
              * is exactly what a permanent delete looks like.
              */}
            {hidden?.total > 0 && (
                <div className="px-4 py-3 border-b border-gray-200 bg-amber-50/60 flex flex-wrap items-center gap-2">
                    <Archive className="w-4 h-4 text-amber-600 shrink-0" />

                    <p className="text-sm text-amber-900 mr-auto">
                        {hidden.total} hidden registration{hidden.total === 1 ? '' : 's'} on this form —
                        still stored, not shown anywhere.
                        {hidden.batches?.length > 1 && (
                            <span className="text-amber-700"> Hidden on {hidden.batches.length} occasions.</span>
                        )}
                    </p>

                    <button
                        type="button"
                        onClick={() => setShowHidden(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        View hidden
                    </button>

                    {hidden.batches?.length > 1 && (
                        <button
                            type="button"
                            onClick={() => undo(hidden.batches[0].hiddenAt)}
                            disabled={working}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-40"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Undo the last one ({hidden.batches[0].count})
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => undo(null)}
                        disabled={working}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-40"
                    >
                        {working ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        Restore all {hidden.total}
                    </button>
                </div>
            )}

            {/*
              * The queue, when the form asks for one. Tabs rather than another
              * dropdown because "what is still waiting" is the question this
              * page exists to answer on a form like this, not one filter among
              * six.
              */}
            {review?.enabled && (
                <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center gap-2">
                    <Gavel className="w-4 h-4 text-gray-400 shrink-0" />

                    {[
                        ['', 'Everything', null],
                        ['pending', review.labels?.pending ?? 'Under review', review.counts?.pending ?? 0],
                        ['approved', review.labels?.approved ?? 'Approved', review.counts?.approved ?? 0],
                        ['rejected', review.labels?.rejected ?? 'Not accepted', review.counts?.rejected ?? 0],
                    ].map(([value, label, count]) => (
                        <button
                            key={value || 'all'}
                            type="button"
                            onClick={() => setReviewFilter(value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                reviewFilter === value
                                    ? 'border-regx-orange bg-orange-50 text-regx-orange'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                        >
                            {label}
                            {count !== null && (
                                <span className="ml-1.5 text-xs text-gray-400">{count}</span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Search and filters */}
            <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search reference, name, team, email…"
                        className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                    />
                </div>

                {participantTypes.length > 1 && (
                    <select
                        value={participantType}
                        onChange={(e) => setParticipantType(e.target.value)}
                        className={selectClass}
                        aria-label="Filter by entry type"
                    >
                        <option value="">All entry types</option>
                        {participantTypes.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                )}

                {(filters?.paymentStatuses?.length ?? 0) > 1 && (
                    <select
                        value={payment}
                        onChange={(e) => setPayment(e.target.value)}
                        className={selectClass}
                        aria-label="Filter by payment status"
                    >
                        <option value="">All payments</option>
                        {filters.paymentStatuses.map((value) => (
                            <option key={value} value={value} className="capitalize">
                                {value.replace('_', ' ')}
                            </option>
                        ))}
                    </select>
                )}

                {(filters?.statuses?.length ?? 0) > 1 && (
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className={selectClass}
                        aria-label="Filter by status"
                    >
                        <option value="">All statuses</option>
                        {filters.statuses.map((value) => (
                            <option key={value} value={value} className="capitalize">
                                {value.replace('_', ' ')}
                            </option>
                        ))}
                    </select>
                )}

                {/* Filters the server found in this form's own answers — a
                    tournament gets weight class and hand, a conference gets
                    whatever it actually asked. */}
                {(filters?.parameters ?? []).map((parameter) => (
                    <select
                        key={parameter.key}
                        value={parameters[parameter.key] ?? ''}
                        onChange={(e) => chooseParameter(parameter.key, e.target.value)}
                        aria-label={`Filter by ${parameter.label}`}
                        className={`${selectClass} ${
                            parameters[parameter.key] ? 'border-regx-orange text-regx-orange' : ''
                        }`}
                    >
                        <option value="">All {parameter.label.toLowerCase()}</option>
                        {parameter.options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label} ({option.count})
                            </option>
                        ))}
                    </select>
                ))}

                {hasFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-sm text-gray-500 hover:text-gray-900"
                    >
                        <X className="w-3.5 h-3.5" />
                        Clear
                    </button>
                )}

                <div className="flex items-center gap-1.5 text-sm text-gray-500 ml-auto">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <select
                        value={perPage}
                        onChange={(e) => setPerPage(Number(e.target.value))}
                        className={selectClass}
                        aria-label="Rows per page"
                    >
                        {pageSizes.map((size) => (
                            <option key={size} value={size}>
                                {size} / page
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {isEmpty ? (
                <div className="p-12 text-center">
                    <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium text-gray-900">
                        {hasFilters ? 'Nothing matches those filters' : 'No submissions yet'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        {hasFilters
                            ? 'Try a different search or clear the filters.'
                            : 'They will appear here as people register.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="w-8" />
                                {Object.entries(SORTABLE).map(([key, label]) => (
                                    <th key={key} className="px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => toggleSort(key)}
                                            className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider ${
                                                sort === key ? 'text-regx-orange' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {label}
                                            {sort === key ? (
                                                dir === 'asc' ? (
                                                    <ChevronUp className="w-3 h-3" />
                                                ) : (
                                                    <ChevronDown className="w-3 h-3" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-40" />
                                            )}
                                        </button>
                                    </th>
                                ))}
                                {review?.enabled && (
                                    <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                        Review
                                    </th>
                                )}

                                {['Participant', 'Entry type', 'Entries'].map((label) => (
                                    <th
                                        key={label}
                                        className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                                    >
                                        {label}
                                    </th>
                                ))}
                                <th className="w-10" />
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {submissions.map((row) => {
                                const isOpen = expanded === row.id;

                                return (
                                    <React.Fragment key={row.id}>
                                        <tr
                                            onClick={() => setExpanded(isOpen ? null : row.id)}
                                            className={`cursor-pointer ${isOpen ? 'bg-orange-50/40' : 'hover:bg-gray-50/60'}`}
                                        >
                                            <td className="pl-3 text-gray-400">
                                                {isOpen ? (
                                                    <ChevronUp className="w-4 h-4" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4" />
                                                )}
                                            </td>

                                            <td className="px-4 py-3 font-mono text-xs text-gray-900">
                                                {row.reference}
                                            </td>

                                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                {formatDate(row.created_at)}
                                            </td>

                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                ₹{Number(row.amount).toLocaleString('en-IN')}
                                            </td>

                                            <td className="px-4 py-3">
                                                <span
                                                    className={`text-[11px] px-2 py-0.5 rounded border capitalize ${
                                                        row.payment_status === 'paid' && row.payment_method === 'cash'
                                                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                                                            : PAYMENT_STYLES[row.payment_status] ??
                                                              'bg-gray-100 text-gray-600 border-gray-200'
                                                    }`}
                                                >
                                                    {row.payment_status?.replace('_', ' ')}
                                                    {row.payment_status === 'paid' && row.payment_method
                                                        ? ` · ${row.payment_method}`
                                                        : ''}
                                                </span>
                                                {/* The Razorpay reference: the payment id once it is paid, the order id while it is not. */}
                                                {row.razorpay && row.payment_status !== 'waived' && (
                                                    <p
                                                        className="mt-1 font-mono text-[10px] text-gray-400 max-w-[170px] truncate"
                                                        title={row.payment_status === 'paid' && row.razorpay.payment_id ? 'Razorpay payment id' : 'Razorpay order id'}
                                                    >
                                                        {row.payment_status === 'paid' && row.razorpay.payment_id
                                                            ? row.razorpay.payment_id
                                                            : row.razorpay.order_id}
                                                    </p>
                                                )}
                                            </td>

                                            {review?.enabled && (
                                                <td className="px-4 py-3">
                                                    <ReviewBadge row={row} labels={review.labels} />
                                                </td>
                                            )}

                                            <td className="px-4 py-3">
                                                <p className="text-sm text-gray-900">{row.participant ?? '—'}</p>
                                                {row.email && (
                                                    <p className="text-[11px] text-gray-400 truncate max-w-[180px]">
                                                        {row.email}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="px-4 py-3">
                                                {row.participantType ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                                                        {row.participantType.value === 'team' ? (
                                                            <Users className="w-3.5 h-3.5 text-blue-500" />
                                                        ) : (
                                                            <User className="w-3.5 h-3.5 text-gray-400" />
                                                        )}
                                                        {row.participantType.label}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {row.entryCount > 0 ? row.entryCount : '—'}
                                            </td>

                                            <td className="pr-3 py-3">
                                                <div className="flex items-center gap-0.5">
                                                    {review?.enabled && row.review_status !== 'approved' && (
                                                        <button
                                                            type="button"
                                                            disabled={working}
                                                            onClick={(e) => { e.stopPropagation(); decide(row, 'approved'); }}
                                                            title={`Mark ${row.reference} ${review.labels?.approved ?? 'approved'}`}
                                                            aria-label={`Approve ${row.reference}`}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {review?.enabled && row.review_status !== 'rejected' && (
                                                        <button
                                                            type="button"
                                                            disabled={working}
                                                            onClick={(e) => { e.stopPropagation(); decide(row, 'rejected'); }}
                                                            title={`Mark ${row.reference} ${review.labels?.rejected ?? 'not accepted'}`}
                                                            aria-label={`Reject ${row.reference}`}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                                                        >
                                                            <Ban className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {review?.enabled && row.review_status && row.review_status !== 'pending' && (
                                                        <button
                                                            type="button"
                                                            disabled={working}
                                                            onClick={(e) => { e.stopPropagation(); decide(row, 'pending'); }}
                                                            title="Put it back in the queue"
                                                            aria-label={`Undo the decision on ${row.reference}`}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40"
                                                        >
                                                            <Undo2 className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setEditing(row); }}
                                                        title={`Edit details of ${row.reference}`}
                                                        aria-label={`Edit details of ${row.reference}`}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-regx-orange hover:bg-orange-50 transition-colors"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); printOne(row); }}
                                                        title={`Print ${row.reference}`}
                                                        aria-label={`Print ${row.reference}`}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-regx-orange hover:bg-orange-50 transition-colors"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setConfirming({ kind: 'one', row }); }}
                                                        title={`Remove ${row.reference} from the lists, keeping the record`}
                                                        aria-label={`Remove ${row.reference}`}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {isOpen && (
                                            <tr className="bg-gray-50/70">
                                                <td colSpan={review?.enabled ? 10 : 9} className="px-4 py-4">
                                                    <SubmissionDetail row={row} onPrint={() => printOne(row)} onEdit={() => setEditing(row)} />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {meta && meta.total > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                        Showing <span className="font-medium text-gray-700">{meta.from}</span>–
                        <span className="font-medium text-gray-700">{meta.to}</span> of{' '}
                        <span className="font-medium text-gray-700">{meta.total}</span>
                        {hasFilters ? ' matching ' : ' '}
                        {meta.total === 1 ? 'submission' : 'submissions'}
                    </p>

                    {meta.pages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setPage(page - 1)}
                                disabled={page <= 1}
                                aria-label="Previous page"
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {pageNumbers[0] > 1 && <span className="px-1 text-gray-400 text-xs">…</span>}

                            {pageNumbers.map((number) => (
                                <button
                                    key={number}
                                    type="button"
                                    onClick={() => setPage(number)}
                                    aria-current={number === page ? 'page' : undefined}
                                    className={`min-w-[32px] h-8 px-2 rounded-lg text-sm border transition-colors ${
                                        number === page
                                            ? 'bg-regx-orange text-white border-regx-orange'
                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {number}
                                </button>
                            ))}

                            {pageNumbers[pageNumbers.length - 1] < meta.pages && (
                                <span className="px-1 text-gray-400 text-xs">…</span>
                            )}

                            <button
                                type="button"
                                onClick={() => setPage(page + 1)}
                                disabled={page >= meta.pages}
                                aria-label="Next page"
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * The whole registration as it was filled in: every answered field grouped by
 * its section, and each repeatable grid — a team roster, an individual's own
 * categories — as its own small table.
 */
/**
 * An attached file: an image shows as a thumbnail that opens full size,
 * anything else as a link with its name and size.
 */
const FileAnswer = ({ file }) => {
    const isImage = (file.type || '').startsWith('image/');
    const size = file.size ? `${(file.size / 1024 / 1024 >= 1 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`)}` : null;

    return (
        <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex flex-col items-end gap-1 text-regx-orange hover:underline">
            {isImage && (
                <img src={file.url} alt={file.name || 'Attachment'} loading="lazy" className="h-20 w-20 rounded-lg border border-gray-200 object-cover" />
            )}
            <span className="max-w-[180px] truncate text-xs">
                {file.name || 'Open file'}
                {size && <span className="text-gray-400"> · {size}</span>}
            </span>
        </a>
    );
};

export const SubmissionDetail = ({ row, onPrint, onEdit }) => (
    <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
                Full registration as it was submitted
                {row.participantType?.value === 'team' && ', including the team roster'}
            </p>

            <div className="flex items-center gap-2">
                {/* The athlete's own page: next match, results, documents. */}
                {row.eventPageUrl && (
                    <button
                        type="button"
                        onClick={() => {
                            navigator.clipboard?.writeText(row.eventPageUrl)
                                .then(() => toast.success('Athlete page link copied'))
                                .catch(() => window.prompt('Copy the athlete page link', row.eventPageUrl));
                        }}
                        title="Copy the link to this athlete's own page — their matches, results, ID card and certificates"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors"
                    >
                        <Link2 className="w-3.5 h-3.5" />
                        Athlete page
                    </button>
                )}
                {onEdit && (
                    <button
                        type="button"
                        onClick={onEdit}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-regx-orange text-white text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit details
                    </button>
                )}
                {onPrint && (
                    <button
                        type="button"
                        onClick={onPrint}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        Print this registration
                    </button>
                )}
            </div>
        </div>

        {row.entries?.map((grid) => (
            <div key={grid.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700">{grid.label}</span>
                    <span className="text-[11px] text-gray-400">
                        {grid.rows.length} {grid.rows.length === 1 ? 'entry' : 'entries'}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase w-8">#</th>
                                {grid.columns.map((column) => (
                                    <th
                                        key={column.key}
                                        className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider"
                                    >
                                        {column.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {grid.rows.map((entry, index) => (
                                <tr key={index}>
                                    <td className="px-3 py-2 text-xs text-gray-400">{index + 1}</td>
                                    {grid.columns.map((column) => (
                                        <td key={column.key} className="px-3 py-2 text-sm text-gray-700">
                                            {entry[column.key] || '—'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        ))}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {row.details
                ?.map((section) => ({
                    ...section,
                    items: section.items.filter((item) => item.value !== null && item.value !== ''),
                }))
                .filter((section) => section.items.length > 0)
                .map((section) => (
                    <div key={section.key ?? section.title} className="bg-white rounded-xl border border-gray-200 p-3">
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            {section.title}
                        </p>

                        <dl className="space-y-1.5">
                            {section.items.map((item) => (
                                <div key={item.key} className="flex items-start justify-between gap-3">
                                    <dt className="text-xs text-gray-500 shrink-0">{item.label}</dt>
                                    <dd className="text-xs text-gray-900 text-right break-words">
                                        {item.value && typeof item.value === 'object' && item.value._type === 'file' ? (
                                            <FileAnswer file={item.value} />
                                        ) : (
                                            item.value
                                        )}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                ))}
        </div>
    </div>
);

export default SubmissionsTable;

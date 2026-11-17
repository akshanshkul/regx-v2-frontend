import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, ExternalLink, Settings2, Inbox, FileSpreadsheet } from 'lucide-react';
import SubmissionsTable from '../components/SubmissionsTable';
import ImportRegistrations from '../components/ImportRegistrations';
import Skeleton from '../../shared/components/Skeleton';
import {
    selectSubmissionsMetaFor,
    selectSubmissionsContextFor,
} from '../../store/slices/formsSlice';
import { encodeId } from '../../shared/utils/ids';
import { useRouteIds } from '../../shared/utils/ids';

/**
 * Everything that has been submitted to one form, on a page of its own.
 *
 * The builder's Submissions tab is for glancing at while editing; this is where
 * an organiser sits down with the registrations — full width, and with the
 * outputs the event actually needs. Which outputs those are depends on the
 * event: a tournament gets category lists and weigh-in sheets, anything else
 * gets the plain exports and nothing it would never use.
 */
const FormSubmissionsData = () => {
    // Reachable two ways: /forms/6, and /events/1/forms/6/data from inside an
    // event. The event is in the URL only on the second, and the submissions
    // response carries it either way — so the links out are built from whichever
    // is known rather than from the path.
    const { eventId: eventIdFromPath, formId } = useRouteIds();
    const navigate = useNavigate();

    const meta = useSelector(selectSubmissionsMetaFor(formId));
    const context = useSelector(selectSubmissionsContextFor(formId));

    const form = context?.form;
    const event = context?.event;

    const eventId = eventIdFromPath ?? event?.id;

    const [importing, setImporting] = useState(false);
    // Changing it remounts the table, so imported registrations show at once.
    const [importedAt, setImportedAt] = useState(0);

    useEffect(() => {
        document.title = form?.name ? `${form.name} — registrations` : 'Registrations';
    }, [form?.name]);

    return (
        <div className=" mx-auto space-y-5 pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => navigate(eventId ? `/events/${encodeId(eventId)}` : '/dashboard/my-events')}
                        aria-label="Back to the event"
                        disabled={!eventId && !form}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0 disabled:opacity-40"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="min-w-0">
                        {form ? (
                            <>
                                <h1 className="text-xl font-bold text-gray-900 truncate">{form.name}</h1>
                                <p className="text-sm text-gray-500 truncate">
                                    {[event?.title, event?.subtype ?? event?.type].filter(Boolean).join(' · ') ||
                                        'Registrations'}
                                </p>
                            </>
                        ) : (
                            <>
                                {/* The title comes with the first page of data, not before it. */}
                                <Skeleton className="h-6 w-56 mb-1.5" />
                                <Skeleton className="h-4 w-40" />
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {form?.slug && form.status === 'published' && (
                        <a
                            href={`/form/${form.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Public form
                        </a>
                    )}

                    {/* Many registrations at once, from a club's or federation's sheet. */}
                    {form?.status === 'published' && (
                        <button
                            type="button"
                            onClick={() => setImporting(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Import
                        </button>
                    )}

                    {/* Waits for the form to load, so a form whose event is still
                        unknown is never sent to the standalone builder by mistake. */}
                    {(eventId || form) && (
                        <Link
                            to={
                                eventId
                                    ? `/events/${encodeId(eventId)}/forms/${encodeId(formId)}`
                                    // A form with no event has its builder under its own id.
                                    : `/forms/${encodeId(formId)}/builder`
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors"
                        >
                            <Settings2 className="w-4 h-4" />
                            Edit form
                        </Link>
                    )}
                </div>
            </div>

            {/* Counts — a quick read before touching the filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Registrations" value={meta?.total} icon={Inbox} />
                <Stat label="Event type" value={event?.type} />
                <Stat label="Sport" value={event?.subtype} />
                <Stat label="Form status" value={form?.status} capitalize />
            </div>

            <SubmissionsTable key={importedAt} formId={formId} eventId={eventId} isSport={event?.isSport ?? false} />

            {importing && (
                <ImportRegistrations formId={formId} onClose={() => setImporting(false)} onImported={() => setImportedAt(Date.now())} />
            )}
        </div>
    );
};

const Stat = ({ label, value, icon: Icon, capitalize = false }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-3.5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>

        {value === undefined || value === null ? (
            <Skeleton className="h-5 w-20" />
        ) : (
            <p className={`text-lg font-bold text-gray-900 flex items-center gap-1.5 ${capitalize ? 'capitalize' : ''}`}>
                {Icon && <Icon className="w-4 h-4 text-gray-300" />}
                {value === '' ? '—' : value}
            </p>
        )}
    </div>
);

export default FormSubmissionsData;

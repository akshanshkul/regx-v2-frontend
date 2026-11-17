import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Loader2, SearchX } from 'lucide-react';
import api from '../../services/api';
import { encodeId } from '../../shared/utils/ids';
import { useRouteIds } from '../../shared/utils/ids';

/**
 * Sends /forms/6 to where that form actually lives.
 *
 * The builder is at /events/:eventId/forms/:formId because a form belongs to an
 * event — but a form id is unique on its own, so /forms/6 is a perfectly
 * sensible thing to type or paste, and it is what anyone reading a form id off
 * a list or a log will reach for. Rather than leave that as a dead URL, the
 * event is looked up and the browser is sent to the real one.
 *
 * @param {'builder'|'data'} to  Which of the form's pages to land on.
 */
const FormRedirect = ({ to = 'builder' }) => {
    const { formId } = useRouteIds();

    const [eventId, setEventId] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        let live = true;

        api.get(`/forms/${formId}`)
            .then((response) => {
                if (!live) return;

                setEventId(response.data?.form?.event_id ?? null);
                setLoaded(true);
            })
            .catch(() => live && setMissing(true));

        return () => {
            live = false;
        };
    }, [formId]);

    if (loaded) {
        // A form with no event has no event-shaped URL to go to; its builder
        // lives at a path of its own. Without this the page waited for an event
        // id that was never coming and span for ever.
        const path = eventId
            ? `/events/${encodeId(eventId)}/forms/${encodeId(formId)}${to === 'data' ? '/data' : ''}`
            : `/forms/${encodeId(formId)}${to === 'data' ? '/data' : '/builder'}`;

        // replace, so Back goes where the reader came from rather than bouncing
        // them through this lookup again.
        return <Navigate to={path} replace />;
    }

    if (missing) {
        return (
            <div className="max-w-md mx-auto text-center py-20">
                <SearchX className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                <h1 className="text-lg font-bold text-gray-900">No form with id {formId}</h1>
                <p className="text-sm text-gray-500 mt-1">
                    It may have been deleted, or it belongs to another account.
                </p>

                <Link
                    to="/dashboard/my-events"
                    className="inline-block mt-5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    Back to my events
                </Link>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
        </div>
    );
};

export default FormRedirect;

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, RefreshCw, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

import { fetchFormsList, selectAllForms, selectFormsStatus } from '../../../store/slices/formsSlice';
import WeighInDesk from '../../components/WeighInDesk';

/**
 * Weigh-in: pick a sport form, then weigh the people registered on it.
 *
 * A sport form is one whose event is a sport; forms with no event, or for a
 * conference or an audition, have nothing to weigh and are not listed.
 */
const WeighIn = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const forms = useSelector(selectAllForms);
    const status = useSelector(selectFormsStatus);

    const [selectedId, setSelectedId] = useState(null);

    const loading = status === 'idle' || status === 'loading';

    // The refresh button asks the server again; opening the page reuses a
    // recently loaded list.
    const load = (force = false) =>
        dispatch(fetchFormsList({ force }))
            .catch((message) => toast.error(message || 'Failed to load registration forms'));

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    const sportForms = useMemo(
        () => (forms || []).filter((form) => form.is_sport && form.status !== 'archived'),
        [forms]
    );

    const selectedForm = sportForms.find((form) => form.id === selectedId) ?? null;

    if (selectedForm) {
        return (
            <div className=" mx-auto">
                <WeighInDesk form={selectedForm} onBack={() => setSelectedId(null)} />
            </div>
        );
    }

    return (
        <div className="mx-auto">
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        aria-label="Go back"
                        className="w-9 h-9 rounded-xl bg-white border border-gray-200 grid place-items-center text-gray-600 hover:bg-gray-50 shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Scale className="w-5 h-5 text-regx-orange" />
                            <h1 className="text-xl font-bold text-gray-900">Weigh-in</h1>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">Choose a sport form, then weigh the players registered on it.</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => load(true)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 shrink-0"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-900">Sport registration forms</h2>
                    <p className="mt-1 text-xs text-gray-500">
                        {loading ? 'Loading…' : `${sportForms.length} form${sportForms.length === 1 ? '' : 's'} for sport events.`}
                    </p>
                </div>

                {loading && (
                    <div className="p-5 space-y-3" role="status" aria-busy="true" aria-label="Loading forms">
                        {[1, 2, 3].map((item) => <div key={item} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
                    </div>
                )}

                {!loading && sportForms.length === 0 && (
                    <div className="p-10 text-center">
                        <Scale className="w-8 h-8 mx-auto text-gray-300" />
                        <p className="mt-3 text-sm font-semibold text-gray-900">No sport forms found</p>
                        <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                            Forms appear here when their event has the “Sports” event type.
                        </p>
                    </div>
                )}

                {!loading && sportForms.length > 0 && (
                    <ul className="divide-y divide-gray-100">
                        {sportForms.map((form) => (
                            <li key={form.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-regx-orange grid place-items-center shrink-0">
                                        <Scale className="w-5 h-5" />
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="text-sm font-semibold text-gray-900 truncate">{form.name}</h3>
                                        <p className="mt-0.5 text-xs text-gray-500 truncate">
                                            {[
                                                form.event_name,
                                                form.status && form.status.charAt(0).toUpperCase() + form.status.slice(1),
                                                form.submission_count != null &&
                                                    `${form.submission_count} registration${form.submission_count === 1 ? '' : 's'}`,
                                            ].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedId(form.id)}
                                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-xs font-semibold hover:bg-orange-600 transition-colors"
                                >
                                    Start weigh-in
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default WeighIn;

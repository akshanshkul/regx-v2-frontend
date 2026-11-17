import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, UserPlus, Inbox } from 'lucide-react';
import api from '../../../services/api';
import { encodeId } from '../../../shared/utils/ids';

/**
 * Pick a form to take registrations on at the desk.
 *
 * Every published form is here — the public page's opening times do not apply
 * to a desk, so a form that has closed online can still take a latecomer.
 */
const OfflineForms = () => {
    const [state, setState] = useState({ loading: true, error: null, forms: [] });
    const [search, setSearch] = useState('');

    useEffect(() => {
        document.title = 'Offline registration';

        api.get('/offline/forms')
            .then((response) => setState({ loading: false, error: null, forms: response.data ?? [] }))
            .catch((error) =>
                setState({ loading: false, error: error?.response?.data?.message || 'Could not load your forms', forms: [] })
            );
    }, []);

    const forms = useMemo(
        () =>
            state.forms.filter((form) =>
                `${form.name} ${form.event ?? ''}`.toLowerCase().includes(search.toLowerCase())
            ),
        [state.forms, search]
    );

    return (
        <div className="max-w-6xl mx-auto pb-16">
            <div className="flex items-center gap-3 mb-6">
                <Link to="/dashboard/operations" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Back to operations">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Offline registration</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Register someone at the desk and take cash or an online payment on the spot.</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">Forms ({forms.length})</p>

                    <div className="relative w-full max-w-xs">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search forms or events…"
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                        />
                    </div>
                </div>

                {state.loading && (
                    <div className="flex items-center justify-center py-16 text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                )}

                {state.error && <p className="p-4 text-sm text-red-700 bg-red-50">{state.error}</p>}

                {!state.loading && !state.error && forms.length === 0 && (
                    <div className="py-16 text-center">
                        <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">
                            {state.forms.length === 0 ? 'No published forms yet. Publish a form to register people at the desk.' : 'No form matches that search.'}
                        </p>
                    </div>
                )}

                {forms.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                                    <th className="px-4 py-3 font-semibold">Form</th>
                                    <th className="px-4 py-3 font-semibold">Event</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold text-right">Registrations</th>
                                    <th className="px-4 py-3 font-semibold text-right">At the desk</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {forms.map((form) => (
                                    <tr key={form.id} className="hover:bg-gray-50/60">
                                        <td className="px-4 py-3 font-medium text-gray-900">{form.name}</td>
                                        <td className="px-4 py-3 text-gray-600">{form.event ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
                                                form.status === 'published'
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-gray-50 text-gray-600 border-gray-200'
                                            }`}>
                                                {form.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{form.registrations}</td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{form.atTheDesk}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                to={`/operations/offline/${encodeId(form.id)}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-regx-orange text-white text-xs font-semibold hover:opacity-90"
                                            >
                                                <UserPlus className="w-3.5 h-3.5" /> Start registration
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OfflineForms;

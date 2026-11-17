import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Award, CheckCircle2, Clock3, Download, IdCard, Loader2, Medal, Swords, Trophy, WifiOff, XCircle } from 'lucide-react';
import api from '../services/api';

const REFRESH_SECONDS = 30;

const ordinal = (n) => {
    const v = n % 100;
    return `${n}${['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th'}`;
};

const PLACE = { 1: 'bg-amber-400 text-gray-900', 2: 'bg-gray-300 text-gray-900', 3: 'bg-orange-400 text-gray-900' };

/**
 * An athlete's own page: /me/{reference}.{signature}
 *
 * Their categories, the match they are called for next (and to which table),
 * how each match went, their final place, and their ID card and certificates.
 * Refreshes by itself, so it can stay open on a phone all day.
 */
const MyEventScreen = () => {
    const { token } = useParams();
    const [state, setState] = useState({ loading: true, error: null, data: null });

    const load = useCallback(() => {
        api.get(`/public/me/${token}`)
            .then((data) => setState({ loading: false, error: null, data }))
            .catch((error) => setState((s) => ({ ...s, loading: false, error: error?.response?.data?.messages?.error || 'Could not load your page' })));
    }, [token]);

    useEffect(() => {
        load();
        const timer = setInterval(load, REFRESH_SECONDS * 1000);
        return () => clearInterval(timer);
    }, [load]);

    const data = state.data;

    useEffect(() => {
        document.title = data?.registration?.name ? `${data.registration.name} — ${data.event?.name || data.form?.name}` : 'My event';
    }, [data?.registration?.name, data?.event?.name, data?.form?.name]);

    if (state.loading && !data) {
        return <div className="min-h-screen bg-gray-50 grid place-items-center text-gray-400"><Loader2 className="w-7 h-7 animate-spin" /></div>;
    }

    if (state.error && !data) {
        return (
            <div className="min-h-screen bg-gray-50 grid place-items-center px-6 text-center">
                <div><WifiOff className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-700">{state.error}</p></div>
            </div>
        );
    }

    const reg = data.registration;
    const next = data.categories.filter((c) => c.next);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-gray-900 text-white">
                <div className="max-w-xl mx-auto px-4 py-6">
                    <p className="text-[11px] font-bold tracking-widest text-regx-orange">{(data.event?.name || data.form?.name || '').toUpperCase()}</p>
                    <h1 className="mt-1 text-2xl font-black">{reg.name}</h1>
                    <p className="text-sm text-gray-400">{reg.reference}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                        {reg.weighIn !== null && <span className="rounded-full bg-white/10 px-2.5 py-1">Weighed in · {reg.weighIn} kg</span>}
                        {reg.attended && <span className="rounded-full bg-green-500/20 text-green-300 px-2.5 py-1">Checked in</span>}
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 py-5 space-y-5">
                {/* What they need right now: where to go next. */}
                {next.length > 0 && (
                    <section className="rounded-2xl bg-regx-orange text-white p-4 shadow-lg">
                        <p className="text-xs font-bold tracking-widest opacity-90 flex items-center gap-1.5"><Swords className="w-4 h-4" /> YOUR NEXT MATCH</p>
                        {next.map((c) => (
                            <div key={c.category} className="mt-2">
                                <p className="text-lg font-black">vs {c.next.opponent}</p>
                                <p className="text-sm opacity-90">{c.category} · {c.next.round}</p>
                                <p className="mt-1 text-sm font-bold">{c.next.table ? `Go to TABLE ${c.next.table} now` : 'Waiting to be called to a table'}</p>
                            </div>
                        ))}
                    </section>
                )}

                <section className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-900">My categories</h2>
                    {data.categories.length === 0 && <p className="text-sm text-gray-500">No categories on this registration.</p>}
                    {data.categories.map((c) => (
                        <article key={c.category} className="rounded-2xl bg-white border border-gray-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <h3 className="font-semibold text-gray-900">{c.category}</h3>
                                {c.place ? (
                                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${PLACE[c.place] ?? 'bg-gray-100 text-gray-700'}`}>
                                        {c.place <= 3 ? <Medal className="w-3.5 h-3.5" /> : null} {ordinal(c.place)}
                                    </span>
                                ) : (
                                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                        {c.status === 'waitlisted' ? <><Clock3 className="w-3.5 h-3.5" /> Waitlisted · #{c.waitlist}</>
                                            : c.status === 'not_drawn' ? <><Clock3 className="w-3.5 h-3.5" /> Not drawn yet</>
                                            : c.status === 'completed' ? 'Finished' : 'In progress'}
                                    </span>
                                )}
                            </div>

                            {c.played.length > 0 && (
                                <ul className="mt-3 space-y-1.5">
                                    {c.played.map((m, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm">
                                            {m.won ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                            <span className="text-gray-900">{m.won ? 'Won' : 'Lost'} vs {m.opponent}</span>
                                            <span className="ml-auto text-xs text-gray-400">{m.round}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {c.place === 1 && c.status === 'completed' && (
                                <p className="mt-3 text-sm font-bold text-amber-700 flex items-center gap-1.5"><Trophy className="w-4 h-4" /> Champion</p>
                            )}
                        </article>
                    ))}
                </section>

                <section className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-900">My documents</h2>
                    {data.documents.length === 0 ? (
                        <p className="text-sm text-gray-500">Your ID card and certificates appear here once the organiser makes them.</p>
                    ) : (
                        data.documents.map((d, i) => (
                            <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-white border border-gray-200 p-4 hover:border-regx-orange">
                                <span className="w-10 h-10 rounded-xl bg-orange-50 text-regx-orange grid place-items-center shrink-0">
                                    {d.type === 'id_card' ? <IdCard className="w-5 h-5" /> : <Award className="w-5 h-5" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block font-semibold text-gray-900 truncate">{d.name}</span>
                                    <span className="block text-xs text-gray-500">{d.type === 'id_card' ? 'ID card' : 'Certificate'} · PDF</span>
                                </span>
                                <Download className="w-5 h-5 text-gray-400" />
                            </a>
                        ))
                    )}
                </section>

                <p className="text-center text-[11px] text-gray-400 pb-6">This page updates by itself. Keep this link private — it is yours.</p>
            </main>
        </div>
    );
};

export default MyEventScreen;

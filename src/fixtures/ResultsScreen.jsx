import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Trophy, WifiOff } from 'lucide-react';
import api from '../services/api';

const REFRESH_SECONDS = 60;
const PAGE_SECONDS = 12;
const PER_PAGE = 6;

const MEDAL = {
    1: 'bg-amber-400 text-gray-900',
    2: 'bg-gray-300 text-gray-900',
    3: 'bg-orange-400 text-gray-900',
};

const upper = (text) => (text ?? '').toUpperCase();

/**
 * "That's a wrap": /draw/{token}?show=results
 *
 * 1st, 2nd and 3rd of every completed category, a page at a time on a timer
 * so a hall screen cycles through them all, with the medal table beside them
 * when the organiser has chosen what groups people (club, district…).
 */
const ResultsScreen = () => {
    const { token } = useParams();
    const [state, setState] = useState({ loading: true, error: null, data: null });
    const [page, setPage] = useState(0);

    const load = useCallback(() => {
        api.get(`/public/fixtures/${token}/results`)
            .then((data) => setState({ loading: false, error: null, data }))
            .catch((error) => setState((s) => ({ ...s, loading: false, error: error?.response?.data?.messages?.error || 'Could not load the results' })));
    }, [token]);

    useEffect(() => {
        load();
        const timer = setInterval(load, REFRESH_SECONDS * 1000);
        return () => clearInterval(timer);
    }, [load]);

    const standings = state.data?.standings ?? [];
    const pages = Math.max(1, Math.ceil(standings.length / PER_PAGE));

    useEffect(() => {
        const timer = setInterval(() => setPage((p) => (p + 1) % pages), PAGE_SECONDS * 1000);
        return () => clearInterval(timer);
    }, [pages]);

    useEffect(() => {
        document.title = state.data?.event?.name ? `${state.data.event.name} — results` : 'Results';
    }, [state.data?.event?.name]);

    if (state.loading && !state.data) {
        return <div className="min-h-screen bg-[#05070b] grid place-items-center text-gray-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (state.error && !state.data) {
        return (
            <div className="min-h-screen bg-[#05070b] grid place-items-center text-center px-6">
                <div><WifiOff className="w-10 h-10 text-gray-700 mx-auto mb-3" /><p className="text-gray-300">{state.error}</p></div>
            </div>
        );
    }

    const data = state.data;
    const shown = standings.slice((page % pages) * PER_PAGE, (page % pages) * PER_PAGE + PER_PAGE);
    const medals = data.medals ?? [];

    return (
        <div className="min-h-screen bg-[#05070b] text-white flex flex-col">
            <header className="px-6 sm:px-10 pt-8 pb-4 flex items-end gap-4 flex-wrap">
                <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#ff5a3c]">THAT&apos;S A WRAP</h1>
                <p className="pb-1 min-w-0 max-w-full truncate text-xs sm:text-sm font-bold tracking-[0.2em] text-gray-400">{upper(data.event?.name || data.form?.name)}</p>
                {pages > 1 && <p className="ml-auto pb-1 text-xs font-bold text-gray-500 tabular-nums">{(page % pages) + 1} of {pages}</p>}
            </header>

            <main className="flex-1 px-6 sm:px-10 pb-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
                {standings.length === 0 ? (
                    <p className="text-gray-500 text-lg py-20">No category is completed yet. Results appear here as categories finish.</p>
                ) : (
                    <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 content-start">
                        {shown.map((category) => (
                            <section key={category.category} className="border-t border-white/10 pt-3">
                                <h2 className="text-xs sm:text-sm font-black tracking-widest text-[#ff5a3c] mb-3">{upper(category.category)}</h2>
                                <ol className="space-y-1.5">
                                    {category.places.map((p, i) => (
                                        <li key={`${p.place}-${i}`} className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-full grid place-items-center text-xs font-black shrink-0 ${MEDAL[p.place]}`}>{p.place}</span>
                                            <span className={`truncate font-black italic tracking-wide ${p.place === 1 ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg text-gray-200'}`}>
                                                {upper(p.name)}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        ))}
                    </div>
                )}

                {medals.length > 0 && (
                    <aside className="self-start rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
                        <h2 className="px-4 py-3 flex items-center gap-2 text-sm font-black tracking-widest border-b border-white/10">
                            <Trophy className="w-4 h-4 text-amber-400" /> MEDAL TABLE
                        </h2>
                        <table className="w-full text-sm">
                            <thead className="text-[10px] tracking-widest text-gray-500">
                                <tr>
                                    <th className="px-4 py-2 text-left font-bold">#</th>
                                    <th className="py-2 text-left font-bold">TEAM</th>
                                    <th className="py-2 w-9"><span className="inline-block w-3 h-3 rounded-full bg-amber-400" /></th>
                                    <th className="py-2 w-9"><span className="inline-block w-3 h-3 rounded-full bg-gray-300" /></th>
                                    <th className="py-2 w-9 pr-4"><span className="inline-block w-3 h-3 rounded-full bg-orange-400" /></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {medals.slice(0, 12).map((row, i) => (
                                    <tr key={row.club}>
                                        <td className="px-4 py-2 text-gray-500 tabular-nums">{i + 1}</td>
                                        <td className="py-2 font-bold truncate max-w-[10rem]">{upper(row.club)}</td>
                                        <td className="py-2 text-center font-black tabular-nums">{row.gold}</td>
                                        <td className="py-2 text-center font-black tabular-nums">{row.silver}</td>
                                        <td className="py-2 pr-4 text-center font-black tabular-nums">{row.bronze}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </aside>
                )}
            </main>

            <footer className="px-6 sm:px-10 py-3 border-t border-white/10 text-[11px] font-bold tracking-widest text-gray-500">
                {data.counts?.competitors ?? 0} ENTRIES · {data.counts?.categories ?? 0} CATEGORIES · {data.counts?.completed ?? 0} COMPLETED
            </footer>
        </div>
    );
};

export default ResultsScreen;

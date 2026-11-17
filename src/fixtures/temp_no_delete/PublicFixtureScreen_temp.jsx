import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Trophy, WifiOff } from 'lucide-react';
import api from '../services/api';

/**
 * The public fixture screen.
 *
 * Meant for a projector at the back of a hall: large type, dark background, no
 * controls beyond choosing a category, and it refreshes itself. Anyone with the
 * link can watch; nobody can change anything — the API behind it only reads.
 */

const REFRESH_SECONDS = 15;

const SIDE_ORDER = ['winners', 'single_elimination', 'knockout', 'losers', 'grand_final'];

const sideLabel = (side) =>
({
    winners: 'Winners bracket',
    losers: 'Losers bracket',
    grand_final: 'Grand final',
}[side] ?? side.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()));

const isVoid = (match) => !match.player1 && !match.player2 && match.status === 'completed';

const Match = ({ match }) => {
    const winnerId = match.winner?.id ?? null;
    const decided = Boolean(winnerId) && match.player1 && match.player2;

    const line = (player, score) => {
        const won = decided && winnerId === player?.id;

        return (
            <div className={`flex items-center gap-3 px-4 py-2.5 ${won ? 'bg-emerald-500/15' : ''}`}>
                <span className={`flex-1 min-w-0 truncate text-lg ${player ? (won ? 'font-semibold text-emerald-300' : 'text-gray-100') : 'text-gray-500 italic'}`}>
                    {player?.name ?? 'To be decided'}
                </span>
                {score !== null && score !== undefined && <span className="tabular-nums text-gray-300">{score}</span>}
                {won && <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />}
            </div>
        );
    };

    return (
        <div className={`rounded-lg border overflow-hidden ${decided ? 'border-emerald-500/40 bg-white/5' : 'border-white/10 bg-white/5'}`}>
            {line(match.player1, match.player1_score)}
            <div className="border-t border-white/10" />
            {line(match.player2, match.player2_score)}
        </div>
    );
};

const PublicFixtureScreen = () => {
    const { token } = useParams();
    const [params, setParams] = useSearchParams();
    const category = params.get('category') ?? '';

    const [state, setState] = useState({ loading: true, error: null, data: null });
    const [updatedAt, setUpdatedAt] = useState(null);

    const load = useCallback(() => {
        api.get(`/public/fixtures/${token}`, { params: category ? { category } : {} })
            .then((data) => {
                setState({ loading: false, error: null, data });
                setUpdatedAt(new Date());
            })
            .catch((error) =>
                setState((current) => ({
                    ...current,
                    loading: false,
                    error: error?.response?.data?.messages?.error || error?.response?.data?.message || 'Could not reach the scoreboard',
                }))
            );
    }, [token, category]);

    useEffect(() => {
        load();

        const timer = setInterval(load, REFRESH_SECONDS * 1000);

        return () => clearInterval(timer);
    }, [load]);

    const data = state.data;

    useEffect(() => {
        document.title = data?.category ? `${data.category} — live draw` : 'Live draw';
    }, [data?.category]);

    const sides = useMemo(
        () =>
            Object.entries(data?.rounds ?? {}).sort(([a], [b]) => {
                const rank = (side) => (SIDE_ORDER.indexOf(side) === -1 ? SIDE_ORDER.length : SIDE_ORDER.indexOf(side));

                return rank(a) - rank(b);
            }),
        [data?.rounds]
    );

    const champion = useMemo(() => {
        const decisive = data?.rounds?.grand_final ?? sides[sides.length - 1]?.[1];
        const last = decisive?.[decisive.length - 1]?.matches?.[0];

        return last?.winner?.name ?? null;
    }, [data?.rounds, sides]);

    if (state.loading && !data) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (state.error && !data) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6 text-center">
                <div>
                    <WifiOff className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-300 text-lg">{state.error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-white/10">
                <div className="max-w-[1800px] mx-auto px-6 py-4 flex flex-wrap items-center gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl sm:text-3xl font-bold truncate">{data?.category ?? 'No draw yet'}</h1>
                        <p className="text-sm text-gray-400 truncate">
                            {[data?.event?.name, data?.form?.name, data?.type].filter(Boolean).join(' · ')}
                        </p>
                    </div>

                    {champion && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold">
                            <Trophy className="w-5 h-5" /> {champion}
                        </div>
                    )}

                    {(data?.categories?.length ?? 0) > 1 && (
                        <select
                            value={data?.category ?? ''}
                            onChange={(e) => setParams({ category: e.target.value })}
                            className="bg-gray-900 border border-white/15 rounded-lg px-3 py-2 text-sm text-gray-100 max-w-[18rem]"
                            aria-label="Category"
                        >
                            {data.categories.map((name) => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    )}

                    <span className="text-xs text-gray-500 tabular-nums">
                        {state.error ? 'Reconnecting…' : updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : ''}
                    </span>
                </div>
            </header>

            <main className="max-w-[1800px] mx-auto px-6 py-6 space-y-8">
                {sides.length === 0 && (
                    <p className="text-center text-gray-500 py-24 text-lg">No draw has been made yet.</p>
                )}

                {sides.map(([side, rounds]) => (
                    <section key={side}>
                        {sides.length > 1 && (
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">{sideLabel(side)}</h2>
                        )}

                        <div className="overflow-x-auto pb-2">
                            <div className="flex gap-8 min-w-max">
                                {rounds.map((round) => (
                                    <div key={round.round} className="w-72 flex flex-col">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">{round.label}</p>
                                        <div className="flex-1 flex flex-col justify-around gap-3">
                                            {round.matches.filter((match) => !isVoid(match)).map((match) => (
                                                <Match key={match.id} match={match} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                ))}
            </main>
        </div>
    );
};

export default PublicFixtureScreen;

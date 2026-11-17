import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, Loader2, Trophy, WifiOff } from 'lucide-react';
import { ACCENTS, initials } from '../live/demoBoard';
import api from '../services/api';

/**
 * The draw, on the wall.
 *
 * Wears the same clothes as the hall board (/live) — same masthead, same dark
 * card, same accents — but shows the bracket rather than what is on each table,
 * and its content is real: the event it belongs to, and the draw as the fixture
 * service has it.
 *
 * Public: the link is the key, and it only ever reads.
 */

const REFRESH_SECONDS = 15;

const SIDE_ORDER = ['winners', 'single_elimination', 'knockout', 'losers', 'grand_final'];

/** Each part of the draw gets its own colour, as the tables do on the board. */
const SIDES = {
    winners: { label: 'Winners bracket', accent: 'red' },
    losers: { label: 'Losers bracket', accent: 'blue' },
    grand_final: { label: 'Grand final', accent: 'amber' },
    single_elimination: { label: 'Bracket', accent: 'red' },
    knockout: { label: 'Bracket', accent: 'red' },
};

const sideOf = (side) =>
    SIDES[side] ?? { label: side.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), accent: 'green' };

/** Completed with nobody in it — a seat no one could reach. Not shown. */
const isVoid = (match) => !match.player1 && !match.player2 && match.status === 'completed';

const Player = ({ player, score, won, accent, decided }) => (
    <div className={`flex items-center gap-2.5 px-3 py-2 ${won ? 'bg-white/[0.06]' : ''}`}>
        {player ? (
            <span className={`w-8 h-8 rounded-lg shrink-0 grid place-items-center text-[11px] font-bold text-white/90 ring-1 ring-white/10 ${won ? accent.score : 'bg-white/10'}`}>
                {initials(player.name)}
            </span>
        ) : (
            <span className="w-8 h-8 rounded-lg shrink-0 bg-white/5 ring-1 ring-white/5" />
        )}

        <span className={`flex-1 min-w-0 truncate text-sm leading-tight ${player ? (won ? 'font-bold text-white' : 'text-gray-200') : 'text-gray-600 italic'}`}>
            {player?.name ?? 'To be decided'}
        </span>

        {won && <Trophy className={`w-3.5 h-3.5 shrink-0 ${accent.text}`} />}

        <span className={`w-7 h-7 grid place-items-center rounded-md text-sm font-black shrink-0 ${decided ? (won ? accent.score + ' text-white' : 'bg-white/10 text-white') : 'bg-white/5 text-gray-600'
            }`}>
            {score ?? '–'}
        </span>
    </div>
);

const MatchCard = ({ match, accent }) => {
    const winnerId = match.winner?.id ?? null;
    const decided = Boolean(winnerId) && match.player1 && match.player2;
    const live = !decided && match.player1 && match.player2;

    return (
        <section className={`rounded-xl overflow-hidden bg-[#11151c] border ${decided ? accent.border : 'border-white/5'} ${decided ? accent.glow : ''}`}>
            <Player player={match.player1} score={match.player1_score} won={decided && winnerId === match.player1?.id} accent={accent} decided={decided} />
            <div className="border-t border-white/5" />
            <Player player={match.player2} score={match.player2_score} won={decided && winnerId === match.player2?.id} accent={accent} decided={decided} />

            {live && (
                <p className="px-3 py-1 text-[10px] font-bold tracking-widest text-gray-500 border-t border-white/5">TO BE PULLED</p>
            )}
        </section>
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
    const event = data?.event;

    useEffect(() => {
        document.title = event?.name ? `${event.name} — live draw` : 'Live draw';
    }, [event?.name]);

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
            <div className="min-h-screen bg-[#05070b] flex items-center justify-center text-gray-600">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (state.error && !data) {
        return (
            <div className="min-h-screen bg-[#05070b] flex items-center justify-center px-6 text-center">
                <div>
                    <WifiOff className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-300 text-lg">{state.error}</p>
                </div>
            </div>
        );
    }

    const [firstWord, ...restOfName] = (event?.name ?? '').split(' ');

    return (
        <div className="min-h-screen bg-[#05070b] text-white flex flex-col">
            {/* Masthead — whose event this is */}
            <header className="bg-gradient-to-r from-[#0b0f16] via-[#131922] to-[#0b0f16] border-b border-white/10">
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                        {event?.logoUrl ? (
                            <img src={event.logoUrl} alt="" className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg object-cover shrink-0 ring-1 ring-white/10" />
                        ) : (
                            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-white/10 grid place-items-center text-xl sm:text-2xl shrink-0">🏆</div>
                        )}

                        <div className="min-w-0">
                            <p className="text-[10px] tracking-[0.2em] text-gray-400 leading-none">{firstWord.toUpperCase()}</p>
                            <h1 className="text-base sm:text-xl lg:text-2xl font-black leading-tight truncate">
                                {restOfName.join(' ').toUpperCase()}{' '}
                                {event?.year && <span className="text-regx-orange">{event.year}</span>}
                            </h1>
                            <p className="text-[10px] tracking-[0.18em] text-gray-500 leading-none truncate">
                                {(event?.tagline || event?.discipline || '').toUpperCase()}
                            </p>
                        </div>
                    </div>

                    <div className="hidden xl:block text-center flex-1 min-w-0">
                        <p className="text-lg font-black italic tracking-wide truncate">{data?.category?.toUpperCase()}</p>
                        <p className="text-[10px] tracking-[0.2em] text-gray-500 truncate">
                            {[data?.form?.name, data?.type].filter(Boolean).join(' · ').toUpperCase()}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 ml-auto">
                        {(event?.date || event?.venue) && (
                            <div className="flex items-center gap-2 text-right">
                                <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm font-bold leading-tight">{(event.date ?? '').toUpperCase()}</p>
                                    <p className="text-[10px] text-gray-500 leading-tight truncate max-w-[16rem]">
                                        {(event.venue || event.place || '').toUpperCase()}
                                    </p>
                                </div>
                            </div>
                        )}

                        {(data?.categories?.length ?? 0) > 1 && (
                            <select
                                value={data?.category ?? ''}
                                onChange={(e) => setParams({ category: e.target.value })}
                                className="bg-[#11151c] border border-white/15 rounded-lg px-3 py-2 text-sm text-gray-100 max-w-[16rem]"
                                aria-label="Category"
                            >
                                {data.categories.map((name) => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* On a narrow screen the category cannot sit in the middle. */}
                <p className="xl:hidden px-4 pb-2 text-sm font-bold tracking-wide text-gray-300 truncate">
                    {data?.category}
                </p>
            </header>

            {/* The draw */}
            <main className="flex-1 p-3 space-y-5 min-h-0">
                {sides.length === 0 && (
                    <p className="text-center text-gray-500 py-24 text-lg">No draw has been made yet.</p>
                )}

                {sides.map(([side, rounds]) => {
                    const { label, accent: accentName } = sideOf(side);
                    const accent = ACCENTS[accentName] ?? ACCENTS.red;

                    return (
                        <section key={side}>
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`w-1 h-4 rounded-full ${accent.rail}`} />
                                <h2 className="text-xs font-black tracking-[0.2em] text-gray-300">{label.toUpperCase()}</h2>
                            </div>

                            <div className="overflow-x-auto pb-2">
                                <div className="flex gap-4 min-w-max">
                                    {rounds.map((round) => (
                                        <div key={round.round} className="w-64 flex flex-col">
                                            <p className="text-[10px] font-bold tracking-[0.18em] text-gray-500 mb-2">
                                                {round.label.toUpperCase()}
                                            </p>
                                            <div className="flex-1 flex flex-col justify-around gap-2.5">
                                                {round.matches.filter((match) => !isVoid(match)).map((match) => (
                                                    <MatchCard key={match.id} match={match} accent={accent} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    );
                })}
            </main>

            {/* Footer — the event, the champion, and that this is live */}
            <footer className="border-t border-white/10 bg-[#0b0f16] px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs font-bold tracking-wide truncate">
                        {[event?.name, event?.year].filter(Boolean).join(' ').toUpperCase()}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-gray-500 tracking-wide truncate">
                        {[event?.organisation, event?.place].filter(Boolean).join(' · ').toUpperCase()}
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {champion && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-bold tracking-wide">
                            <Trophy className="w-3.5 h-3.5" /> {champion.toUpperCase()}
                        </span>
                    )}

                    <span className="hidden sm:inline text-[10px] text-gray-600 tabular-nums">
                        {state.error ? 'RECONNECTING…' : updatedAt ? `UPDATED ${updatedAt.toLocaleTimeString()}` : ''}
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600 text-[11px] font-bold tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                    </span>
                </div>
            </footer>
        </div>
    );
};

export default PublicFixtureScreen;

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import TableScreen from './TableScreen';
import ResultsScreen from './ResultsScreen';
import { CalendarDays, ChevronRight, Loader2, SkipForward, Trophy, WifiOff } from 'lucide-react';
import { ACCENTS, STATUSES, accentFor, initials } from './boardStyle';
import api from '../services/api';
import { useRefreshShortcut } from './useRefreshShortcut';

/**
 * The hall screen: what is being pulled right now, in every category at once.
 *
 * Meant for a projector or a television above the tables, so it is read from a
 * distance — dark, several cards across, and nothing that needs clicking. It is
 * a public page: no sign-in, nothing an organiser would not put on a wall, and
 * it only ever reads.
 *
 * One card per category for now. When the fixture service knows which table a
 * match is on, a card becomes a table and little else changes.
 */

const REFRESH_SECONDS = 30;
const TABLE_REFRESH_SECONDS = 8;

const StatusPill = ({ status }) => {
    const { label, className, pulse } = STATUSES[status] ?? STATUSES.up_next;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide ${className}`}>
            {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
            {label}
        </span>
    );
};

/** A player's portrait spot. A photograph goes here when there is one. */
const Portrait = ({ name, size = 'sm' }) => (
    <div
        className={`${size === 'sm' ? 'w-9 h-9 text-[11px]' : 'w-12 h-12 text-sm'} rounded-lg shrink-0 grid place-items-center font-bold text-white/90 bg-white/10 ring-1 ring-white/10`}
    >
        {initials(name)}
    </div>
);

/** "T3" — which table a match is called to. */
const TableBadge = ({ table, large = false }) =>
    table ? (
        <span
            className={`inline-flex items-center justify-center rounded-md bg-white text-black font-black tracking-wide shrink-0 ${
                large ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]'
            }`}
            title={`Table ${table}`}
        >
            T{table}
        </span>
    ) : null;

/** A player's name, tagged when they reached this match on a bye, with their fouls. */
const Name = ({ player, fallback = '' }) =>
    player ? (
        <>
            {player.name}
            {player.fouls > 0 && (
                <span
                    className="ml-1.5 inline-flex items-center gap-0.5 align-middle"
                    title={`${player.fouls} foul${player.fouls === 1 ? '' : 's'}`}
                    aria-label={`${player.fouls} foul${player.fouls === 1 ? '' : 's'}`}
                >
                    {Array.from({ length: Math.min(player.fouls, 5) }, (_, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    ))}
                </span>
            )}
            {player.bye && (
                <span
                    className="ml-1.5 inline-flex items-center gap-0.5 rounded px-1 py-px align-middle text-[9px] font-bold tracking-wide bg-white/10 text-gray-300"
                    title="Got a bye — advanced without playing the previous round"
                >
                    <SkipForward className="w-2.5 h-2.5" /> BYE
                </span>
            )}
        </>
    ) : fallback;

/** One line in a "next" list: who, from which category, which round. */
const NextLine = ({ match, accent, showCategory = true }) => (
    <li className="relative px-3 py-2 flex items-center gap-2.5">
        <span className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r ${accent.rail}`} />
        <Portrait name={match.player1?.name} />
        <div className="min-w-0 flex-1">
            <p className="text-xs text-white truncate leading-tight"><Name player={match.player1} /></p>
            <p className="text-xs text-gray-400 truncate leading-tight">
                <span className="text-gray-600">vs</span> <Name player={match.player2} />
            </p>
            <p className="text-[9px] text-gray-500 truncate">
                {showCategory && match.category ? `${match.category.toUpperCase()} · ` : ''}
                {match.round}
            </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
    </li>
);

/**
 * One hall table: the match being played on it, big enough to read from the
 * back, and — when each category has its own table — what follows on it.
 */
const TableCard = ({ table, accent, showNext }) => {
    const match = table.match;
    const pending = !match || match.score1 === null;

    return (
        <section className={`rounded-xl overflow-hidden bg-[#11151c] border ${match ? accent.border : 'border-white/5'} ${match ? accent.glow : ''} flex flex-col`}>
            <header className={`${match ? accent.header : 'bg-white/5'} px-3 py-2 flex items-center justify-between gap-2`}>
                <h2 className="text-white font-black tracking-widest text-base sm:text-lg">TABLE {table.table}</h2>
                {match ? (
                    <StatusPill status="live" />
                ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide bg-white/10 text-gray-400">
                        FREE
                    </span>
                )}
            </header>

            <div className="px-3 py-2 text-[11px] text-gray-400 flex items-center gap-2 border-b border-white/5 min-h-[2.25rem]">
                {match ? (
                    <>
                        <span className="text-gray-100 font-semibold truncate">{table.category?.toUpperCase()}</span>
                        <span className="text-gray-600">|</span>
                        <span className="shrink-0">{match.round}</span>
                    </>
                ) : (
                    <span className="truncate">
                        {table.categories?.length
                            ? table.categories.join(' · ').toUpperCase()
                            : showNext
                              ? 'NO CATEGORY ON THIS TABLE'
                              : 'WAITING FOR THE NEXT MATCH'}
                    </span>
                )}
            </div>

            {/* Who just won here — for a few seconds after the result. */}
            {table.justWon && (
                <div className="px-3 py-1.5 flex items-center gap-2 bg-amber-400 text-gray-900 text-[11px] font-black tracking-wide min-w-0">
                    <Trophy className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">WINNER: {table.justWon.winner.toUpperCase()}</span>
                    <span className="ml-auto shrink-0 font-semibold opacity-70 truncate max-w-[45%]">def. {table.justWon.loser}</span>
                </div>
            )}

            <div className="relative h-20 sm:h-28 2xl:h-32 bg-gradient-to-br from-white/[0.08] to-transparent flex items-center justify-center gap-3">
                {match ? (
                    <>
                        <Portrait name={match.player1?.name} size="lg" />
                        <span className={`text-xs font-black tracking-widest ${accent.text}`}>VS</span>
                        <Portrait name={match.player2?.name} size="lg" />
                    </>
                ) : (
                    <p className="text-[11px] text-gray-600 tracking-widest">TABLE FREE</p>
                )}
                {match && <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${accent.rail}`} />}
            </div>

            <div className="px-2.5 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 min-h-[4.5rem]">
                <p className="min-w-0 text-white font-bold text-sm leading-snug break-words"><Name player={match?.player1} fallback="—" /></p>
                <div className="flex items-center gap-1 shrink-0">
                    <span className={`w-8 h-8 grid place-items-center rounded-md text-lg font-black ${pending ? 'bg-white/10 text-gray-500' : `${accent.score} text-white`}`}>
                        {pending ? '–' : match.score1}
                    </span>
                    <span className={`w-8 h-8 grid place-items-center rounded-md text-lg font-black ${pending ? 'bg-white/10 text-gray-500' : 'bg-white/10 text-white'}`}>
                        {pending ? '–' : match.score2}
                    </span>
                </div>
                <p className="min-w-0 text-right text-white font-bold text-sm leading-snug break-words"><Name player={match?.player2} fallback="—" /></p>
            </div>

            {showNext && (
                <div className="border-t border-white/5 mt-auto">
                    <p className="px-3 pt-2 text-[10px] font-bold tracking-wide text-gray-500">NEXT ON TABLE {table.table}</p>
                    {table.next?.length ? (
                        <ul className="divide-y divide-white/5">
                            {table.next.map((m) => (
                                <NextLine key={`${m.category}-${m.id}`} match={m} accent={accent} showCategory={(table.categories?.length ?? 0) > 1} />
                            ))}
                        </ul>
                    ) : (
                        <p className="px-3 py-3 text-[11px] text-gray-600 tracking-widest">NOTHING MORE QUEUED</p>
                    )}
                </div>
            )}
        </section>
    );
};

/** Automatic tables share one line: these go to whichever table frees next. */
const NextUpPanel = ({ waiting }) => (
    <section className="rounded-xl overflow-hidden bg-[#11151c] border border-white/5">
        <header className="px-3 py-2 flex items-center justify-between gap-2 border-b border-white/5">
            <h3 className="text-[11px] font-bold tracking-wide text-gray-300">NEXT UP · TO THE NEXT FREE TABLE</h3>
            <span className="text-[10px] font-semibold text-gray-400 bg-white/5 rounded px-1.5 py-0.5">{waiting.length} WAITING</span>
        </header>
        {waiting.length === 0 ? (
            <p className="px-3 py-6 text-[11px] text-gray-600 tracking-widest text-center">NO MATCHES WAITING</p>
        ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-white/5">
                {waiting.map((m, i) => (
                    <NextLine key={`${m.category}-${m.id}`} match={m} accent={accentFor(i)} />
                ))}
            </ul>
        )}
    </section>
);

const stateOf = (board) => {
    if (board.champion) return 'done';
    if (board.current) return 'live';

    return 'up_next';
};

/** The match being pulled in one category. */
const BoardCard = ({ board, accent }) => {
    const match = board.current;
    const pending = !match || match.score1 === null;

    return (
        <section className={`rounded-xl overflow-hidden bg-[#11151c] border ${accent.border} ${accent.glow} flex flex-col`}>
            <header className={`${accent.header} px-3 py-2 flex items-center justify-between gap-2`}>
                <h2 className="text-white font-extrabold tracking-wide text-sm sm:text-base truncate">
                    {board.category.toUpperCase()}
                </h2>
                <span className="flex items-center gap-1.5 shrink-0">
                    <TableBadge table={match?.table} large />
                    <StatusPill status={stateOf(board)} />
                </span>
            </header>

            <div className="px-3 py-2 text-[11px] text-gray-400 flex items-center gap-2 border-b border-white/5">
                <span className="text-gray-200 font-medium truncate">{match?.round ?? (board.champion ? 'Finished' : 'Waiting')}</span>
                <span className="text-gray-600">|</span>
                <span className="shrink-0">{board.played} of {board.total} played</span>
            </div>

            {/* Where the camera feed or table photograph belongs. */}
            <div className="relative h-20 sm:h-28 2xl:h-32 bg-gradient-to-br from-white/[0.08] to-transparent flex items-center justify-center gap-3">
                {match ? (
                    <>
                        <Portrait name={match.player1?.name} size="lg" />
                        <span className={`text-xs font-black tracking-widest ${accent.text}`}>VS</span>
                        <Portrait name={match.player2?.name} size="lg" />
                    </>
                ) : board.champion ? (
                    <div className="text-center">
                        <Trophy className={`w-7 h-7 mx-auto mb-1 ${accent.text}`} />
                        <p className="text-white font-black tracking-wide">{board.champion.toUpperCase()}</p>
                        <p className="text-[10px] text-gray-500 tracking-widest">CHAMPION</p>
                    </div>
                ) : (
                    <p className="text-[11px] text-gray-600 tracking-widest">NOTHING TO PULL</p>
                )}
                <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${accent.rail}`} />
            </div>

            {/* The score, which is what people look up to see. */}
            <div className="px-2.5 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 min-h-[4.5rem]">
                <div className="min-w-0">
                    <p className="text-white font-bold text-sm leading-snug break-words"><Name player={match?.player1} fallback="—" /></p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <span className={`w-8 h-8 grid place-items-center rounded-md text-lg font-black text-white ${pending ? 'bg-white/10 text-gray-500' : accent.score}`}>
                        {pending ? '–' : match.score1}
                    </span>
                    <span className={`w-8 h-8 grid place-items-center rounded-md text-lg font-black ${pending ? 'bg-white/10 text-gray-500' : 'bg-white/10 text-white'}`}>
                        {pending ? '–' : match.score2}
                    </span>
                </div>

                <div className="min-w-0 text-right">
                    <p className="text-white font-bold text-sm leading-snug break-words"><Name player={match?.player2} fallback="—" /></p>
                </div>
            </div>

            {/* How far this category has got. */}
            <div className="px-3 pb-3">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <span
                        className={`block h-full ${accent.dot}`}
                        style={{ width: `${board.total ? Math.round((board.played / board.total) * 100) : 0}%` }}
                    />
                </div>
            </div>
        </section>
    );
};

/** What follows in that category. */
const UpcomingCard = ({ board, accent }) => (
    <section className="rounded-xl overflow-hidden bg-[#11151c] border border-white/5 flex flex-col h-full">
        <header className="px-3 py-2 flex items-center justify-between gap-2 border-b border-white/5">
            <h3 className="text-[11px] font-bold tracking-wide text-gray-300 truncate">
                UPCOMING · {board.category.toUpperCase()}
            </h3>
            {board.remaining > 0 && (
                <span className="text-[10px] font-semibold text-gray-400 bg-white/5 rounded px-1.5 py-0.5 shrink-0">
                    {board.remaining} MORE
                </span>
            )}
        </header>

        {board.upcoming.length === 0 ? (
            <p className="px-3 py-6 text-[11px] text-gray-600 tracking-widest text-center">
                {board.champion ? 'FINISHED' : 'WAITING ON RESULTS'}
            </p>
        ) : (
            <ul className="divide-y divide-white/5 flex-1 flex flex-col justify-around">
                {board.upcoming.map((match) => (
                    <li key={match.id} className="relative px-3 py-2 flex items-center gap-2.5">
                        <span className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r ${accent.rail}`} />

                        <Portrait name={match.player1?.name} />

                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-white truncate leading-tight"><Name player={match.player1} /></p>
                            <p className="text-xs text-gray-400 truncate leading-tight">
                                <span className="text-gray-600">vs</span> <Name player={match.player2} />
                            </p>
                            <p className="text-[9px] text-gray-500 truncate">{match.round}</p>
                        </div>

                        {match.table ? <TableBadge table={match.table} /> : <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />}
                    </li>
                ))}
            </ul>
        )}
    </section>
);

/** /draw/{token}: the live board, or with ?show=results the wrap-up of results. */
const DrawRoute = () => {
    const [searchParams] = useSearchParams();

    return searchParams.get('show') === 'results' ? <ResultsScreen /> : <PublicFixtureScreen />;
};

const PublicFixtureScreen = () => {
    const { token } = useParams();
    const [searchParams] = useSearchParams();

    // ?table=2 shows that one table alone; see TableScreen for the options.
    const tableNo = Number(searchParams.get('table')) || null;
    const showtype = searchParams.get('showtype') === 'livestream' ? 'livestream' : 'normal';

    const [state, setState] = useState({ loading: true, error: null, data: null });
    const [updatedAt, setUpdatedAt] = useState(null);

    const load = useCallback(() => {
        api.get(`/public/fixtures/${token}`)
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
    }, [token]);

    useRefreshShortcut(load);

    useEffect(() => {
        load();

        // One table on a stream wants a result on screen within seconds.
        const timer = setInterval(load, (tableNo ? TABLE_REFRESH_SECONDS : REFRESH_SECONDS) * 1000);

        return () => clearInterval(timer);
    }, [load, tableNo]);

    const data = state.data;
    const event = data?.event;
    const boards = data?.boards ?? [];
    // Empty when the organiser has not set up tables.
    const tables = data?.tables?.count > 0 ? data.tables.list ?? [] : [];

    useEffect(() => {
        // One table names itself (TableScreen).
        if (!tableNo) document.title = event?.name ? `${event.name} — live` : 'Live board';
    }, [event?.name, tableNo]);

    // A stream overlay stays invisible until it has something to show.
    if (tableNo && showtype === 'livestream' && !data) {
        return null;
    }

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

    if (tableNo) {
        return (
            <TableScreen
                data={data}
                tableNo={tableNo}
                showtype={showtype}
                view={searchParams.get('view') ?? 'banner'}
                color={searchParams.get('color') ?? 'classic'}
                pos={searchParams.get('pos') ?? 'bottom'}
                updatedAt={updatedAt}
                error={state.error}
            />
        );
    }

    const [firstWord, ...restOfName] = (event?.name ?? '').split(' ');

    return (
        <div className="min-h-screen bg-[#05070b] text-white flex flex-col">
            {/* Masthead */}
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
                        <p className="text-lg font-black italic tracking-wide truncate">
                            {(data?.form?.name ?? '').toUpperCase()}
                        </p>
                        <p className="text-[10px] tracking-[0.2em] text-gray-500 truncate">{(data?.type ?? '').toUpperCase()}</p>
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
                    </div>
                </div>
            </header>

            {/* Categories */}
            <main className="flex-1 p-3 flex flex-col gap-3 min-h-0">
                {boards.length === 0 ? (
                    <p className="text-center text-gray-500 py-24 text-lg">No draw has been made yet.</p>
                ) : tables.length > 0 ? (
                    /* Tables in use: the hall as it stands, table by table. */
                    <>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                            {tables.map((table, index) => (
                                <TableCard key={table.table} table={table} accent={accentFor(index)} showNext={data.tables.mode === 'manual'} />
                            ))}
                        </div>

                        {data.tables.mode === 'auto' && <NextUpPanel waiting={data.tables.waiting ?? []} />}

                        {data.tables.mode === 'manual' && (data.tables.unassigned ?? []).length > 0 && (
                            <p className="text-[11px] text-gray-600 tracking-wide text-center">
                                NO TABLE YET: {data.tables.unassigned.join(' · ').toUpperCase()}
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                            {boards.map((board, index) => (
                                <BoardCard key={board.category} board={board} accent={accentFor(index)} />
                            ))}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 2xl:flex-1 2xl:min-h-0">
                            {boards.map((board, index) => (
                                <UpcomingCard key={board.category} board={board} accent={accentFor(index)} />
                            ))}
                        </div>
                    </>
                )}
            </main>

            {/* Footer: whose event this is, and that the board is live */}
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

export default DrawRoute;

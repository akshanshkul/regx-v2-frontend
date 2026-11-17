import React, { useEffect } from 'react';
import { ChevronRight, SkipForward, Trophy } from 'lucide-react';
import { initials } from './boardStyle';

/**
 * One hall table on its own: /draw/{token}?table=2
 *
 *   showtype=normal      (default) a full screen for a monitor beside the table
 *   showtype=livestream  a transparent overlay for a stream (OBS browser source),
 *                        drawn as a TV score graphic:
 *     view=banner        (default) red/blue bars either side of the table badge
 *     view=scorebug      a compact box in a corner
 *     view=ticker        a thin strip along the edge
 *   color=classic|gold|green|purple|orange   the two sides' colours
 *   pos=bottom|top       where the overlay sits (livestream)
 */

export const THEMES = {
    classic: { a: '#dc2626', b: '#2563eb', hi: '#facc15' },
    gold: { a: '#d97706', b: '#334155', hi: '#fde68a' },
    green: { a: '#059669', b: '#0f766e', hi: '#a7f3d0' },
    purple: { a: '#7c3aed', b: '#db2777', hi: '#f5d0fe' },
    orange: { a: '#f26522', b: '#1e293b', hi: '#fed7aa' },
};

export const VIEWS = ['banner', 'scorebug', 'ticker'];

const upper = (text) => (text ?? '').toUpperCase();

/** Red dots, one per foul. */
const Fouls = ({ count, className = '' }) =>
    count > 0 ? (
        <span className={`inline-flex items-center gap-1 ${className}`} title={`${count} foul${count === 1 ? '' : 's'}`}>
            <span className="text-[0.6em] font-bold tracking-widest opacity-80">FOULS</span>
            {Array.from({ length: Math.min(count, 5) }, (_, i) => (
                <span key={i} className="w-[0.45em] h-[0.45em] rounded-full bg-red-500 ring-1 ring-white/60" />
            ))}
        </span>
    ) : null;

const Bye = () => (
    <span className="inline-flex items-center gap-0.5 rounded px-1 text-[0.55em] font-bold tracking-wide bg-white/15 align-middle">
        <SkipForward className="w-[1em] h-[1em]" /> BYE
    </span>
);

const hasScore = (match) => match && match.score1 !== null && match.score1 !== undefined;

// ------------------------------------------------------------------ livestream

/** Broadcast lower third: the two sides as angled bars around the table badge. */
const Banner = ({ table, match, next, theme }) => {
    const bar = 'relative flex-1 min-w-0 h-12 sm:h-14 flex items-center px-5 sm:px-8 text-white font-black italic tracking-wide text-lg sm:text-2xl shadow-2xl';

    return (
        <div className="w-full max-w-5xl mx-auto px-4 flex flex-col items-center">
            <div className="w-full flex items-center">
                <div className={`${bar} justify-end gap-3`} style={{ background: `linear-gradient(90deg, transparent, ${theme.a} 18%)`, clipPath: 'polygon(4% 0, 100% 0, 100% 100%, 0 100%)' }}>
                    {match ? (
                        <>
                            <Fouls count={match.player1?.fouls} className="text-xs sm:text-sm not-italic" />
                            <span className="truncate">{upper(match.player1?.name)}</span>
                            {match.player1?.bye && <Bye />}
                            {hasScore(match) && <span className="ml-1 px-2 rounded bg-black/30 tabular-nums">{match.score1}</span>}
                        </>
                    ) : (
                        <span className="truncate text-base sm:text-xl opacity-90">{next ? 'NEXT UP' : 'TABLE FREE'}</span>
                    )}
                </div>

                <div className="relative z-10 -mx-3 shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#0b0f16] border-4 grid place-items-center text-center shadow-2xl" style={{ borderColor: theme.hi }}>
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.25em] text-gray-300">TABLE</p>
                        <p className="text-3xl sm:text-4xl font-black text-white leading-none">{table.table}</p>
                    </div>
                </div>

                <div className={`${bar} gap-3`} style={{ background: `linear-gradient(270deg, transparent, ${theme.b} 18%)`, clipPath: 'polygon(0 0, 96% 0, 100% 100%, 0 100%)' }}>
                    {match ? (
                        <>
                            {hasScore(match) && <span className="mr-1 px-2 rounded bg-black/30 tabular-nums">{match.score2}</span>}
                            {match.player2?.bye && <Bye />}
                            <span className="truncate">{upper(match.player2?.name)}</span>
                            <Fouls count={match.player2?.fouls} className="text-xs sm:text-sm not-italic" />
                        </>
                    ) : (
                        <span className="truncate text-base sm:text-xl opacity-90">
                            {next ? `${upper(next.player1?.name)} VS ${upper(next.player2?.name)}` : 'WAITING FOR THE NEXT MATCH'}
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-2 px-4 py-1.5 rounded-md bg-black/75 text-center">
                <p className="text-xs sm:text-sm font-bold tracking-widest text-white">
                    {match ? (
                        <>
                            <span className="text-red-500 animate-pulse">●</span> LIVE <span className="text-gray-500 mx-1">·</span> {upper(match.round)}
                        </>
                    ) : next ? (
                        <>
                            <span style={{ color: theme.hi }}>NEXT</span> <span className="text-gray-500 mx-1">·</span> {upper(next.round)}
                        </>
                    ) : (
                        'TABLE FREE'
                    )}
                </p>
                <p className="text-[10px] sm:text-xs font-semibold tracking-wider text-gray-300">
                    {upper(match ? table.category : next?.category)}
                </p>
            </div>
        </div>
    );
};

/** Compact TV score bug: table and status on the left, a row per player. */
const Scorebug = ({ table, match, next, theme }) => {
    const row = (player, score, color) => (
        <div className="flex-1 flex items-center min-h-9 sm:min-h-10 bg-[#11151c]">
            <span className="w-1.5 self-stretch" style={{ background: color }} />
            <span className="flex-1 min-w-0 px-3 font-black italic tracking-wide text-white truncate text-sm sm:text-base">
                {upper(player?.name ?? '—')} {player?.bye && <Bye />}
            </span>
            <Fouls count={player?.fouls} className="text-[10px] text-gray-300 pr-2" />
            {hasScore(match) && (
                <span className="w-10 self-stretch grid place-items-center font-black text-lg text-white tabular-nums" style={{ background: color }}>
                    {score}
                </span>
            )}
        </div>
    );

    const shown = match ?? next;

    return (
        <div className="inline-flex flex-col rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10 w-[22rem] sm:w-[26rem] max-w-[calc(100vw-2rem)]">
            <div className="flex">
                <div className="w-20 shrink-0 flex flex-col items-center justify-center gap-1 py-2 bg-[#0b0f16] border-r border-white/10">
                    <p className="text-[9px] font-bold tracking-[0.25em] text-gray-400">TABLE</p>
                    <p className="text-3xl font-black text-white leading-none">{table.table}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide ${match ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-300'}`}>
                        {match ? 'LIVE' : next ? 'NEXT' : 'FREE'}
                    </span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col divide-y divide-black/40 bg-[#11151c]">
                    {shown ? (
                        <>
                            {row(shown.player1, shown.score1, theme.a)}
                            {row(shown.player2, shown.score2, theme.b)}
                        </>
                    ) : (
                        <p className="h-[4.5rem] grid place-items-center text-xs font-bold tracking-widest text-gray-400 bg-[#11151c]">WAITING FOR THE NEXT MATCH</p>
                    )}
                </div>
            </div>
            <div className="px-3 py-1.5 bg-black/85 text-[10px] font-bold tracking-wider text-gray-300 flex items-center gap-2 min-w-0">
                <span className="truncate">{upper(match ? table.category : next?.category)}{shown ? ` · ${upper(shown.round)}` : ''}</span>
                {match && next && (
                    <span className="ml-auto shrink-0 truncate max-w-[50%]" style={{ color: theme.hi }}>
                        NEXT {upper(next.player1?.name)} VS {upper(next.player2?.name)}
                    </span>
                )}
            </div>
        </div>
    );
};

/** A thin strip along the edge of the picture. */
const Ticker = ({ table, match, next, theme }) => {
    const shown = match ?? next;

    return (
        <div className="w-full flex items-stretch h-11 sm:h-12 bg-[#0b0f16]/95 shadow-2xl text-white overflow-hidden">
            <div className="shrink-0 px-4 flex items-center gap-2 font-black italic tracking-wide" style={{ background: theme.a }}>
                TABLE {table.table}
                <span className={`not-italic px-1.5 py-0.5 rounded text-[10px] ${match ? 'bg-white text-red-600' : 'bg-black/30'}`}>{match ? 'LIVE' : next ? 'NEXT' : 'FREE'}</span>
            </div>
            <div className="hidden sm:flex shrink-0 items-center px-4 text-[11px] font-bold tracking-wider text-gray-300 border-r border-white/10 max-w-[30%]">
                <span className="truncate">{upper(match ? table.category : next?.category)}{shown ? ` · ${upper(shown.round)}` : ''}</span>
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-3 px-4 font-black italic tracking-wide text-sm sm:text-lg">
                {shown ? (
                    <>
                        <span className="truncate">{upper(shown.player1?.name)}</span>
                        <Fouls count={shown.player1?.fouls} className="text-[10px] not-italic text-gray-300" />
                        <span className="shrink-0 px-2 rounded text-xs not-italic" style={{ background: theme.b }}>
                            {hasScore(shown) ? `${shown.score1} – ${shown.score2}` : 'VS'}
                        </span>
                        <Fouls count={shown.player2?.fouls} className="text-[10px] not-italic text-gray-300" />
                        <span className="truncate">{upper(shown.player2?.name)}</span>
                    </>
                ) : (
                    <span className="text-xs sm:text-sm text-gray-400 not-italic font-bold tracking-widest">WAITING FOR THE NEXT MATCH</span>
                )}
            </div>
        </div>
    );
};

/**
 * The few seconds after a match is decided on this table: who won, in the
 * same style as the live graphic, before the table shows its next pair.
 */
const Winner = ({ view, table, won, theme }) => {
    const line = `${upper(won.category)} · ${upper(won.round)}`;

    if (view === 'ticker') {
        return (
            <div className="w-full flex items-stretch h-11 sm:h-12 bg-[#0b0f16]/95 shadow-2xl text-white overflow-hidden">
                <div className="shrink-0 px-4 flex items-center gap-2 font-black italic tracking-wide text-gray-900" style={{ background: theme.hi }}>
                    <Trophy className="w-4 h-4" /> WINNER
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-3 px-4">
                    <span className="font-black italic tracking-wide text-sm sm:text-lg truncate">{upper(won.winner)}</span>
                    {won.score && <span className="shrink-0 px-2 rounded text-xs font-bold" style={{ background: theme.a }}>{won.score}</span>}
                    <span className="text-xs text-gray-400 truncate">def. {upper(won.loser)} · TABLE {table.table} · {line}</span>
                </div>
            </div>
        );
    }

    if (view === 'scorebug') {
        return (
            <div className="inline-flex flex-col rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10 w-[22rem] sm:w-[26rem] max-w-[calc(100vw-2rem)]">
                <div className="px-3 py-1.5 flex items-center gap-2 text-[11px] font-black tracking-widest text-gray-900" style={{ background: theme.hi }}>
                    <Trophy className="w-3.5 h-3.5" /> WINNER · TABLE {table.table}
                </div>
                <div className="bg-[#11151c] px-3 py-2.5">
                    <p className="text-lg sm:text-xl font-black italic text-white truncate">{upper(won.winner)} {won.score && <span className="not-italic text-sm text-gray-400">{won.score}</span>}</p>
                    <p className="text-[11px] text-gray-400 truncate">def. {upper(won.loser)}</p>
                </div>
                <div className="px-3 py-1.5 bg-black/85 text-[10px] font-bold tracking-wider text-gray-300 truncate">{line}</div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto px-4 flex flex-col items-center">
            <span className="mb-1 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-black tracking-widest text-gray-900" style={{ background: theme.hi }}>
                <Trophy className="w-3.5 h-3.5" /> WINNER
            </span>
            <div className="w-full flex items-center">
                <div className="relative flex-1 min-w-0 h-12 sm:h-14 flex items-center justify-end px-5 sm:px-8 text-white font-black italic tracking-wide text-lg sm:text-2xl shadow-2xl" style={{ background: `linear-gradient(90deg, transparent, ${theme.a} 18%)`, clipPath: 'polygon(4% 0, 100% 0, 100% 100%, 0 100%)' }}>
                    <span className="truncate">{upper(won.winner)}</span>
                </div>
                <div className="relative z-10 -mx-3 shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#0b0f16] border-4 grid place-items-center text-center shadow-2xl" style={{ borderColor: theme.hi }}>
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.25em] text-gray-300">TABLE</p>
                        <p className="text-3xl sm:text-4xl font-black text-white leading-none">{table.table}</p>
                    </div>
                </div>
                <div className="relative flex-1 min-w-0 h-12 sm:h-14 flex items-center px-5 sm:px-8 text-gray-300 font-black italic tracking-wide text-base sm:text-xl shadow-2xl bg-[#1f2937]/90" style={{ clipPath: 'polygon(0 0, 96% 0, 100% 100%, 0 100%)' }}>
                    <span className="truncate">{won.score ? `${won.score} · ` : ''}DEF. {upper(won.loser)}</span>
                </div>
            </div>
            <p className="mt-2 px-4 py-1.5 rounded-md bg-black/75 text-[10px] sm:text-xs font-semibold tracking-wider text-gray-300">{line}</p>
        </div>
    );
};

// ------------------------------------------------------------------ normal

const Portrait = ({ name, color }) => (
    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full grid place-items-center text-3xl sm:text-5xl font-black text-white ring-4 ring-white/10" style={{ background: color }}>
        {initials(name) || '?'}
    </div>
);

const FullScreen = ({ data, table, match, next, queue, theme, nextLabel, updatedAt, error }) => {
    const event = data?.event;
    const side = (player, score, color, align) => (
        <div className={`flex-1 min-w-0 flex flex-col items-center gap-4 ${align}`}>
            <Portrait name={player?.name} color={color} />
            <p className="text-2xl sm:text-4xl lg:text-5xl font-black italic tracking-wide text-center break-words max-w-full">
                {upper(player?.name ?? '—')}
            </p>
            <div className="flex items-center gap-3 text-base sm:text-xl">
                {player?.bye && <Bye />}
                <Fouls count={player?.fouls} className="text-gray-300" />
            </div>
            {hasScore(match) && <p className="text-5xl sm:text-7xl font-black tabular-nums" style={{ color }}>{score}</p>}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#05070b] text-white flex flex-col">
            <header className="px-4 sm:px-6 py-3 flex items-center gap-4 border-b border-white/10 bg-[#0b0f16]">
                <div className="min-w-0">
                    <p className="text-sm sm:text-lg font-black tracking-wide truncate">{upper([event?.name, event?.year].filter(Boolean).join(' '))}</p>
                    <p className="text-[10px] tracking-[0.2em] text-gray-500 truncate">{upper(data?.form?.name)}</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600 text-[11px] font-bold tracking-wide shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                </span>
            </header>

            <main className="flex-1 flex flex-col">
                <div className="px-4 sm:px-6 py-4 flex items-end justify-between gap-4 flex-wrap" style={{ background: `linear-gradient(90deg, ${theme.a}, ${theme.b})` }}>
                    <h1 className="text-4xl sm:text-6xl font-black tracking-widest">TABLE {table.table}</h1>
                    <div className="text-right min-w-0">
                        <p className="text-sm sm:text-xl font-black truncate">{upper(match ? table.category : next?.category ?? 'Waiting')}</p>
                        <p className="text-xs sm:text-base font-semibold opacity-90">{upper((match ?? next)?.round ?? '')}</p>
                    </div>
                </div>

                <div className="flex-1 flex items-center px-4 sm:px-10 py-8">
                    {table.justWon ? (
                        <div className="w-full text-center">
                            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm sm:text-base font-black tracking-widest text-gray-900" style={{ background: theme.hi }}>
                                <Trophy className="w-5 h-5" /> WINNER
                            </span>
                            <p className="mt-4 text-4xl sm:text-7xl font-black italic tracking-wide break-words">{upper(table.justWon.winner)}</p>
                            <p className="mt-3 text-base sm:text-2xl text-gray-400">
                                {table.justWon.score ? `${table.justWon.score} · ` : ''}def. {upper(table.justWon.loser)}
                            </p>
                            <p className="mt-2 text-xs sm:text-sm text-gray-500">{upper(table.justWon.category)} · {upper(table.justWon.round)}</p>
                        </div>
                    ) : match ? (
                        <div className="w-full flex items-start gap-4 sm:gap-10">
                            {side(match.player1, match.score1, theme.a, '')}
                            <span className="self-center text-3xl sm:text-5xl font-black" style={{ color: theme.hi }}>VS</span>
                            {side(match.player2, match.score2, theme.b, '')}
                        </div>
                    ) : (
                        <div className="w-full text-center">
                            <p className="text-2xl sm:text-4xl font-black tracking-widest text-gray-500">TABLE FREE</p>
                            {next && (
                                <p className="mt-4 text-lg sm:text-2xl font-bold">
                                    <span style={{ color: theme.hi }}>NEXT:</span> {upper(next.player1?.name)} <span className="text-gray-500">VS</span> {upper(next.player2?.name)}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {nextLabel && (
                    <section className="border-t border-white/10 bg-[#0b0f16] px-4 sm:px-6 py-3">
                        <p className="text-[11px] font-bold tracking-widest text-gray-500 mb-2">{nextLabel}</p>
                        <ul className="grid gap-2 sm:grid-cols-3">
                            {queue.map((m) => (
                                <li key={`${m.category}-${m.id}`} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 min-w-0">
                                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: theme.hi }} />
                                    <span className="min-w-0">
                                        <span className="block text-sm font-bold truncate">{upper(m.player1?.name)} <span className="text-gray-500">vs</span> {upper(m.player2?.name)}</span>
                                        <span className="block text-[10px] text-gray-500 truncate">{upper(m.category)} · {upper(m.round)}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </main>

            <footer className="px-4 py-2 text-[10px] text-gray-600 tabular-nums text-right border-t border-white/10">
                {error ? 'RECONNECTING…' : updatedAt ? `UPDATED ${updatedAt.toLocaleTimeString()}` : ''}
            </footer>
        </div>
    );
};

// ------------------------------------------------------------------ screen

const TableScreen = ({ data, tableNo, showtype, view, color, pos, updatedAt, error }) => {
    const live = showtype === 'livestream';
    const theme = THEMES[color] ?? THEMES.classic;

    // A stream overlay is laid over the video: nothing of the page may show.
    useEffect(() => {
        if (!live) return undefined;

        const html = document.documentElement.style.background;
        const body = document.body.style.background;
        document.documentElement.style.background = 'transparent';
        document.body.style.background = 'transparent';

        return () => {
            document.documentElement.style.background = html;
            document.body.style.background = body;
        };
    }, [live]);

    useEffect(() => {
        document.title = `Table ${tableNo}${data?.event?.name ? ` — ${data.event.name}` : ''}`;
    }, [tableNo, data?.event?.name]);

    const tables = data?.tables?.count > 0 ? data.tables.list ?? [] : [];
    const table = tables.find((t) => Number(t.table) === tableNo);

    if (!table) {
        const message = tables.length === 0 ? 'Tables are not set up for this event.' : `There is no table ${tableNo}.`;

        return live ? (
            <p className="fixed bottom-4 left-4 rounded bg-black/70 px-3 py-1.5 text-xs text-gray-300">{message}</p>
        ) : (
            <div className="min-h-screen bg-[#05070b] grid place-items-center text-gray-400 text-lg px-6 text-center">{message}</div>
        );
    }

    const match = table.match;
    // By category a table has its own line; automatic tables share one.
    const ownNext = table.next ?? [];
    const queue = ownNext.length > 0 ? ownNext : (data.tables.mode === 'auto' ? data.tables.waiting ?? [] : []);
    const next = queue[0] ?? null;
    const nextLabel = queue.length === 0 ? null : ownNext.length > 0 ? `NEXT ON TABLE ${table.table}` : 'NEXT TO A FREE TABLE';

    if (!live) {
        return (
            <FullScreen
                data={data}
                table={table}
                match={match}
                next={next}
                queue={queue.slice(0, 3)}
                theme={theme}
                nextLabel={nextLabel}
                updatedAt={updatedAt}
                error={error}
            />
        );
    }

    const style = VIEWS.includes(view) ? view : 'banner';
    const Graphic = { banner: Banner, scorebug: Scorebug, ticker: Ticker }[style];
    const top = pos === 'top';

    return (
        <div
            className={`fixed inset-x-0 ${top ? 'top-0' : 'bottom-0'} flex ${style === 'scorebug' ? 'justify-start p-4 sm:p-6' : style === 'ticker' ? '' : 'justify-center py-4 sm:py-6'}`}
        >
            {/* Who just won here, for a few seconds, before the next pair. */}
            {table.justWon ? <Winner view={style} table={table} won={table.justWon} theme={theme} /> : <Graphic table={table} match={match} next={next} theme={theme} />}
        </div>
    );
};

export default TableScreen;

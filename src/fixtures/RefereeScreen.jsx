import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Check, Flag, Loader2, Minus, Plus, RefreshCw, SkipForward, Trophy, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const REFRESH_SECONDS = 6;

const messageOf = (error, fallback) =>
    error?.response?.data?.messages?.error || error?.response?.data?.message || fallback;

/**
 * A referee's phone at one hall table: /ref/{token}?table=2
 *
 * Shows the match on that table and lets the referee record the winner and
 * fouls — nothing else. Picking a winner asks once more, so a stray tap never
 * decides a match. The table moves on to its next match by itself.
 */
const RefereeScreen = () => {
    const { token } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const table = Number(searchParams.get('table')) || 0;

    const [state, setState] = useState({ loading: true, error: null, data: null });
    const [busy, setBusy] = useState(null);
    const [picked, setPicked] = useState(null); // player awaiting confirmation

    const load = useCallback(() => {
        if (!table) {
            setState({ loading: false, error: null, data: null });
            return;
        }

        api.get(`/public/referee/${token}`, { params: { table } })
            .then((data) => setState({ loading: false, error: null, data }))
            .catch((error) => setState((s) => ({ ...s, loading: false, error: messageOf(error, 'Could not reach the server') })));
    }, [token, table]);

    useEffect(() => {
        load();
        const timer = setInterval(load, REFRESH_SECONDS * 1000);
        return () => clearInterval(timer);
    }, [load]);

    useEffect(() => {
        document.title = table ? `Referee · Table ${table}` : 'Referee';
    }, [table]);

    const data = state.data;
    const on = data?.table;
    const match = on?.match ?? null;
    const rules = data?.fouls ?? { enabled: false, limit: 0, auto: false };

    // A new match on the table clears a pending confirmation.
    useEffect(() => setPicked(null), [match?.id]);

    const apply = (payload) => setState({ loading: false, error: null, data: payload });

    const recordWinner = async (player) => {
        setBusy(`win-${player.id}`);

        try {
            const payload = await api.post(`/public/referee/${token}/winner`, {
                table, category: on.category, matchId: match.id, playerId: player.id,
            });
            apply(payload);
            toast.success(`${player.name} wins`);
        } catch (error) {
            toast.error(messageOf(error, 'Could not save the result'));
            load();
        } finally {
            setBusy(null);
            setPicked(null);
        }
    };

    const changeFouls = async (player, opponent, fouls) => {
        setBusy(`foul-${player.id}`);

        try {
            const payload = await api.put(`/public/referee/${token}/fouls`, {
                table, category: on.category, matchId: match.id, playerId: player.id, fouls,
            });

            if (payload.outcome?.decided) {
                toast.success(`${opponent.name} wins on fouls`);
            } else if (payload.outcome?.limitReached) {
                // Ask-first rules: the referee confirms the win like any other.
                setPicked(opponent);
                toast(`${player.name} reached ${fouls} fouls — confirm ${opponent.name} as winner`, { icon: '⚠️' });
            }

            apply(payload);
        } catch (error) {
            toast.error(messageOf(error, 'Could not save the fouls'));
            load();
        } finally {
            setBusy(null);
        }
    };

    // ------------------------------------------------------------------ views

    if (!table) {
        return (
            <Shell title="Referee">
                <div className="p-6 text-center">
                    <p className="text-gray-300 mb-4">Which table are you refereeing?</p>
                    <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((t) => (
                            <button key={t} type="button" onClick={() => setSearchParams({ table: String(t) })} className="h-14 rounded-xl bg-white/10 text-white text-xl font-black hover:bg-white/20">
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </Shell>
        );
    }

    if (state.loading && !data) {
        return (
            <Shell title={`Table ${table}`}>
                <div className="py-24 flex justify-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
            </Shell>
        );
    }

    if (state.error && !data) {
        return (
            <Shell title={`Table ${table}`}>
                <div className="p-8 text-center">
                    <WifiOff className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-300">{state.error}</p>
                    <button type="button" onClick={load} className="mt-4 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-semibold">Try again</button>
                </div>
            </Shell>
        );
    }

    const next = (on?.next?.length ? on.next : data?.waiting ?? [])[0] ?? null;

    return (
        <Shell title={`Table ${table}`} subtitle={data?.event?.name || data?.form?.name} onRefresh={load} offline={Boolean(state.error)}>
            {match ? (
                <div className="p-4 space-y-4">
                    <div className="text-center">
                        <p className="text-xs font-bold tracking-widest text-red-400 flex items-center justify-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> ON THE TABLE
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">{on.category}</p>
                        <p className="text-xs text-gray-400">{match.round}</p>
                    </div>

                    {[[match.player1, match.player2, 'bg-red-600'], [match.player2, match.player1, 'bg-blue-600']].map(([player, opponent, color]) => (
                        <div key={player.id} className="rounded-2xl bg-[#11151c] ring-1 ring-white/10 overflow-hidden">
                            <div className={`${color} h-1.5`} />
                            <div className="p-4">
                                <p className="text-2xl font-black text-white break-words">
                                    {player.name}
                                    {player.bye && (
                                        <span className="ml-2 inline-flex items-center gap-0.5 align-middle rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-gray-300">
                                            <SkipForward className="w-3 h-3" /> BYE
                                        </span>
                                    )}
                                </p>

                                {rules.enabled && (
                                    <div className="mt-3 flex items-center gap-3">
                                        <Flag className="w-4 h-4 text-red-400" />
                                        <span className="text-sm text-gray-400">Fouls</span>
                                        <div className="ml-auto flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => changeFouls(player, opponent, player.fouls - 1)}
                                                disabled={busy !== null || player.fouls === 0}
                                                className="w-12 h-12 rounded-xl bg-white/10 text-white grid place-items-center disabled:opacity-30"
                                                aria-label={`One foul fewer for ${player.name}`}
                                            >
                                                <Minus className="w-5 h-5" />
                                            </button>
                                            <span className={`w-14 text-center text-2xl font-black tabular-nums ${rules.limit > 0 && player.fouls >= rules.limit ? 'text-red-500' : 'text-white'}`}>
                                                {busy === `foul-${player.id}` ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : player.fouls}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => changeFouls(player, opponent, player.fouls + 1)}
                                                disabled={busy !== null || player.fouls >= 20}
                                                className="w-12 h-12 rounded-xl bg-red-600 text-white grid place-items-center disabled:opacity-30"
                                                aria-label={`One more foul for ${player.name}`}
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {picked?.id === player.id ? (
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setPicked(null)} disabled={busy !== null} className="h-14 rounded-xl bg-white/10 text-white font-bold">
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => recordWinner(player)}
                                            disabled={busy !== null}
                                            className="h-14 rounded-xl bg-green-600 text-white font-black inline-flex items-center justify-center gap-2"
                                        >
                                            {busy === `win-${player.id}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} Confirm
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setPicked(player)}
                                        disabled={busy !== null}
                                        className="mt-4 w-full h-14 rounded-xl bg-white text-gray-900 font-black text-lg inline-flex items-center justify-center gap-2 disabled:opacity-40"
                                    >
                                        <Trophy className="w-5 h-5" /> {player.name.split(' ')[0]} wins
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center">
                    <p className="text-2xl font-black tracking-widest text-gray-500">TABLE FREE</p>
                    <p className="mt-2 text-sm text-gray-400">The next match appears here by itself when it is called to this table.</p>
                </div>
            )}

            {next && (
                <div className="mx-4 mb-4 rounded-xl bg-white/5 px-4 py-3">
                    <p className="text-[10px] font-bold tracking-widest text-gray-500">{on?.next?.length ? `NEXT ON TABLE ${table}` : 'NEXT TO A FREE TABLE'}</p>
                    <p className="mt-1 text-sm font-bold text-white">{next.player1?.name} <span className="text-gray-500">vs</span> {next.player2?.name}</p>
                    <p className="text-xs text-gray-500">{next.category} · {next.round}</p>
                </div>
            )}
        </Shell>
    );
};

const Shell = ({ title, subtitle, onRefresh, offline, children }) => (
    <div className="min-h-screen bg-[#05070b] text-white">
        <header className="sticky top-0 z-10 bg-[#0b0f16] border-b border-white/10 px-4 py-3 flex items-center gap-3">
            <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-widest text-regx-orange">REFEREE</p>
                <h1 className="text-xl font-black leading-tight">{title}</h1>
                {subtitle && <p className="text-[11px] text-gray-500 truncate">{subtitle}</p>}
            </div>
            {onRefresh && (
                <button type="button" onClick={onRefresh} className="ml-auto p-2 rounded-lg bg-white/5 text-gray-300" aria-label="Refresh">
                    <RefreshCw className={`w-5 h-5 ${offline ? 'text-amber-400' : ''}`} />
                </button>
            )}
        </header>
        <main className="max-w-md mx-auto">{children}</main>
    </div>
);

export default RefereeScreen;

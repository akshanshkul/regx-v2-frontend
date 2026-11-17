import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    AlertCircle, ArrowUpRight, CheckCircle2, Clock3, Crown, Download, Loader2, Medal, RefreshCw, Trophy, UserRound,
} from 'lucide-react';

import api from '../../services/api';
import { encodeId } from '../../shared/utils/ids';
import { messageOf } from '../pages/fixtures/fixtureData';
import { inPlayingOrder, buildRanking, downloadRankingPdf } from '../pages/fixtures/FixtureCategory';

const MEDAL = {
    1: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    2: 'bg-gray-100 text-gray-700 border-gray-300',
    3: 'bg-orange-100 text-orange-800 border-orange-300',
};

/** The standings of a finished draw, read from the draw as the fixture page does. */
const standingsOf = (draw) => {
    const sides = inPlayingOrder(draw.rounds);
    const decisive = draw.rounds?.grand_final ?? sides[sides.length - 1]?.[1];
    const champion = decisive?.[decisive.length - 1]?.matches?.[0]?.winner?.name ?? null;

    return { champion, ranking: buildRanking(sides, draw.players ?? [], champion), typeName: draw.category?.typeName };
};

const PLACE = { 1: '1st', 2: '2nd', 3: '3rd' };

/**
 * One PDF with the first three places of every completed category. Places can
 * be shared (two 3rds), so a category may list more than three people.
 */
const downloadPodiumsPdf = async (formName, categories) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 14;

    doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(17, 24, 39);
    doc.text(String(formName || 'Results'), margin, margin);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(107, 114, 128);
    doc.text(`Results  ·  1st, 2nd and 3rd  ·  ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`, margin, margin + 6);

    const body = [];

    categories.forEach(({ category, podium }) => {
        podium.forEach((row, index) => {
            body.push([
                ...(index === 0 ? [{ content: category, rowSpan: podium.length, styles: { fontStyle: 'bold', valign: 'middle' } }] : []),
                PLACE[row.place],
                row.name,
                row.registration,
            ]);
        });
    });

    autoTable(doc, {
        startY: margin + 12,
        margin: { left: margin, right: margin },
        head: [['Category', 'Place', 'Player', 'Registration']],
        body,
        styles: { fontSize: 9.5, cellPadding: 2.2 },
        headStyles: { fillColor: [236, 77, 45] },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 16 } },
        didParseCell: (data) => {
            if (data.section !== 'body' || data.column.index === 0) return;
            const place = { '1st': 0, '2nd': 1, '3rd': 2 }[data.row.raw[data.row.raw.length - 3]];
            if (place !== undefined) data.cell.styles.fillColor = [[255, 247, 205], [243, 244, 246], [254, 235, 220]][place];
        },
    });

    doc.save(`${String(formName || 'results').replace(/[^\w.-]+/g, '_')}-results.pdf`);
};

/** Runs the jobs a few at a time, so forty finished categories are not forty requests at once. */
const inBatches = async (items, size, job) => {
    for (let i = 0; i < items.length; i += size) {
        await Promise.all(items.slice(i, i + size).map(job));
    }
};

/**
 * Golds, silvers and bronzes per club — or district, state, whichever
 * question of the form groups people. The choice is saved and also drives the
 * medal table on the public results screen.
 */
const MedalTable = ({ formId, refreshKey }) => {
    const [state, setState] = useState({ loading: true, field: null, fields: [], medals: [] });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get(`/forms/${formId}/fixture/medals`)
            .then((p) => setState({ loading: false, field: p.field, fields: p.fields ?? [], medals: p.medals ?? [] }))
            .catch(() => setState((s) => ({ ...s, loading: false })));
    }, [formId, refreshKey]);

    const choose = async (field) => {
        setSaving(true);

        try {
            const p = await api.put(`/forms/${formId}/fixture/medals`, { field });
            setState({ loading: false, field: p.field, fields: p.fields ?? [], medals: p.medals ?? [] });
        } catch (error) {
            toast.error(messageOf(error, 'Could not save'));
        } finally {
            setSaving(false);
        }
    };

    if (state.loading) return null;

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900"><Trophy className="h-4 w-4 text-amber-500" /> Medal table</h3>
                <label className="ml-auto flex items-center gap-2 text-xs text-gray-600">
                    Group by
                    <select
                        value={state.field ?? ''}
                        onChange={(e) => choose(e.target.value)}
                        disabled={saving}
                        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-regx-orange"
                    >
                        <option value="">Choose a question…</option>
                        {state.fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                </label>
            </div>

            {!state.field ? (
                <p className="mt-3 text-xs text-gray-500">Choose the question that names each athlete&apos;s club, district or team. Medals from completed categories are then counted per group, here and on the public results screen.</p>
            ) : state.medals.length === 0 ? (
                <p className="mt-3 text-xs text-gray-500">No medals yet — they count as categories are completed.</p>
            ) : (
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs text-gray-500">
                            <tr>
                                <th className="py-2 pr-3 font-semibold">#</th>
                                <th className="py-2 pr-3 font-semibold">{state.fields.find((f) => f.key === state.field)?.label ?? 'Group'}</th>
                                <th className="py-2 px-2 text-center font-semibold">🥇 Gold</th>
                                <th className="py-2 px-2 text-center font-semibold">🥈 Silver</th>
                                <th className="py-2 px-2 text-center font-semibold">🥉 Bronze</th>
                                <th className="py-2 pl-2 text-center font-semibold">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {state.medals.map((row, i) => (
                                <tr key={row.club}>
                                    <td className="py-2 pr-3 text-gray-400 tabular-nums">{i + 1}</td>
                                    <td className="py-2 pr-3 font-medium text-gray-900">{row.club}</td>
                                    <td className="py-2 px-2 text-center font-bold tabular-nums">{row.gold}</td>
                                    <td className="py-2 px-2 text-center tabular-nums">{row.silver}</td>
                                    <td className="py-2 px-2 text-center tabular-nums">{row.bronze}</td>
                                    <td className="py-2 pl-2 text-center font-semibold tabular-nums">{row.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
};

const Podium = ({ ranking }) => {
    const top = ranking.filter((row) => row.place <= 3);

    if (top.length === 0) return <p className="text-xs text-gray-500">No standings could be read from this draw.</p>;

    return (
        <ol className="space-y-1.5">
            {top.map((row, index) => (
                <li key={`${row.place}-${index}`} className="flex items-center gap-2 text-sm">
                    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${MEDAL[row.place]}`}>
                        {row.place}
                    </span>
                    <span className="truncate font-medium text-gray-900">{row.name}</span>
                    {row.registration && <span className="shrink-0 text-xs text-gray-400">{row.registration}</span>}
                </li>
            ))}
        </ol>
    );
};

/**
 * Fixture results for the report: the standings of every finished category,
 * and the categories still to finish. A category only one person entered has
 * no draw; the organiser completes it here and that person is its winner.
 */
const FixtureResults = ({ formId, formName }) => {
    const [state, setState] = useState({ loading: true, error: '', fixture: null, results: [] });
    const [standings, setStandings] = useState({});
    const [busy, setBusy] = useState(null);

    const loadStandings = useCallback(async (results) => {
        const drawn = results.filter((item) => item.status === 'completed' && !item.walkover);

        setStandings((current) => {
            const next = { ...current };
            drawn.forEach((item) => { if (!next[item.category]) next[item.category] = { loading: true }; });
            return next;
        });

        await inBatches(drawn, 3, async (item) => {
            try {
                const draw = await api.get(`/forms/${formId}/fixture/draw`, { params: { category: item.category } });
                setStandings((current) => ({ ...current, [item.category]: standingsOf(draw) }));
            } catch (error) {
                setStandings((current) => ({ ...current, [item.category]: { error: messageOf(error, 'Could not read the draw') } }));
            }
        });
    }, [formId]);

    const load = useCallback(async () => {
        setState((current) => ({ ...current, loading: true, error: '' }));

        try {
            const payload = await api.get(`/forms/${formId}/fixture/results`);
            setState({ loading: false, error: '', fixture: payload.fixture, results: payload.results ?? [] });
            loadStandings(payload.results ?? []);
        } catch (error) {
            setState({ loading: false, error: messageOf(error, 'Could not load the results'), fixture: null, results: [] });
        }
    }, [formId, loadStandings]);

    useEffect(() => {
        setStandings({});
        load();
    }, [load]);

    const completeSingle = async (item) => {
        if (!window.confirm(`Complete "${item.category}"? Its only competitor becomes the winner, and the category is locked.`)) return;

        setBusy(item.category);

        try {
            const payload = await api.post(`/forms/${formId}/fixture/categories/single`, { category: item.category });
            setState((current) => ({ ...current, results: payload.results ?? current.results }));
            toast.success('Category completed');
        } catch (error) {
            toast.error(messageOf(error, 'Could not complete the category'));
        } finally {
            setBusy(null);
        }
    };

    const completeAll = async (count) => {
        if (!window.confirm(`Complete all ${count} categories with one competitor? Each one's only competitor becomes its winner, and they are locked.`)) return;

        setBusy('all');

        try {
            const payload = await api.post(`/forms/${formId}/fixture/categories/singles`);
            setState((current) => ({ ...current, results: payload.results ?? current.results }));
            toast.success(payload.message ?? 'Categories completed');
        } catch (error) {
            toast.error(messageOf(error, 'Could not complete the categories'));
        } finally {
            setBusy(null);
        }
    };

    const download = async (item) => {
        const result = standings[item.category];

        if (!result?.ranking) return;

        await downloadRankingPdf({ title: item.category, typeName: result.typeName, ranking: result.ranking, champion: result.champion });
    };

    const downloadAll = async () => {
        const categories = state.results
            .filter((item) => item.status === 'completed')
            .map((item) => ({
                category: item.category,
                podium: item.walkover
                    ? [{ place: 1, name: item.walkover.team ? `${item.walkover.name} (${item.walkover.team})` : item.walkover.name, registration: item.walkover.reference }]
                    : (standings[item.category]?.ranking ?? []).filter((row) => row.place <= 3),
            }))
            .filter((item) => item.podium.length > 0);

        setBusy('pdf');

        try {
            await downloadPodiumsPdf(formName, categories);
        } catch {
            toast.error('Could not build the results PDF');
        } finally {
            setBusy(null);
        }
    };

    if (state.loading) {
        return (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-10 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading results…
            </div>
        );
    }

    if (state.error) {
        return (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-6">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">{state.error}</p>
                    <button type="button" onClick={load} className="mt-2 text-xs font-semibold text-red-700 hover:underline">Try again</button>
                </div>
            </div>
        );
    }

    const fixturePage = `/forms/${encodeId(formId)}/fixture`;
    const completed = state.results.filter((item) => item.status === 'completed');
    const single = state.results.filter((item) => item.status === 'single');
    const playing = state.results.filter((item) => item.status === 'in_progress');
    const waiting = state.results.filter((item) => item.status === 'not_started');
    const standingsLoading = completed.some((item) => !item.walkover && (!standings[item.category] || standings[item.category].loading));

    if (!state.fixture) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
                <Trophy className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-3 text-sm font-semibold text-gray-900">No fixture set up yet</p>
                <p className="mt-1 text-xs text-gray-500">Save a fixture type and start categories to see results here.</p>
                <Link to={fixturePage} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-regx-orange hover:underline">
                    Open the fixture page <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 font-semibold text-yellow-800">
                    <Trophy className="h-3.5 w-3.5" /> {completed.length} completed
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 font-semibold text-green-800">
                    <Clock3 className="h-3.5 w-3.5" /> {playing.length} in progress
                </span>
                {single.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                        <UserRound className="h-3.5 w-3.5" /> {single.length} with one competitor
                    </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                    {waiting.length} not drawn
                </span>
                <span className="ml-auto flex items-center gap-3">
                    <button
                        type="button"
                        onClick={downloadAll}
                        disabled={completed.length === 0 || standingsLoading || busy !== null}
                        title={completed.length === 0 ? 'No category is completed yet' : 'One PDF with 1st, 2nd and 3rd of every completed category'}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-regx-orange px-3 py-1.5 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {busy === 'pdf' || standingsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        Download results PDF
                    </button>
                    <Link to={fixturePage} className="inline-flex items-center gap-1 font-semibold text-regx-orange hover:underline">
                        Fixture page <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                    <button type="button" onClick={load} className="inline-flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900">
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </button>
                </span>
            </div>

            {single.length > 0 && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-amber-900">One competitor — complete to declare the winner</h3>
                            <p className="mt-1 text-xs text-amber-800">
                                These categories cannot be drawn. Completing one makes its only competitor the winner and locks it.
                            </p>
                        </div>
                        {single.length > 1 && (
                            <button
                                type="button"
                                onClick={() => completeAll(single.length)}
                                disabled={busy !== null}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                            >
                                {busy === 'all' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                Complete all ({single.length})
                            </button>
                        )}
                    </div>
                    <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {single.map((item) => (
                            <li key={item.category} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3">
                                <span className="min-w-0 truncate text-sm font-semibold text-gray-900">{item.category}</span>
                                <button
                                    type="button"
                                    onClick={() => completeSingle(item)}
                                    disabled={busy !== null}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-regx-orange px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                >
                                    {busy === item.category ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                    Complete
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <MedalTable formId={formId} refreshKey={completed.length} />

            <section>
                <h3 className="mb-3 text-sm font-bold text-gray-900">Results</h3>
                {completed.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                        No category is completed yet. Results appear here once a category is completed on the fixture page.
                    </p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {completed.map((item) => {
                            const result = standings[item.category];

                            return (
                                <article key={item.category} className="flex flex-col rounded-2xl border border-yellow-200 bg-white p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="text-sm font-semibold leading-snug text-gray-900">{item.category}</h4>
                                        <span className="shrink-0 text-xs text-gray-400">{item.entrants} competitor{item.entrants === 1 ? '' : 's'}</span>
                                    </div>

                                    <div className="mt-3 flex-1">
                                        {item.walkover ? (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Crown className="h-5 w-5 shrink-0 text-yellow-500" />
                                                <span className="truncate font-medium text-gray-900">
                                                    {item.walkover.name}{item.walkover.team ? ` (${item.walkover.team})` : ''}
                                                </span>
                                                <span className="shrink-0 text-xs text-gray-400">{item.walkover.reference}</span>
                                                <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">Only entrant</span>
                                            </div>
                                        ) : !result || result.loading ? (
                                            <p className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the draw…</p>
                                        ) : result.error ? (
                                            <p className="text-xs text-red-600">{result.error}</p>
                                        ) : (
                                            <Podium ranking={result.ranking} />
                                        )}
                                    </div>

                                    {result?.ranking && (
                                        <div className="mt-4 flex justify-end border-t border-yellow-100 pt-3">
                                            <button
                                                type="button"
                                                onClick={() => download(item)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-300 px-3 py-1.5 text-xs font-semibold text-yellow-800 hover:bg-yellow-50"
                                            >
                                                <Medal className="h-3.5 w-3.5" /> Full ranking <Download className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {(playing.length > 0 || waiting.length > 0) && (
                <section>
                    <h3 className="mb-3 text-sm font-bold text-gray-900">Not finished</h3>
                    <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
                        {[...playing, ...waiting].map((item) => (
                            <li key={item.category} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                                <span className="min-w-0 truncate text-gray-800">{item.category}</span>
                                <span className="flex shrink-0 items-center gap-3 text-xs">
                                    <span className="text-gray-400">{item.entrants} competitor{item.entrants === 1 ? '' : 's'}</span>
                                    <span className={`rounded-full px-2 py-0.5 font-medium ${item.status === 'in_progress' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {item.status === 'in_progress' ? 'In progress' : 'Not drawn'}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
};

export default FixtureResults;

import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Users, Trophy, RefreshCw, AlertTriangle, FileDown, Printer, Lock, CheckCircle2, Medal, SkipForward, Minus, Plus, History as HistoryIcon } from 'lucide-react';
import { useDraw, useFixtureState } from './fixtureData';
import FixtureHistory from './FixtureHistory';
import { parseServerDate } from '../../../shared/utils/dates';
import { encodeId } from '../../../shared/utils/ids';
import { useRouteIds } from '../../../shared/utils/ids';

export const sideLabel = (side) =>
    ({
        winners: 'Winners bracket',
        losers: 'Losers bracket',
        grand_final: 'Grand final',
        final: 'Final',
    }[side] ?? side.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()));

/** Completed with nobody in it: a losers match whose feeders were both byes. */
const isVoid = (match) => !match.player1 && !match.player2 && match.status === 'completed';

/** Read in the order a tournament is played, whatever order the service lists. */
const SIDE_ORDER = ['winners', 'single_elimination', 'knockout', 'losers', 'grand_final'];

export const inPlayingOrder = (rounds) =>
    Object.entries(rounds ?? {}).sort(([a], [b]) => {
        const rank = (side) => (SIDE_ORDER.indexOf(side) === -1 ? SIDE_ORDER.length : SIDE_ORDER.indexOf(side));

        return rank(a) - rank(b);
    });

/** Marks a player who reached this match without playing the round before. */
export const ByeBadge = ({ className = '' }) => (
    <span
        className={`inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 shrink-0 ${className}`}
        title="Got a bye — advanced without playing the previous round"
    >
        <SkipForward className="w-3 h-3" /> Bye
    </span>
);

/**
 * A player's fouls in one match: − count + while it is being played, the
 * count alone (in red at the limit) once it is decided.
 */
const FoulCounter = ({ fouls, limit, busy, editable, onChange, name }) => {
    const atLimit = limit > 0 && fouls >= limit;
    const tone = atLimit ? 'bg-red-600 text-white' : fouls > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500';

    if (!editable) {
        return fouls > 0 ? (
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${tone}`} title={`${fouls} foul${fouls === 1 ? '' : 's'}`}>
                F{fouls}
            </span>
        ) : null;
    }

    return (
        <span className="inline-flex items-center shrink-0 rounded-md border border-gray-200 overflow-hidden" title="Fouls in this match">
            <button
                type="button"
                onClick={() => onChange(fouls - 1)}
                disabled={busy || fouls === 0}
                className="px-1 py-0.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                aria-label={`One foul fewer for ${name}`}
            >
                <Minus className="w-3 h-3" />
            </button>
            <span className={`min-w-[1.75rem] text-center text-[10px] font-bold py-0.5 ${tone}`}>
                {busy ? <Loader2 className="w-3 h-3 mx-auto animate-spin" /> : `F${fouls}`}
            </span>
            <button
                type="button"
                onClick={() => onChange(fouls + 1)}
                disabled={busy || fouls >= 20}
                className="px-1 py-0.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                aria-label={`One more foul for ${name}`}
            >
                <Plus className="w-3 h-3" />
            </button>
        </span>
    );
};

const formatDate = (value) =>
    value
        ? parseServerDate(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

// -------------------------------------------------------------- match

/**
 * One match as the fixture service has it.
 *
 * Picking a player's radio records them as the winner. A decided match can be
 * corrected the same way, or cleared — and when its winner already played on,
 * the service refuses until the later matches may be reset, which is what
 * onConfirm asks about.
 *
 * A bye is not a win: it is completed with one player and stays plain.
 */
const Match = ({
    match, side, roundIndex, scoresEnabled, onSetWinner, onResetWinner, onSetFouls, onMoveToTable, onConfirm,
    tables = {}, tableCount = 0, byes = new Set(), foulRules = { enabled: false, limit: 0, auto: false }, locked = false,
}) => {
    const table = tables[match.id] ?? null;
    const [moving, setMoving] = useState(false);

    const [scores, setScores] = useState({ 1: '', 2: '' });
    const [saving, setSaving] = useState(null);

    const winnerId = match.winner?.id ?? null;
    const bothPlayers = Boolean(match.player1 && match.player2);
    // Only a real contest counts as decided; a bye just carries a player through.
    const decided = Boolean(winnerId) && bothPlayers;
    const isBye = Boolean(winnerId) && !bothPlayers;
    // An empty seat is a bye only in a bracket's opening round; anywhere else
    // (a later round, the losers bracket, the grand final) it is still to come.
    const opening = roundIndex === 0 && ['winners', 'single_elimination', 'knockout'].includes(side);
    const placeholder = opening ? 'Bye' : 'Winner TBD';

    // Only a match that can be played now can go on a table.
    const canMove = tableCount > 0 && bothPlayers && !winnerId && !locked && Boolean(onMoveToTable);

    const moveTo = async (value) => {
        const next = Number(value);

        if (!next || next === table) return;

        setMoving(true);
        const result = await onMoveToTable(match.id, next);
        setMoving(false);

        result.ok ? toast.success(`Moved to table ${next}`) : toast.error(result.message);
    };

    /** Runs the call, and asks first if the service says later matches would be reset. */
    const run = async (call, describe) => {
        const result = await call(false);

        if (result.ok || !result.needsReset) return result;

        const confirmed = await onConfirm({
            title: describe,
            message: result.message,
            affected: result.affected,
        });

        return confirmed ? call(true) : { ok: false, cancelled: true };
    };

    const pick = async (player) => {
        if (!bothPlayers || saving || winnerId === player.id) return;

        setSaving(player.id);
        const result = await run(
            (reset) => onSetWinner(match.id, player.id, scoresEnabled ? scores[1] : null, scoresEnabled ? scores[2] : null, reset),
            `Change the winner to ${player.name}?`
        );
        setSaving(null);

        if (result.ok) toast.success(`${player.name} wins`);
        else if (!result.cancelled) toast.error(result.message);
    };

    const foulsOf = (slot) => Number(match[`player${slot}_fouls`] ?? 0);
    const limit = foulRules.limit;
    const loserSlot = decided ? (winnerId === match.player1?.id ? 2 : 1) : null;
    const wonOnFouls = decided && limit > 0 && foulsOf(loserSlot) >= limit;

    /**
     * Saves a player's fouls. Reaching the limit records the opponent's win:
     * the server does it straight away when the rules say so, otherwise the
     * desk is asked here first.
     */
    const changeFouls = async (slot, fouls) => {
        const player = match[`player${slot}`];
        const opponent = match[`player${slot === 1 ? 2 : 1}`];

        setSaving(`fouls${slot}`);
        const result = await onSetFouls(match.id, player.id, fouls);

        if (!result.ok) {
            setSaving(null);
            toast.error(result.message);
            return;
        }

        if (result.outcome?.decided) {
            setSaving(null);
            toast.success(`${opponent.name} wins on fouls`);
            return;
        }

        if (result.outcome?.limitReached && window.confirm(`${ordinal(fouls)} foul — ${player.name} loses this match. Record ${opponent.name} as winner?`)) {
            const won = await onSetWinner(match.id, opponent.id, null, null, false);
            won.ok ? toast.success(`${opponent.name} wins on fouls`) : toast.error(won.message);
        }

        setSaving(null);
    };

    const clear = async () => {
        setSaving('reset');
        const result = await run((reset) => onResetWinner(match.id, reset), 'Clear this result?');
        setSaving(null);

        if (result.ok) toast.success('Result cleared');
        else if (!result.cancelled) toast.error(result.message);
    };

    const line = (slot) => {
        const player = match[`player${slot}`];
        const score = match[`player${slot}_score`];
        const won = decided && winnerId === player?.id;
        const canPick = Boolean(player) && bothPlayers;

        return (
            <div className={`flex items-center gap-2 px-2.5 py-2 text-sm ${won ? 'bg-green-50' : ''}`}>
                {canPick ? (
                    saving === player.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-regx-orange shrink-0" />
                    ) : (
                        <input
                            type="radio"
                            name={`winner-${match.id}`}
                            checked={winnerId === player.id}
                            onChange={() => pick(player)}
                            disabled={saving !== null || locked}
                            className="w-4 h-4 accent-regx-orange cursor-pointer shrink-0 disabled:cursor-not-allowed"
                            aria-label={`${player.name} wins`}
                            title={decided ? 'Change the winner' : 'Mark as winner'}
                        />
                    )
                ) : (
                    <span className="w-4 shrink-0" />
                )}

                <span className={`flex-1 min-w-0 truncate ${player ? (won ? 'font-semibold text-green-800' : 'text-gray-900') : 'text-gray-400 italic'}`}>
                    {player?.name ?? placeholder}
                </span>

                {player && byes.has(`${match.id}:${player.id}`) && <ByeBadge />}

                {foulRules.enabled && player && bothPlayers && (
                    <FoulCounter
                        fouls={foulsOf(slot)}
                        limit={limit}
                        busy={saving === `fouls${slot}`}
                        // Fouls happen in a match being played; a decided one is read-only.
                        editable={!decided && !locked && saving === null}
                        onChange={(fouls) => changeFouls(slot, fouls)}
                        name={player.name}
                    />
                )}

                {won && <Trophy className="w-3.5 h-3.5 text-green-600 shrink-0" />}

                {scoresEnabled && player && bothPlayers && (
                    decided ? (
                        <span className="w-10 text-xs text-center tabular-nums text-gray-600">{score ?? '–'}</span>
                    ) : (
                        <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={scores[slot]}
                            onChange={(e) => setScores((s) => ({ ...s, [slot]: e.target.value }))}
                            disabled={saving !== null}
                            className="w-10 border border-gray-300 rounded px-1 py-0.5 text-xs text-center tabular-nums focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                            aria-label={`${player.name} score`}
                        />
                    )
                )}
            </div>
        );
    };

    return (
        <div className={`border rounded-lg bg-white overflow-hidden ${decided ? 'border-green-200' : table ? 'border-regx-orange' : 'border-gray-200'}`}>
            {/* Called to a hall table right now. */}
            {table && !canMove && (
                <p className="px-2.5 py-1 text-[11px] font-bold tracking-wide text-white bg-regx-orange">ON TABLE {table}</p>
            )}

            {/* Change the table by hand; it then stays there until the result is in. */}
            {canMove && (
                <label
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold tracking-wide ${table ? 'text-white bg-regx-orange' : 'text-gray-500 bg-gray-50 border-b border-gray-100'}`}
                    title={table ? 'Move this match to another table' : 'Put this match on a table'}
                >
                    {table ? 'ON TABLE' : 'TABLE'}
                    <select
                        value={table ?? ''}
                        onChange={(e) => moveTo(e.target.value)}
                        disabled={moving}
                        aria-label={table ? `Table ${table} — move to another table` : 'Put on a table'}
                        className={`rounded px-1 py-0 text-[11px] font-bold outline-none cursor-pointer disabled:opacity-60 ${
                            table ? 'bg-white/20 text-white [&>option]:text-gray-900' : 'bg-white border border-gray-300 text-gray-700'
                        }`}
                    >
                        {!table && <option value="">—</option>}
                        {Array.from({ length: tableCount }, (_, i) => i + 1).map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    {moving && <Loader2 className="w-3 h-3 animate-spin" />}
                </label>
            )}
            {line(1)}
            <div className="border-t border-gray-100" />
            {line(2)}

            {isBye && <p className="px-2.5 py-1 text-[11px] text-gray-400 border-t border-gray-100">Bye — no match played</p>}

            {wonOnFouls && (
                <p className="px-2.5 py-1 text-[11px] font-medium text-red-700 bg-red-50 border-t border-red-100">Won on fouls</p>
            )}

            {decided && !locked && (
                <button
                    type="button"
                    onClick={clear}
                    disabled={saving !== null}
                    className="w-full border-t border-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 text-left disabled:opacity-50"
                >
                    {saving === 'reset' ? 'Clearing…' : 'Clear result'}
                </button>
            )}
        </div>
    );
};

/** Asks before anything already played is undone. */
export const ConfirmReset = ({ request, onAnswer }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => onAnswer(false)}>
        <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm bg-white rounded-xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex flex-wrap items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-gray-900">{request.title}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {request.affected.length} later match{request.affected.length === 1 ? '' : 'es'} will be cleared and played again:
                    </p>
                    <ul className="mt-2 text-xs text-gray-600 space-y-0.5">
                        {request.affected.map((item) => (
                            <li key={item.id}>Round {item.round}, match {item.match_number}</li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
                <button type="button" onClick={() => onAnswer(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                </button>
                <button type="button" onClick={() => onAnswer(true)} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">
                    Clear and continue
                </button>
            </div>
        </div>
    </div>
);

export const RoundColumns = ({ side, rounds, scoresEnabled, champion, ...actions }) => (
    <div className="overflow-x-auto pb-2">
        <div className="flex gap-6 min-w-max">
            {rounds.map((round, roundIndex) => (
                <div key={`${round.label}-${roundIndex}`} className="w-60 flex flex-col">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                        {round.label ?? `Round ${round.round}`}
                    </p>
                    <div className="flex-1 flex flex-col justify-around gap-3">
                        {/* A seat nobody could reach — two byes feeding one losers
                            match — leaves a match that was never played. One still
                            waiting for its players is different, and stays. */}
                        {round.matches.filter((match) => !isVoid(match)).map((match) => (
                            <Match key={match.id} match={match} side={side} roundIndex={roundIndex} scoresEnabled={scoresEnabled} {...actions} />
                        ))}
                    </div>
                </div>
            ))}

            {champion !== undefined && (
                <div className="w-44 flex flex-col">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Champion</p>
                    <div className="flex-1 flex items-center">
                        <div className={`w-full rounded-lg px-3 py-3 text-sm flex items-center gap-2 ${
                            champion ? 'bg-green-600 text-white font-semibold' : 'border border-dashed border-regx-orange/50 text-gray-400'
                        }`}>
                            <Trophy className={`w-4 h-4 ${champion ? 'text-white' : 'text-regx-orange'}`} /> {champion ?? 'TBD'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);

// -------------------------------------------------------------- page

/**
 * A started category's draw. Everything on this page — bracket, players,
 * rounds, results — is read from the fixture service through RegX. A category
 * that has not been started has no draw, so it cannot be opened.
 */
/**
 * The draw as a document: players, then each side's rounds as a table of
 * matches with who won. Built in the browser from what is on screen.
 */
export const downloadFixturePdf = async ({ title, typeName, players, sides, champion, scoresEnabled, byes = new Set() }) => {
    // A Fouls column only when some match has one.
    const showFouls = sides.some(([, rounds]) => rounds.some((round) => round.matches.some((m) => m.player1_fouls || m.player2_fouls)));
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 14;
    let y = margin;

    doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(17, 24, 39);
    doc.text(String(title), margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(107, 114, 128);
    doc.text([typeName, `${players.length} players`, champion ? `Champion: ${champion}` : null].filter(Boolean).join('  ·  '), margin, y);
    y += 6;

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['#', 'Player', 'Registration']],
        body: players.map((p, i) => [i + 1, p.name, String(p.playerId).split(':')[0]]),
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [236, 77, 45] },
    });
    y = doc.lastAutoTable.finalY + 8;

    sides.forEach(([side, rounds]) => {
        const rows = rounds.flatMap((round) =>
            round.matches
                .filter((m) => !isVoid(m))
                .map((m) => [
                    round.label ?? `Round ${round.round}`,
                    m.match_number,
                    ...[m.player1, m.player2].map((p) =>
                        p ? `${p.name}${byes.has(`${m.id}:${p.id}`) ? ' (bye)' : ''}` : '—'
                    ),
                    scoresEnabled && m.player1_score != null ? `${m.player1_score} - ${m.player2_score}` : '',
                    ...(showFouls ? [(m.player1_fouls || m.player2_fouls) ? `${m.player1_fouls ?? 0} - ${m.player2_fouls ?? 0}` : ''] : []),
                    m.winner?.name ?? '',
                ])
        );

        doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(17, 24, 39);
        if (y > 270) {
            doc.addPage();
            y = margin;
        }
        doc.text(sideLabel(side), margin, y);

        autoTable(doc, {
            startY: y + 2,
            margin: { left: margin, right: margin },
            head: [['Round', 'Match', 'Player 1', 'Player 2', ...(scoresEnabled ? ['Score'] : ['']), ...(showFouls ? ['Fouls'] : []), 'Winner']],
            body: rows,
            styles: { fontSize: 8, cellPadding: 1.5 },
            headStyles: { fillColor: [17, 19, 21] },
        });
        y = doc.lastAutoTable.finalY + 8;
    });

    doc.save(`${String(title).replace(/[^\w.-]+/g, '_')}-fixtures.pdf`);
};

/**
 * The tie sheet: the same bracket as on screen, drawn on landscape A4 — one
 * column per round, a box per match, the winner highlighted. Each side of the
 * draw starts on its own page.
 */
export const downloadTieSheet = async ({ title, typeName, sides, champion, scoresEnabled }) => {
    const { jsPDF } = await import('jspdf');

    // A5 landscape. Everything goes on ONE page when it can: the sides of the
    // draw (winners, losers, grand final) are stacked and scaled down together.
    // Only when that would make the names unreadably small does it spread over
    // more pages, one side per page, splitting a very large side into slices.
    const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'landscape' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 6;
    const gap = 5;
    const headerH = 11; // the title lines
    const labelH = 6; // a side's own heading and its round labels
    const lineGap = 0.8;
    const minBox = 4.6; // smallest match box that still reads when printed

    const blocks = sides
        .map(([side, rounds], index) => ({
            side,
            index,
            columns: rounds
                .map((round) => ({ label: round.label ?? `Round ${round.round}`, matches: round.matches.filter((m) => !isVoid(m)) }))
                .filter((column) => column.matches.length > 0),
        }))
        .filter((block) => block.columns.length > 0);

    if (blocks.length === 0) return;

    const widest = (block) => Math.max(...block.columns.map((c) => c.matches.length), 1);
    const fontFor = (boxH) => (boxH < 6 ? 4.6 : boxH < 8 ? 5.5 : boxH < 11 ? 6.5 : 7.5);

    const drawHeading = (note) => {
        doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(17, 24, 39);
        doc.text(String(title), margin, margin + 3);
        doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(107, 114, 128);
        doc.text([typeName, champion ? `Champion: ${champion}` : null, note].filter(Boolean).join('  ·  '), margin, margin + 7);
    };

    /**
     * One side of the draw inside the box (top, areaH): a column per round, a
     * match per slot, join lines into the next round. `pages`/`page` select a
     * slice of the bracket when the side is too big for one page.
     */
    const drawBlock = (block, { top, areaH, boxH, pages = 1, page = 0, withSideTitle }) => {
        const { columns } = block;
        const font = fontFor(boxH);
        const colW = Math.min(46, (pageW - margin * 2 - gap * (columns.length - 1)) / columns.length);
        const centres = [];

        if (withSideTitle) {
            doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(17, 24, 39);
            doc.text(sideLabel(block.side), margin, top - labelH + 2.5);
        }

        columns.forEach((column, ci) => {
            const x = margin + ci * (colW + gap);

            doc.setFont('helvetica', 'bold').setFontSize(5).setTextColor(107, 114, 128);
            doc.text(column.label.toUpperCase(), x, top - 1);

            centres[ci] = [];

            column.matches.forEach((match, index) => {
                const slice = Math.min(pages - 1, Math.floor(((index + 0.5) / column.matches.length) * pages));

                if (slice !== page) return;

                const local = ((index + 0.5) / column.matches.length) * pages - page;
                const cy = top + local * areaH;
                const y0 = Math.max(top, Math.min(top + areaH - boxH, cy - boxH / 2));
                const mid = y0 + boxH / 2;

                centres[ci].push({ index, cy: mid });

                doc.setDrawColor(170, 170, 170).setLineWidth(0.18).setFillColor(255, 255, 255);
                doc.roundedRect(x, y0, colW, boxH, 0.7, 0.7, 'FD');
                doc.line(x, mid, x + colW, mid);

                [match.player1, match.player2].forEach((player, pi) => {
                    const won = match.winner && player && match.winner.id === player.id;
                    const ry = y0 + (pi === 0 ? 0 : boxH / 2);

                    if (won) {
                        doc.setFillColor(220, 252, 231);
                        doc.rect(x + 0.2, ry + (pi === 0 ? 0.2 : 0.1), colW - 0.4, boxH / 2 - 0.3, 'F');
                    }

                    doc.setFont('helvetica', won ? 'bold' : 'normal').setFontSize(font).setTextColor(won ? 21 : 55, won ? 128 : 65, won ? 61 : 81);
                    doc.text(
                        doc.splitTextToSize(String(player?.name ?? 'TBD'), colW - (scoresEnabled ? 8 : 3))[0],
                        x + 1.3,
                        ry + boxH / 4 + font * 0.1
                    );

                    const score = match[pi === 0 ? 'player1_score' : 'player2_score'];

                    if (scoresEnabled && score != null) {
                        doc.text(String(score), x + colW - 1.3, ry + boxH / 4 + font * 0.1, { align: 'right' });
                    }
                });
            });
        });

        doc.setDrawColor(170, 170, 170).setLineWidth(0.18);

        for (let ci = 0; ci < columns.length - 1; ci += 1) {
            const x = margin + ci * (colW + gap) + colW;

            centres[ci].forEach(({ index, cy }) => {
                const target = Math.min(
                    columns[ci + 1].matches.length - 1,
                    Math.floor((index * columns[ci + 1].matches.length) / columns[ci].matches.length)
                );
                const next = centres[ci + 1].find((item) => item.index === target);

                if (!next) return;

                doc.line(x, cy, x + gap / 2, cy);
                doc.line(x + gap / 2, cy, x + gap / 2, next.cy);
                doc.line(x + gap / 2, next.cy, x + gap, next.cy);
            });
        }
    };

    // ---- everything on one page: a shared box height, sides stacked
    const avail = pageH - margin - headerH - margin;
    const slots = blocks.reduce((n, block) => n + widest(block), 0);
    const stackedBox = (avail - blocks.length * labelH) / slots - lineGap;

    if (stackedBox >= minBox) {
        const boxH = Math.min(13, stackedBox);

        drawHeading(null);

        let y = margin + headerH;

        blocks.forEach((block) => {
            const areaH = widest(block) * (boxH + lineGap);

            drawBlock(block, { top: y + labelH, areaH, boxH, withSideTitle: blocks.length > 1 });
            y += labelH + areaH;
        });
    } else {
        // ---- too much for one page: a side per page, sliced if even that is too tall
        let firstPage = true;

        blocks.forEach((block) => {
            const top = margin + headerH + labelH;
            const areaH = pageH - top - margin;
            const most = widest(block);

            let pages = 1;
            while (pages < 12 && areaH / Math.ceil(most / pages) - lineGap < minBox) pages += 1;

            const boxH = Math.min(13, areaH / Math.ceil(most / pages) - lineGap);

            for (let page = 0; page < pages; page += 1) {
                if (!firstPage) doc.addPage('a5', 'landscape');
                firstPage = false;

                drawHeading(pages > 1 ? `${sideLabel(block.side)} · page ${page + 1} of ${pages}` : sideLabel(block.side));
                drawBlock(block, { top, areaH, boxH, pages, page, withSideTitle: false });
            }
        });
    }

    doc.save(`${String(title).replace(/[^\w.-]+/g, '_')}-tie-sheet.pdf`);
};

const ordinal = (n) => {
    const v = n % 100;

    return `${n}${['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th'}`;
};

/**
 * Final standings from the results: the later a player was knocked out, the
 * better they placed. The champion is first, whoever lost the deciding match
 * second; in a double-elimination draw a loss in the winners bracket only drops
 * a player down, so just the losers bracket and the grand final eliminate.
 * Players knocked out in the same round share a place (two semi-final losers
 * are both 3rd) and the next place skips ahead, as in any ranking.
 *
 * In double elimination, players knocked out in the same losers round are
 * separated, in order, by: the furthest winners-bracket round they reached,
 * then matches won, then how well whoever knocked them out finished. Only
 * players equal on all three share a place. The backend's
 * FixtureService::ranking() does the same, for certificates.
 */
export const buildRanking = (sides, players, champion) => {
    const playerKey = (id) => id == null ? null : String(id);
    const doubleElimination = sides.some(([side]) => side === 'losers');
    const lostAt = new Map(); // player id -> how late they went out
    const outBy = new Map(); // player id -> who knocked them out
    const wins = new Map(); // player id -> matches won
    const reached = new Map(); // player id -> furthest winners-bracket round

    sides.forEach(([side, rounds]) => {
        rounds.forEach((round) => {
            round.matches.forEach((match) => {
                if (side === 'winners') {
                    [match.player1, match.player2].forEach((p) => {
                        const id = playerKey(p?.id);
                        if (id !== null) reached.set(id, Math.max(reached.get(id) ?? 0, Number(round.round ?? 0)));
                    });
                }

                if (!match.winner || !match.player1 || !match.player2) return;

                const winnerId = playerKey(match.winner.id);
                const player1Id = playerKey(match.player1.id);
                const player2Id = playerKey(match.player2.id);
                const loserId = winnerId === player1Id ? player2Id : player1Id;
                wins.set(winnerId, (wins.get(winnerId) ?? 0) + 1);

                // In double elimination a winners-bracket loss only drops a player down.
                if (doubleElimination && side === 'winners') return;

                const key = (side === 'grand_final' ? 1000 : 0) + Number(round.round ?? 0);

                // A later loss (a grand-final reset, say) replaces an earlier one.
                if (key >= (lostAt.get(loserId) ?? 0)) {
                    lostAt.set(loserId, key);
                    outBy.set(loserId, winnerId);
                }
            });
        });
    });

    const nameOf = new Map(players.map((p) => [playerKey(p.id), p]));
    const rows = [];

    // The decisive match: the last round of the last side in playing order.
    const lastRounds = sides[sides.length - 1]?.[1] ?? [];
    const championId = playerKey(lastRounds[lastRounds.length - 1]?.matches?.[0]?.winner?.id);

    if (champion && championId != null) {
        rows.push({ place: 1, id: championId });
    }

    // Whoever knocked a player out went out later, so their place is known by then.
    const placeOf = new Map(rows.map((row) => [row.id, row.place]));

    // How a player compares within their elimination round: [reached, wins, -eliminator's place].
    const tieKey = (id) => (doubleElimination
        ? [reached.get(id) ?? 0, wins.get(id) ?? 0, -(placeOf.get(outBy.get(id)) ?? Infinity)]
        : []);
    const compare = (a, b) => {
        for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return b[i] - a[i];
        return 0;
    };

    const groups = new Map();
    [...lostAt.entries()].filter(([id]) => id !== championId).forEach(([id, when]) => {
        groups.set(when, [...(groups.get(when) ?? []), id]);
    });

    [...groups.keys()].sort((a, b) => b - a).forEach((when) => {
        const ranked = groups.get(when).map((id) => ({ id, key: tieKey(id) })).sort((a, b) => compare(a.key, b.key));
        let place = rows.length + 1;

        ranked.forEach((entry, i) => {
            if (i > 0 && compare(ranked[i - 1].key, entry.key) !== 0) place = rows.length + 1;
            rows.push({ place, id: entry.id });
            placeOf.set(entry.id, place);
        });
    });

    return rows.map((row) => ({
        place: row.place,
        name: nameOf.get(playerKey(row.id))?.name ?? '—',
        registration: String(nameOf.get(playerKey(row.id))?.playerId ?? '').split(':')[0],
    }));
};

export const downloadRankingPdf = async ({ title, typeName, ranking, champion }) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 14;

    doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(17, 24, 39);
    doc.text(String(title), margin, margin);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(107, 114, 128);
    doc.text(
        ['Ranking list', typeName].filter(Boolean).join('  ·  '),
        margin,
        margin + 6
    );

    autoTable(doc, {
        startY: margin + 12,
        margin: { left: margin, right: margin },
        head: [['Rank', 'Player', 'Registration']],
        body: ranking.map((r) => [ordinal(r.place), r.name, r.registration]),
        styles: { fontSize: 10, cellPadding: 2.5 },
        headStyles: { fillColor: [236, 77, 45] },
        didParseCell: (data) => {
            if (data.section === 'body' && ranking[data.row.index]?.place <= 3) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [[255, 247, 205], [243, 244, 246], [254, 235, 220]][ranking[data.row.index].place - 1];
            }
        },
    });

    doc.save(`${String(title).replace(/[^\w.-]+/g, '_')}-ranking.pdf`);
};

const FixtureCategory = () => {
    const { eventId, formId, category: categoryParam } = useRouteIds();
    const category = categoryParam ?? '';

    const stored = useFixtureState(formId);
    const started = stored.isStarted(category);

    const draw = useDraw(formId, category, started);

    // Whether results are recorded with scores. A viewing preference, kept per form in this browser.
    const scoreKey = `regx:fixture-scores:${formId}`;
    const [scoresEnabled, setScoresEnabled] = useState(() => {
        try {
            return localStorage.getItem(scoreKey) === '1';
        } catch {
            return false;
        }
    });

    const [showHistory, setShowHistory] = useState(false);

    // A confirmation the match component can await before undoing played matches.
    const [confirmRequest, setConfirmRequest] = useState(null);

    const confirmReset = (request) =>
        new Promise((resolve) => setConfirmRequest({ ...request, resolve }));

    const answerConfirm = (answer) => {
        confirmRequest?.resolve(answer);
        setConfirmRequest(null);
    };

    const toggleScores = () =>
        setScoresEnabled((on) => {
            try {
                localStorage.setItem(scoreKey, on ? '0' : '1');
            } catch {
                // Not remembered; still works for this visit.
            }

            return !on;
        });

    const back = eventId
        ? `/events/${encodeId(eventId)}/form/${encodeId(formId)}/fixture`
        : `/forms/${encodeId(formId)}/fixture`;

    useEffect(() => {
        document.title = `${category} — fixtures`;
    }, [category]);

    // Opened by URL before it was started: back to the engine to start it.
    useEffect(() => {
        if (!stored.loading && !stored.error && !started) {
            toast.error('Start this category first to open its draw.', { id: 'fixture-not-started' });
        }
    }, [stored.loading, stored.error, started]);

    const sides = inPlayingOrder(draw.rounds);

    const matches = useMemo(
        () => sides.flatMap(([, rounds]) => rounds.flatMap((round) => round.matches)).filter((match) => !isVoid(match)),
        [sides]
    );

    const played = matches.filter((match) => match.winner).length;
    const completed = stored.isCompleted(category);
    const allDecided = matches.length > 0 && played === matches.length;
    const [completing, setCompleting] = useState(false);

    const finish = async () => {
        if (!window.confirm('Complete this fixture? It will be locked: no result can be changed, and it cannot be reset or redrawn.')) return;

        setCompleting(true);
        const result = await stored.completeCategory(category);
        setCompleting(false);

        result.ok ? toast.success('Fixture completed and locked.') : toast.error(result.message);
    };

    // The last round's winner, in the side that decides the event.
    const champion = useMemo(() => {
        const decisive = draw.rounds?.grand_final ?? sides[sides.length - 1]?.[1];
        const last = decisive?.[decisive.length - 1]?.matches?.[0];

        return last?.winner?.name ?? null;
    }, [draw.rounds, sides]);

    if (stored.loading || (started && draw.loading && sides.length === 0 && !draw.error)) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    if (stored.error) {
        return (
            <div className="max-w-md mx-auto text-center py-20">
                <p className="text-sm text-red-700">{stored.error}</p>
                <Link to={back} className="inline-block mt-5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium">Back to fixture engine</Link>
            </div>
        );
    }

    if (!started) {
        return <Navigate to={back} replace />;
    }

    const info = draw.category;

    return (
        <div className=" mx-auto space-y-5">
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                    <Link to={back} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0" aria-label="Back to fixture engine">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div className="min-w-[220px] flex-1">
                        <p className="text-xs text-gray-500">Fixture engine</p>
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900">{draw.bracket?.name ?? info?.name ?? category}</h1>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 rounded-md bg-orange-50 text-regx-orange font-medium">
                                {info?.typeName ?? draw.bracket?.type}
                            </span>
                            {info?.startedAt && (
                                <span className="px-2 py-1 rounded-md bg-green-100 text-green-700 font-medium">
                                    Started {formatDate(info.startedAt)}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                                <Users className="w-3.5 h-3.5" /> {draw.players.length} players
                            </span>
                            {matches.length > 0 && (
                                <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                                    {played} / {matches.length} matches decided
                                </span>
                            )}
                        </div>
                    </div>

                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 cursor-pointer select-none shrink-0">
                        <span>Scores</span>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={scoresEnabled}
                            onClick={toggleScores}
                            className={`relative w-9 h-5 rounded-full transition-colors ${scoresEnabled ? 'bg-regx-orange' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${scoresEnabled ? 'translate-x-4' : ''}`} />
                        </button>
                    </label>

                    {completed ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-100 border border-yellow-300 text-sm font-semibold text-yellow-800 shrink-0">
                            <Lock className="w-4 h-4" /> Completed
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={finish}
                            disabled={!allDecided || completing}
                            title={allDecided ? 'Lock this fixture. No result can be changed afterwards.' : 'Available once every match has a result'}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500 text-white text-sm font-medium hover:bg-yellow-600 shrink-0 disabled:opacity-40"
                        >
                            {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Complete
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() =>
                            downloadFixturePdf({
                                title: draw.bracket?.name ?? info?.name ?? category,
                                typeName: info?.typeName ?? draw.bracket?.type,
                                players: draw.players,
                                sides,
                                champion,
                                scoresEnabled,
                                byes: draw.byes,
                            }).catch(() => toast.error('Could not build the PDF.'))
                        }
                        disabled={sides.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange shrink-0 disabled:opacity-40"
                    >
                        <FileDown className="w-4 h-4" />
                        PDF
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            downloadRankingPdf({
                                title: draw.bracket?.name ?? info?.name ?? category,
                                typeName: info?.typeName ?? draw.bracket?.type,
                                ranking: buildRanking(sides, draw.players, champion),
                                champion,
                            }).catch(() => toast.error('Could not build the ranking list.'))
                        }
                        disabled={sides.length === 0 || !champion}
                        title={champion ? '1st, 2nd, 3rd and so on' : 'Available once the final has a winner'}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange shrink-0 disabled:opacity-40"
                    >
                        <Medal className="w-4 h-4" />
                        Ranking
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            downloadTieSheet({
                                title: draw.bracket?.name ?? info?.name ?? category,
                                typeName: info?.typeName ?? draw.bracket?.type,
                                sides,
                                champion,
                                scoresEnabled,
                            }).catch(() => toast.error('Could not build the tie sheet.'))
                        }
                        disabled={sides.length === 0}
                        title="The bracket as a printable sheet"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange shrink-0 disabled:opacity-40"
                    >
                        <Printer className="w-4 h-4" />
                        Tie sheet
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowHistory(true)}
                        title="History — every change to this draw and its results"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange shrink-0"
                    >
                        <HistoryIcon className="w-4 h-4" />
                        History
                    </button>

                    <button
                        type="button"
                        onClick={draw.reload}
                        disabled={draw.loading}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0 disabled:opacity-50"
                        aria-label="Refresh draw"
                        title="Refresh from the fixture service"
                    >
                        <RefreshCw className={`w-5 h-5 ${draw.loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {confirmRequest && <ConfirmReset request={confirmRequest} onAnswer={answerConfirm} />}
            {showHistory && <FixtureHistory formId={formId} category={category} onClose={() => setShowHistory(false)} />}

            {draw.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center justify-between gap-3">
                    <span>{draw.error}</span>
                    <button type="button" onClick={draw.reload} className="text-xs font-medium underline shrink-0">Try again</button>
                </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
                {/* Players, from the fixture service */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden self-start">
                    <h2 className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">
                        Players <span className="text-gray-400 font-normal">({draw.players.length})</span>
                    </h2>
                    {draw.players.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-gray-500">No players in this bracket.</p>
                    ) : (
                        <ol className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
                            {draw.players.map((player, index) => (
                                <li key={player.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                                    <span className="w-6 text-xs text-gray-400 tabular-nums">{index + 1}</span>
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{player.name}</p>
                                        <p className="text-xs text-gray-500 truncate">{player.playerId.split(':')[0]}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                {/* Draw, from the fixture service */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 min-w-0 space-y-6">
                    {sides.length === 0 && !draw.loading && !draw.error && (
                        <p className="py-16 text-center text-sm text-gray-500">The fixture service has no draw for this bracket yet.</p>
                    )}

                    {sides.map(([side, rounds], sideIndex) => (
                        <section key={side}>
                            {sides.length > 1 && <h2 className="text-sm font-semibold text-gray-900 mb-3">{sideLabel(side)}</h2>}
                            <RoundColumns
                                side={side}
                                rounds={rounds}
                                scoresEnabled={scoresEnabled}
                                onSetWinner={draw.setWinner}
                                onResetWinner={draw.resetWinner}
                                onConfirm={confirmReset}
                                locked={completed}
                                tables={draw.tables}
                                byes={draw.byes}
                                foulRules={draw.fouls}
                                onSetFouls={draw.setFouls}
                                tableCount={draw.tableCount}
                                onMoveToTable={draw.moveToTable}
                                champion={sideIndex === sides.length - 1 ? champion : undefined}
                            />
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FixtureCategory;

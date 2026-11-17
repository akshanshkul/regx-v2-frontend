import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    ArrowLeft, ArrowRight, Camera, CheckCircle2, Download, FileDown, FileSpreadsheet, Lock, Loader2, Medal, Plus, Printer, RefreshCw, RotateCcw, ScanLine, Shuffle, Swords, Trash2, Trophy, Upload, Users, X,
} from 'lucide-react';
import api from '../../../services/api';
import CameraScanner from '../fixtures/CameraScanner';
import {
    buildRanking, ConfirmReset, downloadFixturePdf, downloadRankingPdf, downloadTieSheet, inPlayingOrder, RoundColumns, sideLabel,
} from '../fixtures/FixtureCategory';

const norm = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const isVoid = (match) => !match.player1 && !match.player2 && match.status === 'completed';
const errorMessage = (error, fallback) => {
    const messages = error?.response?.data?.messages ?? {};
    const first = messages.error ?? Object.values(messages)[0];
    return (Array.isArray(first) ? first[0] : first) || error?.response?.data?.message || fallback;
};

const StandaloneFixtures = () => {
    const { collectionId, fixtureId } = useParams();
    const navigate = useNavigate();
    const [types, setTypes] = useState([]);
    const [collections, setCollections] = useState([]);
    const [collection, setCollection] = useState(null);
    const [fixtures, setFixtures] = useState([]);
    const [draw, setDraw] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [busy, setBusy] = useState(false);
    const [deletingCollectionId, setDeletingCollectionId] = useState(null);
    const [fixtureAction, setFixtureAction] = useState(null);
    const [collectionName, setCollectionName] = useState('');
    const [fixtureType, setFixtureType] = useState('');
    const [fixtureName, setFixtureName] = useState('');
    const [players, setPlayers] = useState([]);
    const [fileName, setFileName] = useState('');
    const [showPlayersModal, setShowPlayersModal] = useState(false);
    const [playerInputMode, setPlayerInputMode] = useState('upload');
    const [manualPlayers, setManualPlayers] = useState([{ name: '', playerId: '' }]);
    const [scoresEnabled, setScoresEnabled] = useState(() => {
        try {
            return localStorage.getItem(`regx:standalone-fixture-scores:${fixtureId}`) === '1';
        } catch {
            return false;
        }
    });
    const [confirmRequest, setConfirmRequest] = useState(null);
    const [scanCode, setScanCode] = useState('');
    const [scanChoice, setScanChoice] = useState(null);
    const [scanResult, setScanResult] = useState(null);
    const [scanBusy, setScanBusy] = useState(false);
    const [cameraOn, setCameraOn] = useState(false);
    const scanInput = useRef(null);

    const base = '/operations/fixtures';
    const scoreKey = `regx:standalone-fixture-scores:${fixtureId}`;

    useEffect(() => {
        try {
            setScoresEnabled(localStorage.getItem(scoreKey) === '1');
        } catch {
            setScoresEnabled(false);
        }
    }, [scoreKey]);

    const toggleScores = () =>
        setScoresEnabled((enabled) => {
            try {
                localStorage.setItem(scoreKey, enabled ? '0' : '1');
            } catch {
                // The switch still works for this visit if storage is unavailable.
            }
            return !enabled;
        });

    const confirmReset = (request) =>
        new Promise((resolve) => setConfirmRequest({ ...request, resolve }));

    const answerConfirm = (answer) => {
        confirmRequest?.resolve(answer);
        setConfirmRequest(null);
    };

    const load = async () => {
        setLoading(true);
        setLoadError('');
        try {
            if (!collectionId) {
                const data = await api.get('/standalone-fixtures');
                setTypes(data.types ?? []);
                setCollections(data.collections ?? []);
                setFixtureType((current) => current || data.types?.[0]?.slug || '');
            } else {
                const data = await api.get(`/standalone-fixtures/${collectionId}`);
                setCollection(data.collection);
                setFixtures(data.fixtures ?? []);
                if (fixtureId) {
                    setDraw(await api.get(`/standalone-fixtures/${collectionId}/fixtures/${fixtureId}`));
                } else {
                    setDraw(null);
                }
            }
        } catch (error) {
            const message = errorMessage(error, 'Could not load standalone fixtures.');
            setLoadError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // Route ids identify the current collection and draw.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collectionId, fixtureId]);

    useEffect(() => {
        if (collectionId && !fixtureId && !loading && !cameraOn) scanInput.current?.focus();
    }, [collectionId, fixtureId, loading, cameraOn]);

    const readPlayers = async (file) => {
        if (!file) return;
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const buffer = await file.arrayBuffer();
            if (file.name.toLowerCase().endsWith('.csv')) {
                await workbook.csv.read(new Blob([buffer]).stream());
            } else {
                await workbook.xlsx.load(buffer);
            }
            const worksheet = workbook.worksheets[0];
            if (!worksheet) throw new Error('The spreadsheet has no worksheet.');
            const rows = [];
            worksheet.eachRow({ includeEmpty: false }, (row) => rows.push(row.values.slice(1).map((value) => {
                if (value === null || value === undefined) return '';
                if (typeof value === 'object') return String(value.text ?? value.result ?? '');
                return String(value).trim();
            })));
            const [headers = [], ...data] = rows;
            const nameIndex = headers.findIndex((header) => ['name', 'playername', 'athletename', 'participantname'].includes(norm(header)));
            const idIndex = headers.findIndex((header) => ['id', 'playerid', 'athleteid', 'participantid'].includes(norm(header)));
            if (nameIndex < 0) throw new Error('Include a Name column in the first row.');
            const list = data
                .filter((row) => row.some((cell) => cell !== ''))
                .map((row) => ({ name: row[nameIndex] ?? '', playerId: idIndex < 0 ? '' : row[idIndex] ?? '' }));
            if (list.length === 0) throw new Error('No player rows were found.');
            setPlayers(list);
            setFileName(file.name);
            setShowPlayersModal(false);
            toast.success(`${list.length} players loaded`);
        } catch (error) {
            toast.error(error.message || 'Could not read the spreadsheet. Use .xlsx or .csv.');
        }
    };

    const downloadPlayersTemplate = async () => {
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Players');
            worksheet.columns = [{ header: 'Name', key: 'name', width: 28 }, { header: 'Player ID', key: 'playerId', width: 20 }];
            worksheet.addRow({ name: 'Akshansh', playerId: '12345' });
            worksheet.views = [{ state: 'frozen', ySplit: 1 }];
            worksheet.autoFilter = 'A1:B1';
            const header = worksheet.getRow(1);
            header.font = { bold: true, color: { argb: 'FF1F2937' } };
            header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F5EB' } };
            const buffer = await workbook.xlsx.writeBuffer();
            const url = URL.createObjectURL(new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'fixture-players-template.xlsx';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            toast.error('Could not create the player template.');
        }
    };

    const applyManualPlayers = () => {
        const cleaned = manualPlayers
            .map((player) => ({ name: player.name.trim(), playerId: player.playerId.trim() }))
            .filter((player) => player.name || player.playerId);
        if (cleaned.some((player) => !player.name)) {
            toast.error('Enter a name for each player row.');
            return;
        }
        if (cleaned.length === 0) {
            toast.error('Add at least one player.');
            return;
        }
        setPlayers(cleaned);
        setFileName('Players entered manually');
        setShowPlayersModal(false);
    };

    const createCollection = async (event) => {
        event.preventDefault();
        if (!collectionName.trim() || !fixtureType) return;
        setBusy(true);
        try {
            const data = await api.post('/standalone-fixtures', { name: collectionName.trim(), fixtureType });
            toast.success('Fixture collection created');
            navigate(`${base}/${data.collection.id}`);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not create fixture collection.'));
        } finally {
            setBusy(false);
        }
    };

    const deleteCollection = async (item) => {
        if (!window.confirm(`Delete "${item.name}" and all its fixtures? This cannot be undone.`)) return;
        setDeletingCollectionId(item.id);
        try {
            await api.delete(`/standalone-fixtures/${item.id}`);
            setCollections((current) => current.filter((collectionItem) => collectionItem.id !== item.id));
            toast.success('Fixture collection deleted');
        } catch (error) {
            toast.error(errorMessage(error, 'Could not delete fixture collection.'));
        } finally {
            setDeletingCollectionId(null);
        }
    };

    const resetFixture = async (item) => {
        if (!window.confirm(`Reset all results in "${item.name}"? The players and current bracket will remain, but every match will need to be recorded again. If completed, the fixture will be reopened.`)) return;
        setFixtureAction({ id: item.id, action: 'reset' });
        try {
            const result = await api.post(`/standalone-fixtures/${collectionId}/fixtures/${item.id}/reset`);
            toast.success(result.message || 'Fixture results reset');
            await load();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not reset fixture results.'));
        } finally {
            setFixtureAction(null);
        }
    };

    const redrawFixture = async (item) => {
        if (!window.confirm(`Redraw "${item.name}"? All match results will be deleted and the same players will receive new pairings. If completed, the fixture will be reopened.`)) return;
        setFixtureAction({ id: item.id, action: 'redraw' });
        try {
            const result = await api.post(`/standalone-fixtures/${collectionId}/fixtures/${item.id}/redraw`);
            toast.success(result.message || 'Fixture redrawn');
            await load();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not redraw fixture.'));
        } finally {
            setFixtureAction(null);
        }
    };

    const createFixture = async (event) => {
        event.preventDefault();
        if (!fixtureName.trim() || players.length < 2) {
            toast.error('Enter a fixture name and at least two players.');
            return;
        }
        setBusy(true);
        try {
            const data = await api.post(`/standalone-fixtures/${collectionId}/fixtures`, {
                name: fixtureName.trim(),
                players: players.map((player) => ({ name: player.name.trim(), playerId: player.playerId.trim() })),
            });
            toast.success('Fixture generated');
            navigate(`${base}/${collectionId}/${data.fixture.id}`);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not create the fixture.'));
        } finally {
            setBusy(false);
        }
    };

    const setWinner = async (matchId, winnerPlayerId, player1Score, player2Score, resetFollowing = false, targetFixtureId = fixtureId) => {
        setBusy(true);
        try {
            const data = await api.put(
                `/standalone-fixtures/${collectionId}/fixtures/${targetFixtureId}/matches/${matchId}/winner`,
                { winnerPlayerId, player1Score, player2Score, resetFollowing }
            );
            if (String(targetFixtureId) === String(fixtureId)) setDraw((current) => ({ ...current, ...data }));
            return { ok: true };
        } catch (error) {
            const detail = error?.response?.data;
            return {
                ok: false,
                needsReset: !resetFollowing && detail?.code === 'FOLLOWING_MATCHES_DECIDED',
                affected: detail?.affected ?? [],
                message: errorMessage(error, 'Could not save the match result.'),
            };
        } finally {
            setBusy(false);
        }
    };

    const recordScannedWinner = async (code, selected = null) => {
        const scanned = String(code ?? '').trim();
        if (!scanned || scanBusy || fixtureId) return;

        setScanBusy(true);
        try {
            let candidate = selected;
            if (!candidate) {
                const lookup = await api.post(`/standalone-fixtures/${collectionId}/scan`, { code: scanned });
                if (lookup.status === 'none' || lookup.matches?.length === 0) {
                    throw new Error(lookup.message || 'No ready match was found for that player.');
                }
                if (lookup.matches.length > 1) {
                    setScanChoice({ code: scanned, matches: lookup.matches });
                    setScanResult(null);
                    return;
                }
                [candidate] = lookup.matches;
            }

            let result = await setWinner(
                candidate.matchId,
                candidate.player.id,
                null,
                null,
                false,
                candidate.fixtureId
            );
            if (result.needsReset && await confirmReset({
                title: `Record ${candidate.player.name} as the winner?`,
                message: result.message,
                affected: result.affected,
            })) {
                result = await setWinner(
                    candidate.matchId,
                    candidate.player.id,
                    null,
                    null,
                    true,
                    candidate.fixtureId
                );
            }

            if (!result.ok) {
                setScanResult({ tone: 'error', message: result.message });
                toast.error(result.message);
                return;
            }

            setScanChoice(null);
            const message = `${candidate.player.name} recorded as winner over ${candidate.opponent.name} in ${candidate.fixtureName}.`;
            setScanResult({ tone: 'ok', message });
            toast.success(message);
        } catch (error) {
            const message = error.response
                ? errorMessage(error, 'Could not find a ready match for that player.')
                : error.message;
            setScanChoice(null);
            setScanResult({ tone: 'error', message });
            toast.error(message);
        } finally {
            setScanBusy(false);
            setScanCode('');
            scanInput.current?.focus();
        }
    };

    const submitScan = (event) => {
        event.preventDefault();
        const code = scanCode.trim();
        if (!code || scanBusy) return;
        setScanCode('');
        recordScannedWinner(code);
    };

    const sides = useMemo(() => inPlayingOrder(draw?.rounds), [draw]);
    const matches = useMemo(
        () => sides.flatMap(([, rounds]) => rounds.flatMap((round) => round.matches ?? [])).filter((match) => !isVoid(match)),
        [sides]
    );
    const byes = useMemo(() => new Set(draw?.byes ?? []), [draw]);
    const drawPlayers = useMemo(
        () => (draw?.players ?? []).map((player) => ({
            ...player,
            playerId: String(player.player_id ?? player.playerId ?? ''),
        })),
        [draw]
    );
    const locked = draw?.fixture?.status === 'completed';
    const played = matches.filter((match) => match.winner).length;
    const allDecided = matches.length > 0 && played === matches.length;
    const champion = useMemo(() => {
        const decisive = draw?.rounds?.grand_final ?? sides[sides.length - 1]?.[1];
        return decisive?.[decisive.length - 1]?.matches?.[0]?.winner?.name ?? null;
    }, [draw?.rounds, sides]);

    const clearWinner = async (matchId, resetFollowing = false) => {
        setBusy(true);
        try {
            const data = await api.delete(
                `/standalone-fixtures/${collectionId}/fixtures/${fixtureId}/matches/${matchId}/winner`,
                { data: { resetFollowing } }
            );
            setDraw((current) => ({ ...current, ...data }));
            return { ok: true };
        } catch (error) {
            const detail = error?.response?.data;
            return {
                ok: false,
                needsReset: !resetFollowing && detail?.code === 'FOLLOWING_MATCHES_DECIDED',
                affected: detail?.affected ?? [],
                message: errorMessage(error, 'Could not clear the match result.'),
            };
        } finally {
            setBusy(false);
        }
    };

    const exportFixturePdf = () =>
        downloadFixturePdf({
            title: draw?.fixture?.name ?? 'Fixture',
            typeName: collection?.fixtureTypeName ?? '',
            players: drawPlayers,
            sides,
            champion,
            scoresEnabled,
            byes,
        }).catch(() => toast.error('Could not build the PDF.'));

    const exportRanking = () =>
        downloadRankingPdf({
            title: draw?.fixture?.name ?? 'Fixture',
            typeName: collection?.fixtureTypeName ?? '',
            ranking: buildRanking(sides, drawPlayers, champion),
            champion,
        }).catch(() => toast.error('Could not build the ranking list.'));

    const exportTieSheet = () =>
        downloadTieSheet({
            title: draw?.fixture?.name ?? 'Fixture',
            typeName: collection?.fixtureTypeName ?? '',
            sides,
            champion,
            scoresEnabled,
        }).catch(() => toast.error('Could not build the tie sheet.'));

    const completeFixture = async () => {
        if (!window.confirm('Complete and lock this fixture? Its results can no longer be changed.')) return;
        setBusy(true);
        try {
            const data = await api.post(`/standalone-fixtures/${collectionId}/fixtures/${fixtureId}/complete`);
            setDraw((current) => ({ ...current, fixture: { ...current.fixture, status: 'completed' } }));
            toast.success(data.message || 'Fixture completed and locked.');
        } catch (error) {
            toast.error(errorMessage(error, 'Could not complete the fixture.'));
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20 text-gray-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    if (!collectionId) {
        return (
            <main className="mx-auto max-w-6xl space-y-6 pb-12">
                <header>
                    <Link to="/dashboard/operations" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft className="h-4 w-4" /> Tournament operations</Link>
                    <h1 className="text-xl font-bold text-gray-900">Standalone fixture collections</h1>
                    <p className="mt-1 text-sm text-gray-500">Build fixtures directly from player lists, without a registration form.</p>
                </header>

                <form onSubmit={createCollection} className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
                    <label className="block text-sm font-medium text-gray-700">
                        Collection name
                        <input value={collectionName} onChange={(event) => setCollectionName(event.target.value)} maxLength={150} required placeholder="e.g. Inter-school tournament" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-regx-orange" />
                    </label>
                    <label className="block text-sm font-medium text-gray-700">
                        Fixture type
                        <select value={fixtureType} onChange={(event) => setFixtureType(event.target.value)} required className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-regx-orange">
                            {types.map((type) => <option key={type.slug} value={type.slug}>{type.name}</option>)}
                        </select>
                    </label>
                    <button disabled={busy || types.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg bg-regx-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create collection
                    </button>
                </form>

                <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-gray-800">Your collections</h2>
                    {collections.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">No fixture collections yet. Create one to get started.</div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {collections.map((item) => (
                                <article key={item.id} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 hover:border-regx-orange/50">
                                    <Link to={`${base}/${item.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1">
                                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-50 text-regx-orange"><Swords className="h-5 w-5" /></span>
                                        <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-gray-900">{item.name}</strong><span className="text-xs text-gray-500">{item.fixtureTypeName}</span></span>
                                        <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => deleteCollection(item)}
                                        disabled={deletingCollectionId !== null}
                                        aria-label={`Delete ${item.name}`}
                                        title="Delete collection and all its fixtures"
                                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                    >
                                        {deletingCollectionId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        );
    }

    if (!collection) {
        return (
            <div className="mx-auto max-w-3xl py-12 text-center">
                <p className="text-sm text-red-700">{loadError || 'Fixture collection not found.'}</p>
                <button type="button" onClick={load} className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Try again</button>
            </div>
        );
    }

    return (
        <main className="mx-auto max-w-7xl space-y-5 pb-12">
            {fixtureId ? (
                <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                    <div className="flex flex-wrap items-start gap-3">
                        <Link to={`${base}/${collectionId}`} className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Back to fixture collection">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div className="min-w-[220px] flex-1">
                            <p className="text-xs text-gray-500">Fixture engine · {collection.name}</p>
                            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">{draw?.fixture?.name ?? 'Fixture draw'}</h1>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-md bg-orange-50 px-2 py-1 font-medium text-regx-orange">{collection.fixtureTypeName}</span>
                                {locked && <span className="rounded-md bg-yellow-100 px-2 py-1 font-medium text-yellow-800">Completed</span>}
                                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-gray-700"><Users className="h-3.5 w-3.5" />{drawPlayers.length} players</span>
                                {matches.length > 0 && <span className="rounded-md bg-gray-100 px-2 py-1 text-gray-700">{played} / {matches.length} matches decided</span>}
                            </div>
                        </div>

                        <label className="flex shrink-0 cursor-pointer select-none items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                            <span>Scores</span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={scoresEnabled}
                                onClick={toggleScores}
                                className={`relative h-5 w-9 rounded-full transition-colors ${scoresEnabled ? 'bg-regx-orange' : 'bg-gray-300'}`}
                            >
                                <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${scoresEnabled ? 'translate-x-4' : ''}`} />
                            </button>
                        </label>

                        {locked ? (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm font-semibold text-yellow-800">
                                <Lock className="h-4 w-4" /> Completed
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={completeFixture}
                                disabled={!allDecided || busy}
                                title={allDecided ? 'Lock this fixture. No result can be changed afterwards.' : 'Available once every match has a result'}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-yellow-500 px-3 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-40"
                            >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Complete
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={exportFixturePdf}
                            disabled={sides.length === 0}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange disabled:opacity-40"
                        >
                            <FileDown className="h-4 w-4" /> PDF
                        </button>
                        <button
                            type="button"
                            onClick={exportRanking}
                            disabled={sides.length === 0 || !champion}
                            title={champion ? '1st, 2nd, 3rd and so on' : 'Available once the final has a winner'}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange disabled:opacity-40"
                        >
                            <Medal className="h-4 w-4" /> Ranking
                        </button>
                        <button
                            type="button"
                            onClick={exportTieSheet}
                            disabled={sides.length === 0}
                            title="The bracket as a printable sheet"
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange disabled:opacity-40"
                        >
                            <Printer className="h-4 w-4" /> Tie sheet
                        </button>
                        <button
                            type="button"
                            onClick={load}
                            disabled={loading}
                            className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                            aria-label="Refresh draw"
                            title="Refresh from the fixture service"
                        >
                            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            ) : (
                <header className="flex flex-wrap items-start gap-3">
                    <Link to={base} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500">Standalone fixture collection · {collection.fixtureTypeName}</p>
                        <h1 className="text-xl font-bold text-gray-900">{collection.name}</h1>
                    </div>
                </header>
            )}

            {!fixtureId ? (
                <>
                    <form onSubmit={createFixture} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
                        <h2 className="text-base font-semibold text-gray-900">Create fixture</h2>
                        <label className="block max-w-xl text-sm font-medium text-gray-700">
                            Fixture name
                            <input value={fixtureName} onChange={(event) => setFixtureName(event.target.value)} maxLength={150} required placeholder="e.g. Under-18 Girls" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-regx-orange" />
                        </label>
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed border-gray-300 p-4">
                            <span className="flex items-center gap-2 text-sm text-gray-700">
                                <FileSpreadsheet className="h-5 w-5 text-gray-400" />
                                {fileName || 'Add players by uploading a sheet or entering them manually.'}
                            </span>
                            <button type="button" onClick={() => setShowPlayersModal(true)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange">
                                <Users className="h-4 w-4" /> {players.length ? 'Manage players' : 'Add players'}
                            </button>
                        </div>
                        {players.length > 0 && (
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full min-w-[480px] text-left text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="px-3 py-2">Player name</th><th className="px-3 py-2">Player ID (optional)</th><th className="w-10 px-2 py-2" /></tr></thead>
                                    <tbody>{players.map((player, index) => (
                                        <tr key={index} className="border-t border-gray-100">
                                            <td className="px-3 py-1.5"><input value={player.name} onChange={(event) => setPlayers((list) => list.map((item, row) => row === index ? { ...item, name: event.target.value } : item))} className="w-full rounded border border-gray-200 px-2 py-1" /></td>
                                            <td className="px-3 py-1.5"><input value={player.playerId} onChange={(event) => setPlayers((list) => list.map((item, row) => row === index ? { ...item, playerId: event.target.value } : item))} className="w-full rounded border border-gray-200 px-2 py-1" /></td>
                                            <td className="px-2 py-1.5"><button type="button" onClick={() => setPlayers((list) => list.filter((_, row) => row !== index))} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${player.name || 'player'}`}><Trash2 className="h-4 w-4" /></button></td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <p className="inline-flex items-center gap-1.5 text-xs text-gray-500"><FileSpreadsheet className="h-4 w-4" />{players.length} players · at least 2 required</p>
                                {players.length > 0 && <button type="button" onClick={() => setPlayers((list) => [...list, { name: '', playerId: '' }])} className="inline-flex items-center gap-1 text-xs font-medium text-regx-orange"><Plus className="h-3.5 w-3.5" />Add player</button>}
                            </div>
                            <button disabled={busy || players.length < 2} className="inline-flex items-center gap-2 rounded-lg bg-regx-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Generate fixture
                            </button>
                        </div>
                    </form>

                    {confirmRequest && <ConfirmReset request={confirmRequest} onAnswer={answerConfirm} />}
                    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                        <div>
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><ScanLine className="h-4 w-4 text-regx-orange" /> Scan and record winner</h2>
                            <p className="mt-1 text-xs text-gray-500">Scan or type a player ID (or exact player name) to find and update a ready match anywhere in this collection.</p>
                        </div>
                        <form onSubmit={submitScan} className="flex gap-2">
                            <div className="relative min-w-0 flex-1">
                                <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-regx-orange" aria-hidden="true" />
                                <input
                                    ref={scanInput}
                                    value={scanCode}
                                    onChange={(event) => setScanCode(event.target.value)}
                                    disabled={fixtures.length === 0 || scanBusy}
                                    autoComplete="off"
                                    spellCheck={false}
                                    placeholder="Scan or enter player ID"
                                    aria-label="Scan winner player ID"
                                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 font-mono text-sm outline-none focus:border-regx-orange focus:ring-2 focus:ring-orange-100 disabled:bg-gray-50"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={fixtures.length === 0 || scanBusy || !scanCode.trim()}
                                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-regx-orange px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                            >
                                {scanBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                                Record win
                            </button>
                            <button
                                type="button"
                                onClick={() => setCameraOn((on) => !on)}
                                disabled={fixtures.length === 0 || scanBusy}
                                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange disabled:opacity-50"
                                aria-label={cameraOn ? 'Close camera' : 'Scan with camera'}
                            >
                                <Camera className="h-4 w-4" /><span className="hidden sm:inline">{cameraOn ? 'Close camera' : 'Use camera'}</span>
                            </button>
                        </form>
                        {cameraOn && <CameraScanner onCode={(code) => recordScannedWinner(code)} paused={scanBusy || Boolean(scanChoice)} onClose={() => setCameraOn(false)} />}
                        {scanResult && (
                            <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${scanResult.tone === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                                {scanResult.message}
                            </p>
                        )}
                        {scanChoice && (
                            <div role="alertdialog" aria-label="Choose the match" className="space-y-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-amber-900">{scanChoice.matches[0]?.player.name} has multiple ready matches. Choose the match they won.</p>
                                        <p className="mt-1 text-xs text-amber-800">Scanned ID: {scanChoice.code}</p>
                                    </div>
                                    <button type="button" onClick={() => setScanChoice(null)} className="rounded p-1 text-amber-800 hover:bg-amber-100" aria-label="Cancel match selection"><X className="h-4 w-4" /></button>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {scanChoice.matches.map((candidate) => (
                                        <button
                                            key={`${candidate.fixtureId}-${candidate.matchId}`}
                                            type="button"
                                            onClick={() => recordScannedWinner(scanChoice.code, candidate)}
                                            disabled={scanBusy}
                                            className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-3 text-left hover:border-regx-orange disabled:opacity-50"
                                        >
                                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gray-900 text-sm font-bold text-white">{candidate.matchNumber}</span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-xs font-semibold text-gray-900">{candidate.fixtureName} · {candidate.side.replace(/_/g, ' ')}</span>
                                                <span className="block text-xs text-gray-500">{candidate.round}</span>
                                                <span className="mt-1 flex items-center gap-1.5 text-xs text-gray-700"><span className="font-medium">{candidate.player.name}</span><Swords className="h-3.5 w-3.5 text-gray-400" /><span>{candidate.opponent.name}</span></span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-gray-800">Fixtures in this collection</h2>
                        {fixtures.length === 0 ? <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">Upload players and create the first fixture.</p> : (
                            <div className="grid gap-3 md:grid-cols-2">
                                {fixtures.map((item) => {
                                    const actionBusy = fixtureAction?.id === item.id;
                                    return (
                                        <article key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 hover:border-regx-orange/50">
                                            <Link to={`${base}/${collectionId}/${item.id}`} className="flex min-w-[220px] flex-1 items-center gap-3 rounded-lg p-1">
                                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-50 text-regx-orange"><Trophy className="h-5 w-5" /></span>
                                                <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-gray-900">{item.name}</strong><span className="inline-flex items-center gap-1 text-xs text-gray-500"><Users className="h-3.5 w-3.5" />{item.entrants} players · {item.status}</span></span>
                                                <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
                                            </Link>
                                            <div className="flex shrink-0 items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => resetFixture(item)}
                                                    disabled={fixtureAction !== null || !['started', 'completed'].includes(item.status)}
                                                    title="Clear all match results and keep the current bracket"
                                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                                                >
                                                    {actionBusy && fixtureAction.action === 'reset' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Reset
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => redrawFixture(item)}
                                                    disabled={fixtureAction !== null || !['started', 'completed'].includes(item.status)}
                                                    title="Create new pairings from the same players"
                                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 hover:border-regx-orange hover:text-regx-orange disabled:opacity-40"
                                                >
                                                    {actionBusy && fixtureAction.action === 'redraw' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5" />} Redraw
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </>
            ) : (
                <>
                    {confirmRequest && <ConfirmReset request={confirmRequest} onAnswer={answerConfirm} />}
                    {loadError && (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <span>{loadError}</span>
                            <button type="button" onClick={load} className="shrink-0 text-xs font-medium underline">Try again</button>
                        </div>
                    )}
                    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
                        <div className="self-start overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">
                                Players <span className="font-normal text-gray-400">({drawPlayers.length})</span>
                            </h2>
                            {drawPlayers.length === 0 ? (
                                <p className="px-4 py-6 text-sm text-gray-500">No players in this bracket.</p>
                            ) : (
                                <ol className="max-h-[70vh] divide-y divide-gray-100 overflow-y-auto">
                                    {drawPlayers.map((player, index) => (
                                        <li key={player.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                                            <span className="w-6 text-xs tabular-nums text-gray-400">{index + 1}</span>
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-gray-900">{player.name}</p>
                                                <p className="truncate text-xs text-gray-500">{player.playerId.split(':')[0]}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>

                        <div className="min-w-0 space-y-6 rounded-xl border border-gray-200 bg-white p-4">
                            {sides.length === 0 && !loading && !loadError && (
                                <p className="py-16 text-center text-sm text-gray-500">The fixture service has no draw for this bracket yet.</p>
                            )}
                            {sides.map(([side, rounds], sideIndex) => (
                                <section key={side}>
                                    {sides.length > 1 && <h2 className="mb-3 text-sm font-semibold text-gray-900">{sideLabel(side)}</h2>}
                                    <RoundColumns
                                        side={side}
                                        rounds={rounds}
                                        scoresEnabled={scoresEnabled}
                                        onSetWinner={setWinner}
                                        onResetWinner={clearWinner}
                                        onConfirm={confirmReset}
                                        locked={locked || busy}
                                        byes={byes}
                                        champion={sideIndex === sides.length - 1 ? champion : undefined}
                                    />
                                </section>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {showPlayersModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-5">
                    <section role="dialog" aria-modal="true" aria-labelledby="players-modal-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <header className="flex items-start justify-between gap-3 border-b border-gray-100 p-5">
                            <div>
                                <h2 id="players-modal-title" className="text-lg font-bold text-gray-900">Add players</h2>
                                <p className="mt-1 text-xs text-gray-500">A player ID identifies the same person across every fixture in this collection. Leave it blank to match by name.</p>
                            </div>
                            <button type="button" onClick={() => setShowPlayersModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close"><X className="h-5 w-5" /></button>
                        </header>

                        <div className="flex-1 space-y-4 overflow-y-auto p-5">
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => setPlayerInputMode('upload')} className={`rounded-lg px-3 py-2 text-sm font-medium ${playerInputMode === 'upload' ? 'bg-orange-50 text-regx-orange' : 'text-gray-600 hover:bg-gray-50'}`}><Upload className="mr-1.5 inline h-4 w-4" />Upload sheet</button>
                                <button type="button" onClick={() => {
                                    setManualPlayers(players.length ? players.map((player) => ({ ...player })) : [{ name: '', playerId: '' }]);
                                    setPlayerInputMode('manual');
                                }} className={`rounded-lg px-3 py-2 text-sm font-medium ${playerInputMode === 'manual' ? 'bg-orange-50 text-regx-orange' : 'text-gray-600 hover:bg-gray-50'}`}><Plus className="mr-1.5 inline h-4 w-4" />Enter players</button>
                                <button type="button" onClick={downloadPlayersTemplate} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><Download className="h-4 w-4" />Download template</button>
                            </div>

                            {playerInputMode === 'upload' ? (
                                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-regx-orange">
                                    <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-800">Choose an .xlsx or .csv file</span>
                                    <span className="text-xs text-gray-500">Use the template columns: Name and Player ID (optional).</span>
                                    <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(event) => readPlayers(event.target.files?.[0])} />
                                </label>
                            ) : (
                                <div className="space-y-3">
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="w-full min-w-[480px] text-left text-sm">
                                            <thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="px-3 py-2">Player name</th><th className="px-3 py-2">Player ID (optional)</th><th className="w-10 px-2 py-2" /></tr></thead>
                                            <tbody>{manualPlayers.map((player, index) => (
                                                <tr key={index} className="border-t border-gray-100">
                                                    <td className="px-3 py-1.5"><input value={player.name} onChange={(event) => setManualPlayers((list) => list.map((item, row) => row === index ? { ...item, name: event.target.value } : item))} placeholder="Player name" className="w-full rounded border border-gray-200 px-2 py-1.5" /></td>
                                                    <td className="px-3 py-1.5"><input value={player.playerId} onChange={(event) => setManualPlayers((list) => list.map((item, row) => row === index ? { ...item, playerId: event.target.value } : item))} placeholder="Optional ID" className="w-full rounded border border-gray-200 px-2 py-1.5" /></td>
                                                    <td className="px-2 py-1.5"><button type="button" onClick={() => setManualPlayers((list) => list.length === 1 ? [{ name: '', playerId: '' }] : list.filter((_, row) => row !== index))} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove player"><Trash2 className="h-4 w-4" /></button></td>
                                                </tr>
                                            ))}</tbody>
                                        </table>
                                    </div>
                                    <button type="button" onClick={() => setManualPlayers((list) => [...list, { name: '', playerId: '' }])} className="inline-flex items-center gap-1 text-sm font-medium text-regx-orange"><Plus className="h-4 w-4" />Add another player</button>
                                </div>
                            )}
                        </div>

                        <footer className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/60 p-4">
                            <button type="button" onClick={() => setShowPlayersModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white">Cancel</button>
                            {playerInputMode === 'manual' && <button type="button" onClick={applyManualPlayers} className="rounded-lg bg-regx-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Use these players</button>}
                        </footer>
                    </section>
                </div>
            )}
        </main>
    );
};

export default StandaloneFixtures;

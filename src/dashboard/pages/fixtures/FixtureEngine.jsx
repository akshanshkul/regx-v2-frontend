import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    ArrowLeft, Save, Swords, Users, Eye, Inbox, Loader2, AlertTriangle, Play, CheckCircle2, Lock, PlugZap, RotateCcw, Info, X, Trash2, Shuffle, MonitorPlay, LayoutGrid, Medal, Flag, History, Scale, ListOrdered, Maximize2,
} from 'lucide-react';
import { useFixtureData, useFixtureState } from './fixtureData';
import ResultScanner from './ResultScanner';
import { inPlayingOrder, buildRanking, downloadRankingPdf } from './FixtureCategory';
import api from '../../../services/api';
import TableSettings from './TableSettings';
import FoulSettings from './FoulSettings';
import PublicScreenGuide from './PublicScreenGuide';
import FixtureHistory from './FixtureHistory';
import WeighCheck from './WeighCheck';
import CategoryLimits from './CategoryLimits';
import { encodeId } from '../../../shared/utils/ids';
import { useRouteIds } from '../../../shared/utils/ids';

/** Asks before a draw that already exists is thrown away. */
const ConfirmDraw = ({ request, onAnswer }) => {
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onAnswer(false);
        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [onAnswer]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => onAnswer(false)}>
            <div role="dialog" aria-modal="true" className="w-full max-w-sm bg-white rounded-xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-gray-900">{request.title}</h2>
                        <p className="text-sm text-gray-600 mt-1">{request.message}</p>
                        <p className="text-xs text-gray-500 mt-2 break-words">{request.category}</p>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-5">
                    <button type="button" onClick={() => onAnswer(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="button" onClick={() => onAnswer(true)} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">
                        {request.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

/** The selected fixture type's details, before it is saved. */
const FixtureTypeModal = ({ type, onClose, onSave, saving, canSave }) => {
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="fixture-type-title"
                className="w-full max-w-md bg-white rounded-xl shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-3 p-5 border-b border-gray-100">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 text-regx-orange flex items-center justify-center shrink-0">
                        <Swords className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 id="fixture-type-title" className="text-base font-bold text-gray-900">{type.name}</h2>
                        <p className="text-xs text-gray-500 font-mono">{type.slug}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        {type.description || 'No description provided by the fixture service.'}
                    </p>

                    <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-3 text-xs space-y-1">
                        <p className="font-medium">This type is not saved yet.</p>
                        <p>Saving creates this form's collection in the fixture service. Once a category is started, the type is locked.</p>
                    </div>
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={!canSave || saving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save this type
                    </button>
                </div>
            </div>
        </div>
    );
};

const selectClass =
    'border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none disabled:bg-gray-50 disabled:text-gray-500';

/**
 * Fixture engine: pick the fixture type, start categories, open their draws.
 *
 * Saving the type creates the form's collection in the fixture service;
 * starting a category creates its bracket, players and draw there.
 */
const FixtureEngine = () => {
    const { eventId: eventIdFromPath, formId } = useRouteIds();
    const navigate = useNavigate();

    const { loading, error, form, event, categories } = useFixtureData(formId);
    const stored = useFixtureState(formId);

    const savedType = stored.fixture?.type ?? '';
    const locked = stored.categories.some((item) => item.bracketId);
    const supported = stored.types.filter((type) => type.supported);
    const ready = stored.service.configured && !stored.service.error;

    const [fixtureType, setFixtureType] = useState('');
    const [category, setCategory] = useState('');
    const [busy, setBusy] = useState(null);
    const [showType, setShowType] = useState(false);
    const [showTables, setShowTables] = useState(false);
    const [showFouls, setShowFouls] = useState(false);
    const [showScreenGuide, setShowScreenGuide] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showWeigh, setShowWeigh] = useState(false);
    const [showLimits, setShowLimits] = useState(false);
    // { category: max } — a limited category draws only its first comers.
    const [limits, setLimits] = useState({});

    useEffect(() => {
        api.get(`/forms/${formId}/fixture/limits`).then((p) => setLimits(p.limits ?? {})).catch(() => {});
    }, [formId]);
    const [confirm, setConfirm] = useState(null);

    useEffect(() => {
        if (!stored.loading) setFixtureType(savedType || supported[0]?.slug || '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stored.loading, savedType, stored.types.length]);

    const eventId = eventIdFromPath ?? event?.id;
    const base = eventIdFromPath
        ? `/events/${encodeId(eventIdFromPath)}/form/${encodeId(formId)}/fixture`
        : `/forms/${encodeId(formId)}/fixture`;
    const dataPath = eventId
        ? `/events/${encodeId(eventId)}/forms/${encodeId(formId)}/data`
        : `/forms/${encodeId(formId)}/data`;
    const categoryPath = (name) => `${base}/${encodeURIComponent(name)}`;

    useEffect(() => {
        document.title = form?.name ? `Fixture engine — ${form.name}` : 'Fixture engine';
    }, [form?.name]);

    const competitors = categories.reduce((n, group) => n + group.entries.length, 0);
    const dirty = fixtureType !== '' && fixtureType !== savedType;
    const connected = Boolean(stored.fixture?.connected) && !dirty;
    const selected = categories.find((group) => group.category === category);
    const selectedType = stored.types.find((type) => type.slug === fixtureType) ?? null;

    const save = async () => {
        setBusy('save');
        const result = await stored.saveType(fixtureType);
        setBusy(null);

        if (result.ok) {
            toast.success('Fixture type saved');
            setShowType(false);
        } else {
            toast.error(result.message);
        }
    };

    const start = async (name = selected?.category) => {
        if (!name) return;

        if (stored.isStarted(name)) {
            navigate(categoryPath(name));
            return;
        }

        setBusy(`start:${name}`);
        const result = await stored.startCategory(name);
        setBusy(null);

        if (!result.ok) {
            toast.error(result.message);
            return;
        }

        toast.success('Draw created');
        navigate(categoryPath(name));
    };

    // The screen is worth opening only once a category has a draw on it.
    const publicToken = stored.fixture?.publicToken ?? null;
    const anyStarted = stored.categories.some((item) => ['started', 'completed'].includes(item.status));
    const publicUrl = publicToken ? `${window.location.origin}/draw/${publicToken}` : null;

    const ask = (request) => new Promise((resolve) => setConfirm({ ...request, resolve }));

    const answer = (value) => {
        confirm?.resolve(value);
        setConfirm(null);
    };

    /** Throw the draw away and build a new one from whoever is registered now. */
    /** The ranking list of a completed category: reads its draw, then builds the PDF. */
    const rankingPdf = async (name, info) => {
        setBusy(`rank:${name}`);

        try {
            const draw = await api.get(`/forms/${formId}/fixture/draw`, { params: { category: name } });
            const sides = inPlayingOrder(draw.rounds);
            const decisive = draw.rounds?.grand_final ?? sides[sides.length - 1]?.[1];
            const champion = decisive?.[decisive.length - 1]?.matches?.[0]?.winner?.name ?? null;

            await downloadRankingPdf({
                title: draw.bracket?.name ?? info?.name ?? name,
                typeName: draw.category?.typeName ?? draw.bracket?.type,
                ranking: buildRanking(sides, draw.players ?? [], champion),
                champion,
            });
        } catch {
            toast.error('Could not build the ranking list.');
        } finally {
            setBusy(null);
        }
    };

    const redraw = async (name) => {
        const agreed = await ask({
            title: 'Redraw this category?',
            message: 'The current draw and any results recorded in it are deleted, and a new draw is made from everyone registered now.',
            category: name,
            confirmLabel: 'Delete and redraw',
        });

        if (!agreed) return;

        setBusy(`start:${name}`);
        const result = await stored.startCategory(name, true);
        setBusy(null);

        if (result.ok) {
            toast.success('Redrawn');
            navigate(categoryPath(name));
        } else {
            toast.error(result.message);
        }
    };

    /** Late registrations into a draw nobody has played yet: drawn again, nothing lost. */
    const addLate = async (name, added) => {
        const agreed = await ask({
            title: `Add ${added} late entr${added === 1 ? 'y' : 'ies'}?`,
            message: 'No match in this category has a result yet, so it is simply drawn again with everyone registered now. Nothing played is lost; the pairings change.',
            category: name,
            confirmLabel: 'Add and draw again',
        });

        if (!agreed) return;

        setBusy(`late:${name}`);
        const result = await stored.addLateEntries(name);
        setBusy(null);

        result.ok ? toast.success(result.message || 'Late entries added') : toast.error(result.message);
    };

    /** Delete the draw and forget the category, so it can be started again. */
    const reset = async (name) => {
        const agreed = await ask({
            title: 'Reset this category?',
            message: 'Its draw and any results are deleted in the fixture service. The category goes back to not started.',
            category: name,
            confirmLabel: 'Delete the draw',
        });

        if (!agreed) return;

        setBusy(`reset:${name}`);
        const result = await stored.resetCategory(name);
        setBusy(null);

        if (result.ok) toast.success('Category reset');
        else toast.error(result.message);
    };

    return (
        <div className=" mx-auto space-y-5">
            {/* Header: title, fixture type, save */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={() => navigate(dataPath)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
                        aria-label="Back to registrations"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="w-10 h-10 rounded-lg bg-orange-50 text-regx-orange flex items-center justify-center shrink-0">
                        <Swords className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                            Fixture engine{form?.name ? ` — ${form.name}` : ''}
                        </h1>
                        <p className="text-xs text-gray-500 truncate">
                            {[event?.title, event?.subtype ?? event?.type].filter(Boolean).join(' · ') || ' '}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-x-2 gap-y-2 flex-wrap pt-4 border-t border-gray-100">
                    <label htmlFor="fixture-type" className="text-sm text-gray-600">Fixture type</label>
                    <select
                        id="fixture-type"
                        value={fixtureType}
                        onChange={(e) => setFixtureType(e.target.value)}
                        disabled={stored.loading || locked || !ready}
                        title={locked ? 'Locked — categories have already been started' : undefined}
                        className={`${selectClass} w-auto min-w-[10rem]`}
                    >
                        {stored.types.length === 0 && <option value="">{stored.loading ? 'Loading…' : 'Unavailable'}</option>}
                        {stored.types.map((type) => (
                            <option key={type.slug} value={type.slug} disabled={!type.supported}>
                                {type.name}{type.supported ? '' : ' (coming soon)'}
                            </option>
                        ))}
                    </select>

                    {/* Details of the chosen type, while it is still unsaved */}
                    {selectedType && !connected && !locked && (
                        <button
                            type="button"
                            onClick={() => setShowType(true)}
                            className="p-2 rounded-lg text-regx-orange hover:bg-orange-50 transition-colors"
                            aria-label={`About ${selectedType.name}`}
                            title={`About ${selectedType.name}`}
                        >
                            <Info className="w-5 h-5" />
                        </button>
                    )}

                    {/* The hall's tables: how many, and which match is on each. */}
                    {connected && ready && (
                        <button
                            type="button"
                            onClick={() => setShowTables(true)}
                            title="Table settings — how many tables, and which match plays on each"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors"
                        >
                            <LayoutGrid className="w-4 h-4" /> Tables
                        </button>
                    )}

                    {/* Counting fouls on matches, and how many lose one. */}
                    {connected && ready && (
                        <button
                            type="button"
                            onClick={() => setShowFouls(true)}
                            title="Foul settings — count fouls, how many lose a match, and whether that is recorded automatically"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors"
                        >
                            <Flag className="w-4 h-4" /> Fouls
                        </button>
                    )}

                    {/* How many may compete per category; the rest wait in order. */}
                    <button
                        type="button"
                        onClick={() => setShowLimits(true)}
                        title="Category limits — how many may compete, and the waitlist"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors"
                    >
                        <ListOrdered className="w-4 h-4" /> Limits
                    </button>

                    {/* Before the draw: weigh-ins outside the class entered. */}
                    <button
                        type="button"
                        onClick={() => setShowWeigh(true)}
                        title="Weigh-in check — who weighed in outside their weight class"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors"
                    >
                        <Scale className="w-4 h-4" /> Weigh-in check
                    </button>

                    {/* Who changed which draw or result, and when. */}
                    {connected && (
                        <button
                            type="button"
                            onClick={() => setShowHistory(true)}
                            title="History — every change to the draws and results"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors"
                        >
                            <History className="w-4 h-4" /> History
                        </button>
                    )}

                    {/* The hall screen, single tables and stream overlays: links and how to use them. */}
                    {publicUrl && (
                        <button
                            type="button"
                            onClick={() => setShowScreenGuide(true)}
                            title="Public screen — links for the hall, each table and live streams"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors"
                        >
                            <MonitorPlay className="w-4 h-4" /> Public screen
                        </button>
                    )}

                    {locked ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs">
                            <Lock className="w-4 h-4" /> Locked
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={save}
                            disabled={!ready || busy !== null || fixtureType === '' || connected}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-regx-orange text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                            {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {connected ? 'Saved' : 'Save'}
                        </button>
                    )}
                </div>
            </div>

            {confirm && <ConfirmDraw request={confirm} onAnswer={answer} />}

            {showTables && <TableSettings formId={formId} publicUrl={publicUrl} onClose={() => setShowTables(false)} />}
            {showFouls && <FoulSettings formId={formId} onClose={() => setShowFouls(false)} />}
            {showHistory && <FixtureHistory formId={formId} onClose={() => setShowHistory(false)} />}
            {showWeigh && <WeighCheck formId={formId} onClose={() => setShowWeigh(false)} />}
            {showLimits && <CategoryLimits formId={formId} onClose={() => setShowLimits(false)} onSaved={setLimits} />}
            {showScreenGuide && (
                <PublicScreenGuide formId={formId} publicUrl={publicUrl} anyStarted={anyStarted} onClose={() => setShowScreenGuide(false)} />
            )}

            {showType && selectedType && (
                <FixtureTypeModal
                    type={selectedType}
                    onClose={() => setShowType(false)}
                    onSave={save}
                    saving={busy === 'save'}
                    canSave={ready && busy === null}
                />
            )}

            {/* Service status */}
            {!stored.loading && !ready && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm flex items-start gap-3">
                    <PlugZap className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium">
                            {stored.service.configured ? 'The fixture service is not responding' : 'The fixture service is not connected'}
                        </p>
                        <p className="mt-0.5">
                            {stored.service.error ||
                                stored.error ||
                                'Set FIXTURE_API_URL and FIXTURE_API_KEY in the backend .env to create draws. You can still browse categories below.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Start a category */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <label htmlFor="fixture-category" className="text-sm font-medium text-gray-700 shrink-0">Category</label>
                <select
                    id="fixture-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={loading || categories.length === 0}
                    className={`${selectClass} w-full sm:w-96`}
                >
                    <option value="">Select a category</option>
                    {categories.map((group) => {
                        const started = stored.isStarted(group.category);

                        return (
                            <option key={group.category} value={group.category} disabled={group.entries.length < 2}>
                                {started ? '✓ ' : ''}
                                {group.category} ({group.entries.length}){group.entries.length < 2 ? ' — needs 2+' : ''}
                                {started ? ' — started' : ''}
                            </option>
                        );
                    })}
                </select>

                {selected && stored.isStarted(selected.category) ? (
                    <button
                        type="button"
                        onClick={() => start()}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors shrink-0"
                    >
                        <Eye className="w-4 h-4" /> Open
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => start()}
                        disabled={!selected || busy !== null || !connected || !ready}
                        title={!connected ? 'Save the fixture type first' : undefined}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shrink-0"
                    >
                        {busy === `start:${selected?.category}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Start
                    </button>
                )}

                {!stored.loading && ready && !connected && (
                    <p className="text-xs text-amber-700">Save a fixture type to start categories.</p>
                )}

                {!loading && categories.length > 0 && (
                    <p className="text-xs text-gray-500 sm:ml-auto">
                        {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} · {competitors} competitor{competitors === 1 ? '' : 's'}
                    </p>
                )}

                {/* Results by scanning the winner's registration code — once there
                    is a started category for a match to be waiting in. */}
                {ready && anyStarted && (
                    <div className="sm:ml-auto sm:pl-3 sm:border-l sm:border-gray-200 flex items-center gap-2">
                        <ResultScanner formId={formId} enabled compact />
                        {/* The same, on a page of its own — for a results desk. */}
                        <Link
                            to={`${base}/scan`}
                            title="Open the scan page — a full screen just for scanning winners"
                            aria-label="Open the scan page"
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:border-regx-orange hover:text-regx-orange shrink-0"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </div>

            {/* Cards */}
            {loading && (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </div>
            )}

            {!loading && error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
            )}

            {!loading && !error && categories.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
                    <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No competitors in any category yet.</p>
                    <Link to={dataPath} className="text-sm text-regx-orange font-medium hover:underline mt-2 inline-block">
                        Back to registrations
                    </Link>
                </div>
            )}

            {!loading && !error && categories.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((group) => {
                        // A limited category draws only its first comers; the rest wait.
                        const limit = limits[group.category] ?? null;
                        const count = limit ? Math.min(group.entries.length, limit) : group.entries.length;
                        const waiting = group.entries.length - count;
                        const playable = count > 1;
                        const info = stored.stateOf(group.category);
                        const completed = info?.status === 'completed';
                        const started = info?.status === 'started' || completed;
                        const failed = info?.status === 'failed' || info?.status === 'starting';
                        const starting = busy === `start:${group.category}`;

                        return (
                            <div
                                key={group.category}
                                className={`border rounded-xl p-4 flex flex-col hover:shadow-sm transition ${
                                    completed
                                        ? 'bg-yellow-50 border-yellow-300'
                                        : started
                                        ? 'bg-green-50 border-green-300'
                                        : failed
                                          ? 'bg-white border-red-200'
                                          : 'bg-white border-gray-200 hover:border-regx-orange/40'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <h2 className="font-semibold text-gray-900 leading-snug">{group.category}</h2>
                                    {started && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[11px] font-medium shrink-0 ${completed ? 'bg-yellow-500' : 'bg-green-600'}`}>
                                            {completed ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />} {completed ? 'Completed' : 'Started'}
                                        </span>
                                    )}
                                    {failed && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-medium shrink-0">
                                            <AlertTriangle className="w-3.5 h-3.5" /> Incomplete
                                        </span>
                                    )}
                                </div>

                                {group.parts?.length > 0 && (
                                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                                        {group.parts.map((part) => (
                                            <React.Fragment key={part.label}>
                                                <dt className="text-gray-500 truncate">{part.label}</dt>
                                                <dd className="text-gray-800 font-medium truncate">{part.value}</dd>
                                            </React.Fragment>
                                        ))}
                                    </dl>
                                )}

                                <div className="mt-4 flex items-center gap-2 flex-wrap text-xs">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                                        <Users className="w-3.5 h-3.5" /> {count} competitor{count === 1 ? '' : 's'}
                                    </span>
                                    {limit && (
                                        <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600" title="Category limit — set in Limits">
                                            Limit {limit}{waiting > 0 ? ` · ${waiting} waiting` : ''}
                                        </span>
                                    )}
                                    {!playable && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700">
                                            <AlertTriangle className="w-3.5 h-3.5" /> Needs 2+ to draw
                                        </span>
                                    )}
                                    {started && info.playersSynced > 0 && (
                                        <span className="px-2 py-1 rounded-md bg-green-100 text-green-700">
                                            {info.playersSynced} in the draw
                                        </span>
                                    )}
                                    {started && info.entrants !== count && (
                                        <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700">
                                            Drawn with {info.entrants}
                                        </span>
                                    )}
                                    {/* Registered since the draw: brought in while nothing is played. */}
                                    {started && !completed && !info.walkover && count > info.entrants && (
                                        <button
                                            type="button"
                                            onClick={() => addLate(group.category, count - info.entrants)}
                                            disabled={busy !== null}
                                            title="Draw again with the late registrations — only while no match has a result"
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-regx-orange text-white font-semibold hover:opacity-90 disabled:opacity-50"
                                        >
                                            {busy === `late:${group.category}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                                            Add {count - info.entrants} late
                                        </button>
                                    )}
                                </div>

                                {failed && info?.error && (
                                    <p className="mt-3 text-xs text-red-700">{info.error}</p>
                                )}

                                <div className={`mt-4 pt-4 border-t flex justify-end gap-2 ${started ? 'border-green-200' : 'border-gray-100'}`}>
                                    {failed && (
                                        <button
                                            type="button"
                                            onClick={() => start(group.category)}
                                            disabled={busy !== null || !ready || !connected}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                                        >
                                            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Retry
                                        </button>
                                    )}
                                    {/* A drawn category can be looked at, drawn again, or thrown away. */}
                                    {(started || failed) && !completed && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => reset(group.category)}
                                                disabled={busy !== null}
                                                title="Delete the draw and start over"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors"
                                            >
                                                {busy === `reset:${group.category}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Reset
                                            </button>

                                            {started && (
                                                <button
                                                    type="button"
                                                    onClick={() => redraw(group.category)}
                                                    disabled={busy !== null || !ready}
                                                    title="Delete this draw and make a new one from everyone registered now"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange disabled:opacity-50 transition-colors"
                                                >
                                                    {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />} Redraw
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {/* Completed with its only competitor: no draw to open. */}
                                    {info?.walkover ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-yellow-800 truncate">
                                            <Medal className="w-4 h-4 shrink-0" /> Winner: {info.walkover.name}
                                        </span>
                                    ) : <>
                                    {completed && (
                                        <button
                                            type="button"
                                            onClick={() => rankingPdf(group.category, info)}
                                            disabled={busy !== null}
                                            title="Download the ranking list: 1st, 2nd, 3rd and so on"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-300 bg-white text-sm font-medium text-yellow-800 hover:bg-yellow-100 disabled:opacity-50 transition-colors"
                                        >
                                            {busy === `rank:${group.category}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Medal className="w-4 h-4" />} Ranking
                                        </button>
                                    )}

                                    {started ? (
                                        <Link
                                            to={categoryPath(group.category)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors ${completed ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'}`}
                                        >
                                            <Eye className="w-4 h-4" /> View
                                        </Link>
                                    ) : !failed && (
                                        <button
                                            type="button"
                                            onClick={() => start(group.category)}
                                            disabled={!playable || busy !== null || !ready || !connected}
                                            title={!playable ? 'Needs at least 2 competitors' : !connected ? 'Save the fixture type first' : undefined}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                        >
                                            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Start
                                        </button>
                                    )}
                                    </>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FixtureEngine;

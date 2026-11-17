import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, ChevronLeft, ChevronRight, ClipboardCheck, Loader2, RefreshCw, Search, Undo2, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

import api from '../../../services/api';
import { fetchFormsList, selectAllForms, selectFormsStatus } from '../../../store/slices/formsSlice';
import useDebouncedValue from '../../../hooks/useDebouncedValue';

const PAGE_SIZES = [10, 25, 50];

const when = (value) => {
    const date = new Date(String(value ?? '').replace(' ', 'T'));

    return Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

/**
 * Takes a picture from the device's camera, or lets a phone use its own camera
 * app through the file picker when the browser will not hand over the camera.
 */
const PhotoCapture = ({ player, onCancel, onTaken }) => {
    const video = useRef(null);
    const stream = useRef(null);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let live = true;

        if (!navigator.mediaDevices?.getUserMedia) {
            setFailed(true);
            return undefined;
        }

        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: 'user' }, audio: false })
            .then((media) => {
                if (!live) {
                    media.getTracks().forEach((track) => track.stop());
                    return;
                }

                stream.current = media;
                video.current.srcObject = media;
                setReady(true);
            })
            .catch(() => setFailed(true));

        return () => {
            live = false;
            stream.current?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    const snap = () => {
        const { videoWidth: w, videoHeight: h } = video.current;
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1024 / Math.max(w, h));

        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        canvas.getContext('2d').drawImage(video.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => blob && onTaken(blob), 'image/jpeg', 0.85);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true">
            <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{player.participant || 'Player'}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{player.reference}</p>
                    </div>
                    <button type="button" onClick={onCancel} aria-label="Close" className="p-1.5 text-gray-400 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {!failed && (
                        <div className="relative aspect-[4/3] rounded-xl bg-gray-900 overflow-hidden">
                            <video ref={video} autoPlay playsInline muted className="w-full h-full object-cover" />
                            {!ready && (
                                <div className="absolute inset-0 grid place-items-center text-gray-300">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            )}
                        </div>
                    )}

                    {failed && (
                        <p className="text-sm text-gray-600">
                            The camera is not available here. Use your device&apos;s camera app instead:
                        </p>
                    )}

                    <div className="flex gap-2">
                        {!failed && (
                            <button
                                type="button"
                                onClick={snap}
                                disabled={!ready}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-regx-orange text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
                            >
                                <Camera className="w-4 h-4" /> Take photo &amp; mark present
                            </button>
                        )}

                        <label className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                capture="user"
                                className="sr-only"
                                onChange={(e) => e.target.files?.[0] && onTaken(e.target.files[0])}
                            />
                            {failed ? 'Open camera' : 'Choose a file'}
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

/** The attendance desk for one form: who is registered, and who has arrived. */
const AttendanceDesk = ({ form, onBack }) => {
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('all');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [state, setState] = useState({ loading: true, rows: [], meta: null });
    const [busy, setBusy] = useState(null);
    const [capturing, setCapturing] = useState(null);
    const [enlarged, setEnlarged] = useState(null);
    const [refresh, setRefresh] = useState(0);

    const term = useDebouncedValue(search.trim(), 800);

    useEffect(() => {
        let live = true;

        setState((current) => ({ ...current, loading: true }));

        api.get(`/forms/${form.id}/submissions`, {
            params: { slim: 1, page, perPage, search: term || undefined, attended: tab === 'in' ? 'yes' : tab === 'out' ? 'no' : undefined },
        })
            .then((response) => live && setState({ loading: false, rows: response.data ?? [], meta: response.meta ?? null }))
            .catch(() => {
                if (live) setState((current) => ({ ...current, loading: false }));
                toast.error('Failed to load players');
            });

        return () => {
            live = false;
        };
    }, [form.id, page, perPage, term, tab, refresh]);

    /** Marks one player (present or absent), with a photo if one was taken. */
    const mark = useCallback(async (row, present, photo = null) => {
        setBusy(row.id);

        try {
            const body = new FormData();
            body.append('present', present ? '1' : '0');
            if (photo) body.append('photo', photo, 'attendance.jpg');

            const response = await api.post(`/forms/${form.id}/submissions/${row.id}/attendance`, body);

            toast.success(response.message || 'Saved');
            setRefresh((n) => n + 1);
        } catch (error) {
            toast.error(error?.response?.data?.messages?.photo || error?.response?.data?.message || 'Could not save attendance');
        } finally {
            setBusy(null);
            setCapturing(null);
        }
    }, [form.id]);

    const { rows, meta, loading } = state;
    const total = meta?.total ?? 0;
    const pages = meta?.pages ?? 1;
    const tabs = [['all', 'All'], ['out', 'Not arrived'], ['in', 'Present']];

    return (
        <div>
            <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <button type="button" onClick={onBack} aria-label="Back to the forms" className="w-9 h-9 rounded-xl bg-white border border-gray-200 grid place-items-center text-gray-600 hover:bg-gray-50 shrink-0">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 truncate">{form.name}</h2>
                        <p className="text-xs text-gray-500">
                            {form.event_name ? `${form.event_name} · ` : ''}
                            {meta?.attended ?? 0} present of {form.submission_count ?? total}
                        </p>
                    </div>
                </div>

                <button type="button" onClick={() => setRefresh((n) => n + 1)} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 shrink-0">
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative w-full md:max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search name, email, mobile or reference…"
                            aria-label="Search players"
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-regx-orange/20 focus:border-regx-orange"
                        />
                    </div>

                    <div className="flex gap-1.5" role="tablist">
                        {tabs.map(([key, label]) => (
                            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${tab === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading && rows.length === 0 ? (
                    <div className="p-5 space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}</div>
                ) : rows.length === 0 ? (
                    <div className="py-14 text-center">
                        <ClipboardCheck className="w-8 h-8 mx-auto text-gray-300" />
                        <p className="mt-3 text-sm font-semibold text-gray-900">{search ? 'No player matches' : 'Nobody in this list'}</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {rows.map((row) => {
                            const here = Boolean(row.attendance?.at);
                            const working = busy === row.id;

                            return (
                                <li key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-gray-50/70">
                                    <button
                                        type="button"
                                        onClick={() => row.attendance?.photoUrl && setEnlarged(row)}
                                        className="w-11 h-11 rounded-xl bg-gray-100 grid place-items-center overflow-hidden shrink-0"
                                        aria-label={row.attendance?.photoUrl ? 'View photo' : undefined}
                                    >
                                        {row.attendance?.photoUrl ? (
                                            <img src={row.attendance.photoUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserRound className="w-5 h-5 text-gray-400" />
                                        )}
                                    </button>

                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{row.participant || 'Unnamed player'}</p>
                                        <p className="text-[11px] text-gray-400 font-mono">
                                            {row.reference}
                                            {row.phone ? ` · ${row.phone}` : ''}
                                        </p>
                                    </div>

                                    {here ? (
                                        <span className="inline-flex flex-col items-end">
                                            <span className="inline-flex px-2 py-1 rounded-md border border-green-200 bg-green-50 text-[11px] font-semibold text-green-700">Present</span>
                                            <span className="text-[10px] text-gray-400">{when(row.attendance.at)}</span>
                                        </span>
                                    ) : (
                                        <span className="inline-flex px-2 py-1 rounded-md border border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-700">Not arrived</span>
                                    )}

                                    <div className="flex items-center gap-2">
                                        {here ? (
                                            <button type="button" disabled={working} onClick={() => mark(row, false)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-red-300 hover:text-red-600 disabled:opacity-50">
                                                {working ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />} Undo
                                            </button>
                                        ) : (
                                            <button type="button" disabled={working} onClick={() => mark(row, true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
                                                {working ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Mark present
                                            </button>
                                        )}

                                        <button type="button" disabled={working} onClick={() => setCapturing(row)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:border-regx-orange hover:text-regx-orange disabled:opacity-50">
                                            <Camera className="w-3.5 h-3.5" /> {row.attendance?.photoUrl ? 'Retake' : 'Photo'}
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {total > 0 && (
                    <div className="px-5 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                            <span>{meta?.from ?? 0}–{meta?.to ?? 0} of {total}</span>
                            <label className="flex items-center gap-1.5">
                                Rows
                                <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="border border-gray-200 rounded-md px-1.5 py-1 text-xs bg-white">
                                    {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                                </select>
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={(meta?.page ?? 1) <= 1 || loading} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                                <ChevronLeft className="w-3.5 h-3.5" /> Previous
                            </button>
                            <span className="tabular-nums">Page {meta?.page ?? 1} of {pages}</span>
                            <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={(meta?.page ?? 1) >= pages || loading} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                                Next <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {capturing && (
                <PhotoCapture player={capturing} onCancel={() => setCapturing(null)} onTaken={(blob) => mark(capturing, true, blob)} />
            )}

            {enlarged && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setEnlarged(null)}>
                    <img src={enlarged.attendance.photoUrl} alt={enlarged.participant} className="max-h-[85vh] max-w-full rounded-xl" />
                </div>
            )}
        </div>
    );
};

/** Attendance: pick a form, then mark who has arrived — with or without a photo. */
const Attendance = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const forms = useSelector(selectAllForms);
    const status = useSelector(selectFormsStatus);
    const [selectedId, setSelectedId] = useState(null);

    const loading = status === 'idle' || status === 'loading';

    const load = (force = false) =>
        dispatch(fetchFormsList({ force })).catch((message) => toast.error(message || 'Failed to load registration forms'));

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    const usable = useMemo(() => (forms || []).filter((form) => form.status !== 'archived'), [forms]);
    const selected = usable.find((form) => form.id === selectedId) ?? null;

    if (selected) {
        return (
            <div className="max-w-5xl mx-auto">
                <AttendanceDesk form={selected} onBack={() => setSelectedId(null)} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                    <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="w-9 h-9 rounded-xl bg-white border border-gray-200 grid place-items-center text-gray-600 hover:bg-gray-50 shrink-0">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <ClipboardCheck className="w-5 h-5 text-regx-orange" />
                            <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">Choose a form, then mark who has arrived — just tick them, or take their photo.</p>
                    </div>
                </div>

                <button type="button" onClick={() => load(true)} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 shrink-0">
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-5 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}</div>
                ) : usable.length === 0 ? (
                    <p className="p-10 text-center text-sm text-gray-500">No registration forms yet.</p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {usable.map((form) => (
                            <li key={form.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                                <div className="min-w-0">
                                    <h3 className="text-sm font-semibold text-gray-900 truncate">{form.name}</h3>
                                    <p className="mt-0.5 text-xs text-gray-500 truncate">
                                        {[form.event_name, form.submission_count != null && `${form.submission_count} registration${form.submission_count === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                                    </p>
                                </div>

                                <button type="button" onClick={() => setSelectedId(form.id)} className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-xs font-semibold hover:bg-orange-600">
                                    Take attendance <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default Attendance;

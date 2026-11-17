import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Loader2, Save, Upload, Plus, Trash2, Type, AlignLeft,
    AlignCenter, AlignRight, Info, Image as ImageIcon, RotateCw, Copy, Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useRouteIds } from '../../shared/utils/ids';

const control =
    'w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none';

/**
 * Laying out a certificate or an ID card.
 *
 * Both are the same machinery — a picture with fields written onto it — and
 * differ mainly in size. So this one screen does both: choose how big the
 * finished thing is, upload the artwork, then drag each field onto it.
 *
 * Positions are kept as a percentage of the page rather than in pixels, which
 * is the only thing that stays true between a preview 600px wide and a render
 * at print resolution. It also means changing the page size never slides a
 * layout off the edge.
 *
 * The fields on offer are the questions people actually answered on the form
 * this collection is attached to — plus the handful the certificate service
 * produces itself, which no one fills in.
 */

/** Produced when the certificate is made, rather than answered by anyone. */
const SERVICE_KEYS = [
    { key: 'certificate_number', label: 'Certificate number' },
    { key: 'issue_date', label: 'Issue date' },
];

/**
 * What a field is printed as.
 *
 * A code carries the same value as the text would — a reference, a pass
 * number — drawn so a scanner can read it instead of a person. Which is why
 * this is a property of an ordinary field rather than a separate kind of
 * thing to place: an ID card's QR square is its reference, in another form.
 */
const KINDS = [
    { value: 'text', label: 'Text' },
    { value: 'qrcode', label: 'QR code' },
    { value: 'barcode', label: 'Barcode' },
    { value: 'image', label: 'Photo' },
];

/** Sensible starting sizes, as a percentage of the artwork. */
const CODE_DEFAULTS = {
    qrcode: { w: 18, h: 18 },
    barcode: { w: 40, h: 12 },
    image: { w: 25, h: 35 },
};

const FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New'];
const BARCODE_SYMBOLOGIES = [
    ['C128', 'Code 128'],
    ['C39', 'Code 39'],
    ['C93', 'Code 93'],
    ['I25', 'Interleaved 2 of 5'],
    ['EAN13', 'EAN-13'],
    ['EAN8', 'EAN-8'],
    ['UPCA', 'UPC-A'],
    ['CODABAR', 'Codabar'],
];

const displayPreviewValue = (variable, data) => {
    const sample = data[variable.kind === 'qrcode' || variable.kind === 'barcode'
        ? variable.sourceKey || variable.var_key
        : variable.var_key];

    if ((variable.kind === 'qrcode' || variable.kind === 'barcode') && variable.payloadMode === 'custom') {
        return variable.payload || 'Enter code value';
    }

    if (variable.kind === 'text' && (sample === '' || sample === undefined || sample === null) && variable.fallback?.trim()) {
        return variable.fallback.trim();
    }

    if (sample !== undefined && sample !== null && typeof sample !== 'object') {
        return String(sample);
    }

    if (variable.var_key === 'certificate_number') return 'CERT-20261020-0001';
    if (variable.var_key === 'issue_date') return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    if (variable.var_key === 'reference') return 'REGX-0001';
    if (variable.var_key === 'email') return 'alex@example.com';
    if (variable.var_key === 'name') return 'Alex Morgan';

    return variable.label || variable.var_key;
};

const IdCardCertificateSetup = () => {
    const { collectionId } = useRouteIds();
    const navigate = useNavigate();

    const [collection, setCollection] = useState(null);
    const [dataKeys, setDataKeys] = useState([]);
    const [imageKeys, setImageKeys] = useState([]);
    const [previewData, setPreviewData] = useState({});
    const [previewWidth, setPreviewWidth] = useState(0);
    const [keysAt, setKeysAt] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [pageSizes, setPageSizes] = useState({});
    const [page, setPage] = useState({ size: 'a4', orientation: 'landscape', width: 297, height: 210 });
    const [variables, setVariables] = useState([]);
    const [selected, setSelected] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [togglingEmail, setTogglingEmail] = useState(false);

    /** Saved straight away — it is a switch, not part of the layout. */
    const toggleEmail = async (enabled) => {
        setTogglingEmail(true);

        try {
            const res = await api.put(`/certificates/${collectionId}/email`, { enabled });
            setCollection((c) => ({ ...c, emailEnabled: enabled }));
            toast.success(res.message || (enabled ? 'Emailing turned on.' : 'Emailing turned off.'));
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not change the email setting.');
        } finally {
            setTogglingEmail(false);
        }
    };
    const [savingSplit, setSavingSplit] = useState(false);

    /**
     * One certificate per player listing all their categories, or one per
     * category. Saved straight away; the preview follows so the layout shows
     * what will print.
     */
    const changeSplit = async (split) => {
        if (split === collection?.split) return;

        setSavingSplit(true);

        try {
            const res = await api.put(`/certificates/${collectionId}/split`, { split });
            setCollection((c) => ({ ...c, split }));
            if (res.data?.previewData) setPreviewData(res.data.previewData);
            toast.success(res.message || 'Saved.');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not change how certificates are made.');
        } finally {
            setSavingSplit(false);
        }
    };

    const [uploading, setUploading] = useState(false);

    const canvas = useRef(null);
    const dragging = useRef(null);

    /**
     * Works the field list out again.
     *
     * The keys are cached because deriving them reads every registration on the
     * form. That is right almost always, and wrong exactly once: just after
     * somebody adds a question. Hence a button rather than doing it every time.
     */
    const refreshKeys = async () => {
        setRefreshing(true);

        try {
            const setup = await api.get(`/certificates/${collectionId}/variables?refresh=1`);

            setDataKeys(setup.data?.dataKeys ?? []);
            setImageKeys(setup.data?.imageKeys ?? []);
            setPreviewData(setup.data?.previewData ?? {});
            setKeysAt(setup.data?.keysAt ?? null);
            toast.success('Fields updated from the form.');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not read the form.');
        } finally {
            setRefreshing(false);
        }
    };

    const load = useCallback(async () => {
        setLoading(true);

        try {
            const setup = await api.get(`/certificates/${collectionId}/variables`);

            setCollection({
                name: setup.data?.name ?? null,
                type: setup.data?.type ?? 1,
                template_url: setup.data?.templateUrl ?? null,
                emailEnabled: Boolean(setup.data?.emailEnabled),
                split: setup.data?.split ?? 'player',
            });
            setDataKeys(setup.data?.dataKeys ?? []);
            setImageKeys(setup.data?.imageKeys ?? []);
            setPreviewData(setup.data?.previewData ?? {});
            setKeysAt(setup.data?.keysAt ?? null);
            setPageSizes(setup.data?.pageSizes ?? {});

            if (setup.data?.page) setPage(setup.data.page);

            setVariables(
                (setup.data?.variables ?? []).map((v) => {
                    const kind = v.options?.kind || 'text';

                    return {
                        placementId: v.options?.placement_id || `saved-${v.id ?? crypto.randomUUID()}`,
                        var_key: v.var_key,
                        label: v.label || v.var_key,
                        x: Number(v.x) || 0,
                        y: Number(v.y) || 0,
                        font_size: Number(v.font_size) || 18,
                        font_family: v.font_family || 'Arial',
                        color: v.color || '#111827',
                        align: v.align || 'left',
                        kind,
                        fit: v.options?.fit === 'cover' ? 'cover' : 'contain',
                        payloadMode: v.options?.payload_mode === 'custom' ? 'custom' : 'field',
                        payload: String(v.options?.payload ?? ''),
                        sourceKey: v.options?.source_key || v.var_key,
                        qrLevel: ['L', 'M', 'Q', 'H'].includes(v.options?.level) ? v.options.level : 'M',
                        symbology: BARCODE_SYMBOLOGIES.some(([code]) => code === v.options?.symbology)
                            ? v.options.symbology
                            : 'C128',
                        showText: Boolean(v.options?.show_text),
                        fallback: String(v.options?.fallback ?? ''),
                        w: Number(v.options?.w) || CODE_DEFAULTS[kind]?.w || CODE_DEFAULTS.qrcode.w,
                        h: Number(v.options?.h) || CODE_DEFAULTS[kind]?.h || CODE_DEFAULTS.qrcode.h,
                    };
                })
            );
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not load this collection.');
        } finally {
            setLoading(false);
        }
    }, [collectionId]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!canvas.current || typeof ResizeObserver === 'undefined') return undefined;

        const observer = new ResizeObserver(([entry]) => {
            setPreviewWidth(entry.contentRect.width);
        });
        observer.observe(canvas.current);

        return () => observer.disconnect();
    }, [loading, collection?.template_url, page.width, page.height]);

    // ------------------------------------------------------------- editing

    const add = (key, label, kind = 'text') => {
        const duplicateCount = variables.filter((v) => v.var_key === key).length;
        const placementId = crypto.randomUUID();
        setVariables((current) => [
            ...current,
            {
                placementId,
                var_key: key,
                label: label || key,
                // Dropped in the middle: a marker at 0,0 is easy to miss and
                // awkward to grab.
                x: Math.min(95, 50 + duplicateCount * 3),
                y: Math.min(95, 50 + duplicateCount * 3),
                font_size: 18,
                font_family: 'Arial',
                color: '#111827',
                align: 'left',
                kind,
                fit: kind === 'image' ? 'cover' : 'contain',
                payloadMode: 'field',
                payload: '',
                sourceKey: key,
                qrLevel: 'M',
                symbology: 'C128',
                showText: false,
                fallback: '',
                w: CODE_DEFAULTS[kind]?.w || CODE_DEFAULTS.qrcode.w,
                h: CODE_DEFAULTS[kind]?.h || CODE_DEFAULTS.qrcode.h,
            },
        ]);

        setSelected(placementId);
    };

    const duplicatePlacement = (variable) => {
        const placementId = crypto.randomUUID();
        setVariables((current) => [
            ...current,
            {
                ...variable,
                placementId,
                x: Math.min(100, variable.x + 3),
                y: Math.min(100, variable.y + 3),
            },
        ]);
        setSelected(placementId);
    };

    const update = (placementId, patch) =>
        setVariables((current) => current.map((v) => (v.placementId === placementId ? { ...v, ...patch } : v)));

    const remove = (placementId) => {
        setVariables((current) => current.filter((v) => v.placementId !== placementId));

        if (selected === placementId) setSelected(null);
    };

    const startDrag = (placementId) => (event) => {
        event.preventDefault();
        dragging.current = placementId;
        setSelected(placementId);
    };

    const onMove = (event) => {
        if (!dragging.current || !canvas.current) return;

        const box = canvas.current.getBoundingClientRect();

        update(dragging.current, {
            x: Math.round(Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100)) * 100) / 100,
            y: Math.round(Math.min(100, Math.max(0, ((event.clientY - box.top) / box.height) * 100)) * 100) / 100,
        });
    };

    const endDrag = () => {
        dragging.current = null;
    };

    // -------------------------------------------------------------- saving

    const savePage = async (next) => {
        setPage(next);

        try {
            const result = await api.put(`/certificates/${collectionId}/page`, {
                size: next.size,
                orientation: next.orientation,
                width: next.width,
                height: next.height,
            });

            if (result.data?.page) setPage(result.data.page);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not save the size.');
        }
    };

    const saveLayout = async () => {
        if (variables.length === 0) {
            toast.error('Put at least one field on the template first.');

            return;
        }

        setSaving(true);

        try {
            const result = await api.put(`/certificates/${collectionId}/variables`, {
                // The kind and the code's size travel in options, which is
                // where the certificate service keeps anything that is not
                // one of its own columns.
                variables: variables.map((variable, index) => {
                    const {
                        placementId, kind, w, h, fit, payloadMode, payload, sourceKey,
                        qrLevel, symbology, showText, fallback, ...v
                    } = variable;

                    return {
                        ...v,
                        order_index: index,
                        options: {
                            kind,
                            placement_id: placementId,
                            ...(kind === 'image' ? { fit } : {}),
                            // Printed when the recipient has no value for this field.
                            ...(kind === 'text' && fallback.trim() ? { fallback: fallback.trim() } : {}),
                            ...(kind === 'qrcode' || kind === 'barcode'
                                ? {
                                    payload_mode: payloadMode,
                                    payload,
                                    source_key: sourceKey,
                                    level: qrLevel,
                                    symbology,
                                    show_text: showText,
                                }
                                : {}),
                            ...(kind !== 'text' ? { w, h } : {}),
                        },
                    };
                }),
            });

            toast.success(result.message || 'Layout saved.');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not save the layout.');
        } finally {
            setSaving(false);
        }
    };

    const changeTemplate = async (file) => {
        if (!file) return;

        setUploading(true);

        const body = new FormData();
        body.append('template', file);

        try {
            await api.post(`/certificates/${collectionId}/template`, body);
            toast.success('Template uploaded.');
            load();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not upload the template.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
        );
    }

    const template = collection?.template_url || collection?.template_path || null;
    const current = variables.find((v) => v.placementId === selected) ?? null;
    const selectableDataKeys = [...new Set([...dataKeys, ...SERVICE_KEYS.map(({ key }) => key)])];
    const isCard = Number(collection?.type) === 2;

    return (
        <div className="space-y-5 pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => navigate('/dashboard/certificates')}
                        aria-label="Back to collections"
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-gray-900 font-display truncate">
                            {collection?.name ?? 'Layout'}
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {isCard ? 'ID card' : 'Certificate'} · drag each field onto the artwork to
                            say where it prints.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                    {/* A player in several categories: one certificate for all, or one each. */}
                    <div
                        role="radiogroup"
                        aria-label="Certificates per"
                        className="inline-flex items-center rounded-lg border border-gray-300 p-0.5 text-sm font-medium"
                        title="A player with several categories gets one certificate listing them all, or one certificate per category"
                    >
                        {[['player', 'By player'], ['category', 'By category']].map(([value, label]) => {
                            const active = (collection?.split ?? 'player') === value;

                            return (
                                <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() => changeSplit(value)}
                                    disabled={!collection || savingSplit}
                                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors disabled:opacity-60 ${
                                        active ? 'bg-regx-orange text-white' : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    {savingSplit && !active && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Turning this on adds "Send to users" to the collection's menu. */}
                    <label
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            collection?.emailEnabled ? 'border-regx-orange bg-orange-50 text-regx-orange' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                        title="Let this collection be emailed to each recipient"
                    >
                        <input
                            type="checkbox"
                            checked={Boolean(collection?.emailEnabled)}
                            disabled={!collection || togglingEmail}
                            onChange={(e) => toggleEmail(e.target.checked)}
                            className="w-4 h-4 accent-regx-orange"
                        />
                        <Mail className="w-4 h-4" />
                        Send by email
                    </label>

                    <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {template ? 'Replace artwork' : 'Upload artwork'}
                        <input
                            type="file"
                            className="hidden"
                            accept=".png,.jpg,.jpeg,.svg,.pdf"
                            onChange={(e) => {
                                changeTemplate(e.target.files?.[0]);
                                e.target.value = '';
                            }}
                        />
                    </label>

                    <button
                        onClick={saveLayout}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 bg-regx-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving…' : 'Save layout'}
                    </button>
                </div>
            </div>

            {/* How big it is */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-end gap-4">
                <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Size</label>
                    <select
                        className={`${control} min-w-[170px]`}
                        value={page.size}
                        onChange={(e) => {
                            const size = e.target.value;
                            const known = pageSizes[size];

                            savePage({
                                ...page,
                                size,
                                width: known ? known.width : page.width,
                                height: known ? known.height : page.height,
                            });
                        }}
                    >
                        {Object.entries(pageSizes).map(([value, meta]) => (
                            <option key={value} value={value}>
                                {meta.label} — {meta.width} × {meta.height} mm
                            </option>
                        ))}
                        <option value="custom">Custom…</option>
                    </select>
                </div>

                {page.size === 'custom' && (
                    <>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">Width (mm)</label>
                            <input
                                type="number"
                                min="20"
                                max="2000"
                                className={`${control} w-28`}
                                value={page.width}
                                onChange={(e) => setPage({ ...page, width: Number(e.target.value) })}
                                onBlur={() => savePage(page)}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">Height (mm)</label>
                            <input
                                type="number"
                                min="20"
                                max="2000"
                                className={`${control} w-28`}
                                value={page.height}
                                onChange={(e) => setPage({ ...page, height: Number(e.target.value) })}
                                onBlur={() => savePage(page)}
                            />
                        </div>
                    </>
                )}

                <button
                    type="button"
                    onClick={() =>
                        savePage({
                            ...page,
                            orientation: page.orientation === 'portrait' ? 'landscape' : 'portrait',
                            width: page.height,
                            height: page.width,
                        })
                    }
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors"
                >
                    <RotateCw className="w-3.5 h-3.5" />
                    {page.orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                </button>

                <p className="text-[11px] text-gray-500 ml-auto max-w-sm">
                    Changing the size never moves anything: positions are held as a share of the page,
                    so a layout follows whatever it is printed on.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* What can go on it */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 h-fit">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Fields you can place
                        </p>

                        <button
                            type="button"
                            onClick={refreshKeys}
                            disabled={refreshing}
                            title="Read the form again — use this after adding a question to it"
                            className="p-1 rounded text-gray-400 hover:text-regx-orange disabled:opacity-40"
                        >
                            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <p className="text-[11px] text-gray-500 mb-2">
                        Click a field again to add another placement, then choose its type.
                    </p>

                    {dataKeys.length === 0 ? (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                            No data keys yet. Attach a form to this collection, or upload a sheet, and
                            the answers become fields you can print.
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {dataKeys.map((key) => (
                                <KeyButton
                                    key={key}
                                    label={key}
                                    used={variables.some((v) => v.var_key === key)}
                                    title={variables.some((v) => v.var_key === key)
                                        ? `Add another ${key} placement`
                                        : `Add ${key}`}
                                    onClick={() => add(key, key, imageKeys.includes(key) ? 'image' : 'text')}
                                />
                            ))}
                        </div>
                    )}

                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mt-5 mb-2">
                        Added when printed
                    </p>

                    <div className="space-y-1">
                        {SERVICE_KEYS.map((item) => (
                            <KeyButton
                                key={item.key}
                                label={item.label}
                                used={variables.some((v) => v.var_key === item.key)}
                                title={variables.some((v) => v.var_key === item.key)
                                    ? `Add another ${item.label} placement`
                                    : `Add ${item.label}`}
                                onClick={() => add(item.key, item.label)}
                            />
                        ))}
                    </div>

                    <p className="text-[11px] text-gray-500 flex items-start gap-1.5 mt-4">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-px text-gray-400" />
                        <span>These are generated for each card, but print only after you add and position them.</span>
                    </p>
                </div>

                {/* The artwork */}
                <div className="lg:col-span-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                    <div
                        ref={canvas}
                        onPointerMove={onMove}
                        onPointerUp={endDrag}
                        onPointerLeave={endDrag}
                        className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50 select-none"
                        // The real shape of the page, so what is on screen is
                        // what comes out of the printer.
                        style={{ aspectRatio: `${page.width} / ${page.height}` }}
                    >
                        {template ? (
                            <img src={template} alt="" className="absolute inset-0 w-full h-full object-contain" />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                                <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                                <p className="text-sm text-gray-500">No artwork yet</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Upload the design these are printed on, then drag fields onto it.
                                </p>
                            </div>
                        )}

                        {variables.map((v) => {
                            const sample = previewData[v.var_key];
                            const samplePhoto = v.kind === 'image' && sample?._type === 'image'
                                ? sample
                                : null;
                            const previewFontSize = v.font_size * (25.4 / 72) * (previewWidth / Math.max(1, page.width));

                            return (
                                <button
                                    key={v.placementId}
                                    type="button"
                                    onPointerDown={startDrag(v.placementId)}
                                    onClick={() => setSelected(v.placementId)}
                                    style={{
                                        left: `${v.x}%`,
                                        top: `${v.y}%`,
                                        color: v.color,
                                        fontFamily: v.font_family === 'Georgia' ? 'Times New Roman' : v.font_family,
                                        fontSize: `${previewFontSize}px`,
                                        lineHeight: 1,
                                        transform: `translate(${
                                            v.kind === 'image'
                                                ? '-50%'
                                                : v.align === 'center' ? '-50%' : v.align === 'right' ? '-100%' : '0'
                                        }, -50%)`,
                                    }}
                                    className={`absolute whitespace-nowrap rounded cursor-move ${
                                        selected === v.placementId
                                            ? 'ring-2 ring-regx-orange bg-orange-50/80'
                                            : 'ring-1 ring-gray-300/70 hover:ring-gray-400'
                                    }`}
                                    title={`${v.label}: ${v.kind === 'image' ? 'Photo placement' : displayPreviewValue(v, previewData)}`}
                                >
                                    {v.kind === 'text' ? (
                                        // Empty for this sample (no result, say): show the field's
                                        // name so there is something to see and drag.
                                        displayPreviewValue(v, previewData) || (
                                            <span className="italic opacity-50">[{v.label || v.var_key}]</span>
                                        )
                                    ) : (
                                        <span
                                            className="relative flex items-center justify-center overflow-hidden text-[9px] text-gray-600"
                                            style={{
                                                width: `${(v.w / 100) * previewWidth}px`,
                                                height: `${(v.h / 100) * previewWidth * (page.height / page.width)}px`,
                                                minWidth: 14,
                                                minHeight: 10,
                                                backgroundImage: samplePhoto?.url
                                                    ? undefined
                                                    : 'repeating-linear-gradient(45deg, rgba(17,24,39,.12) 0 3px, transparent 3px 6px)',
                                                border: '1px solid rgba(17,24,39,.35)',
                                            }}
                                        >
                                            {samplePhoto?.url ? (
                                                <img
                                                    src={samplePhoto.url}
                                                    alt=""
                                                    draggable="false"
                                                    className="absolute inset-0 w-full h-full"
                                                    style={{ objectFit: v.fit }}
                                                />
                                            ) : (
                                                v.kind === 'qrcode' ? 'QR' : v.kind === 'barcode' ? '|||' : 'PHOTO'
                                            )}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-[11px] text-gray-500 mt-2">
                        {page.width} × {page.height} mm · {variables.length} field
                        {variables.length === 1 ? '' : 's'} placed
                    </p>
                </div>

                {/* Everything placed, and how the chosen one looks */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                            On the artwork
                        </p>

                        {variables.length === 0 ? (
                            <p className="text-xs text-gray-400">Nothing placed yet.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {variables.map((v) => (
                                    <div
                                        key={v.placementId}
                                        onClick={() => setSelected(v.placementId)}
                                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                                            selected === v.placementId
                                                ? 'border-regx-orange bg-orange-50/50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className="text-xs text-gray-800 truncate flex-1" title={v.var_key}>
                                            {v.label} · {v.kind === 'qrcode' ? 'QR' : v.kind === 'barcode' ? 'Barcode' : v.kind === 'image' ? 'Photo' : 'Text'}
                                        </span>

                                        <Coord
                                            label="X"
                                            value={v.x}
                                            onChange={(n) => update(v.placementId, { x: n })}
                                        />
                                        <Coord
                                            label="Y"
                                            value={v.y}
                                            onChange={(n) => update(v.placementId, { y: n })}
                                        />

                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); remove(v.placementId); }}
                                            aria-label={`Remove ${v.label}`}
                                            className="p-1 rounded text-gray-400 hover:text-red-600 shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {current !== null && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{current.label}</p>
                                <p className="text-[11px] text-gray-400 font-mono truncate">{current.var_key}</p>
                            </div>

                            <Row label="Printed as">
                                <select
                                    className={control}
                                    value={current.kind}
                                    onChange={(e) => {
                                        const kind = e.target.value;

                                        update(current.placementId, {
                                            kind,
                                            // A square for a QR code, a wide
                                            // strip for a barcode — sizes a
                                            // scanner can actually read.
                                            ...(kind === 'text' ? {} : CODE_DEFAULTS[kind]),
                                            ...(kind === 'image' ? { fit: 'cover' } : {}),
                                            ...(kind === 'qrcode' || kind === 'barcode'
                                                ? {
                                                    sourceKey: current.var_key,
                                                    payloadMode: 'field',
                                                    ...(kind === 'qrcode' ? { qrLevel: 'M' } : { symbology: 'C128', showText: false }),
                                                }
                                                : {}),
                                        });
                                    }}
                                >
                                    {KINDS.filter((kind) => {
                                        if (kind.value === 'image') {
                                            return imageKeys.includes(current.var_key) || current.kind === 'image';
                                        }

                                        if ((kind.value === 'qrcode' || kind.value === 'barcode') && imageKeys.includes(current.var_key)) {
                                            return current.kind === kind.value;
                                        }

                                        return true;
                                    }).map((k) => (
                                        <option key={k.value} value={k.value}>{k.label}</option>
                                    ))}
                                </select>
                            </Row>

                            {current.kind === 'image' && (
                                <>
                                    <p className="text-[11px] text-gray-500 -mt-1">
                                        Preview uses the first real submission photo when available. X/Y mark the centre of this frame.
                                    </p>
                                    <Row label="Photo fit">
                                        <select
                                            className={control}
                                            value={current.fit}
                                            onChange={(e) => update(current.placementId, { fit: e.target.value })}
                                        >
                                            <option value="cover">Fill frame (crop edges)</option>
                                            <option value="contain">Fit whole photo (may leave empty space)</option>
                                        </select>
                                    </Row>
                                </>
                            )}
                            {(current.kind === 'qrcode' || current.kind === 'barcode') && (
                                <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                                    <p className="text-[11px] text-gray-600">
                                        This placement creates a real scannable code in the generated PDF.
                                    </p>
                                    <Row label="Value to encode">
                                        <select
                                            className={control}
                                            value={current.payloadMode}
                                            onChange={(e) => update(current.placementId, { payloadMode: e.target.value })}
                                        >
                                            <option value="field">Use a recipient field</option>
                                            <option value="custom">Use a fixed value</option>
                                        </select>
                                    </Row>
                                    {current.payloadMode === 'field' ? (
                                        <Row label="Recipient field">
                                            <select
                                                className={control}
                                                value={current.sourceKey}
                                                onChange={(e) => update(current.placementId, { sourceKey: e.target.value })}
                                            >
                                                {selectableDataKeys.map((key) => (
                                                    <option key={key} value={key}>{key}</option>
                                                ))}
                                            </select>
                                        </Row>
                                    ) : (
                                        <Row label="Fixed value">
                                            <textarea
                                                className={`${control} min-h-20 resize-y`}
                                                value={current.payload}
                                                maxLength={2000}
                                                onChange={(e) => update(current.placementId, { payload: e.target.value })}
                                                placeholder="URL, registration number, or other text"
                                            />
                                        </Row>
                                    )}
                                    {current.kind === 'qrcode' ? (
                                        <Row label="Error correction">
                                            <select
                                                className={control}
                                                value={current.qrLevel}
                                                onChange={(e) => update(current.placementId, { qrLevel: e.target.value })}
                                            >
                                                <option value="L">Low (7%)</option>
                                                <option value="M">Medium (15%)</option>
                                                <option value="Q">Quartile (25%)</option>
                                                <option value="H">High (30%)</option>
                                            </select>
                                        </Row>
                                    ) : (
                                        <>
                                            <Row label="Barcode format">
                                                <select
                                                    className={control}
                                                    value={current.symbology}
                                                    onChange={(e) => update(current.placementId, { symbology: e.target.value })}
                                                >
                                                    {BARCODE_SYMBOLOGIES.map(([code, label]) => (
                                                        <option key={code} value={code}>{label}</option>
                                                    ))}
                                                </select>
                                            </Row>
                                            <label className="flex items-center gap-2 text-xs text-gray-700">
                                                <input
                                                    type="checkbox"
                                                    checked={current.showText}
                                                    onChange={(e) => update(current.placementId, { showText: e.target.checked })}
                                                />
                                                Print encoded value under barcode
                                            </label>
                                        </>
                                    )}
                                </div>
                            )}

                            {current.kind !== 'image' && (
                                <Row label="What it says">
                                    <input
                                        className={control}
                                        value={current.label}
                                        onChange={(e) => update(current.placementId, { label: e.target.value })}
                                    />
                                </Row>
                            )}

                            {current.kind === 'text' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Row label="Font size (pt)">
                                            <input
                                                type="number"
                                                min="1"
                                                max="120"
                                                step="0.5"
                                                className={control}
                                                value={current.font_size}
                                                onChange={(e) => update(current.placementId, { font_size: Number(e.target.value) })}
                                            />
                                        </Row>
                                        <Row label="Colour">
                                            <input
                                                type="color"
                                                className="w-full h-[34px] border border-gray-300 rounded-lg cursor-pointer"
                                                value={current.color}
                                                onChange={(e) => update(current.placementId, { color: e.target.value })}
                                            />
                                        </Row>
                                    </div>

                                    <Row label="Font">
                                        <select
                                            className={control}
                                            value={current.font_family}
                                            onChange={(e) => update(current.placementId, { font_family: e.target.value })}
                                        >
                                            {FONTS.map((font) => (
                                                <option key={font} value={font}>{font}</option>
                                            ))}
                                        </select>
                                    </Row>

                                    <Row label="Default when empty">
                                        <input
                                            className={control}
                                            value={current.fallback}
                                            maxLength={120}
                                            placeholder={current.var_key === 'result' ? 'e.g. Participant' : 'Leave blank to print nothing'}
                                            onChange={(e) => update(current.placementId, { fallback: e.target.value })}
                                        />
                                    </Row>
                                    {current.var_key === 'result' && (
                                        <p className="text-[11px] text-gray-500 -mt-1">
                                            Prints 1st, 2nd or 3rd from completed fixtures; everyone else gets the default above.
                                        </p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Row label="Width %">
                                            <input
                                                type="number"
                                                min="2"
                                                max="100"
                                                className={control}
                                                value={current.w}
                                                onChange={(e) => update(current.placementId, {
                                                    w: Math.min(100, Math.max(2, Number(e.target.value) || 0)),
                                                })}
                                            />
                                        </Row>
                                        <Row label="Height %">
                                            <input
                                                type="number"
                                                min="2"
                                                max="100"
                                                className={control}
                                                value={current.h}
                                                onChange={(e) => update(current.placementId, {
                                                    h: Math.min(100, Math.max(2, Number(e.target.value) || 0)),
                                                })}
                                            />
                                        </Row>
                                    </div>

                                    {(current.kind === 'qrcode' || current.kind === 'barcode') && (
                                        <Row label="Colour">
                                            <input
                                                type="color"
                                                className="w-full h-[34px] border border-gray-300 rounded-lg cursor-pointer"
                                                value={current.color}
                                                onChange={(e) => update(current.placementId, { color: e.target.value })}
                                            />
                                        </Row>
                                    )}
                                </>
                            )}

                            {(current.kind === 'qrcode' || current.kind === 'barcode') && (
                                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-900">
                                    Encoded preview: <span className="break-all font-mono">
                                        {displayPreviewValue(current, previewData)}
                                    </span>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => duplicatePlacement(current)}
                                className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange"
                            >
                                <Copy className="h-3.5 w-3.5" />
                                Duplicate placement
                            </button>

                            {current.kind === 'text' && (
                            <Row label="Text anchor">
                                <div className="flex gap-1">
                                    {[
                                        ['left', AlignLeft],
                                        ['center', AlignCenter],
                                        ['right', AlignRight],
                                    ].map(([value, Icon]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => update(current.placementId, { align: value })}
                                            aria-label={value}
                                            className={`flex-1 flex items-center justify-center py-1.5 rounded-lg border transition-colors ${
                                                current.align === value
                                                    ? 'border-regx-orange bg-orange-50 text-regx-orange'
                                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </button>
                                    ))}
                                </div>
                            </Row>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Row = ({ label, children }) => (
    <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">{label}</label>
        {children}
    </div>
);

/** A position, as a percentage across or down the page. */
const Coord = ({ label, value, onChange }) => (
    <label className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-[10px] text-gray-400">{label}</span>
        <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={value}
            onChange={(e) => onChange(Math.min(100, Math.max(0, Number(e.target.value))))}
            className="w-11 border border-gray-200 rounded px-1 py-0.5 text-[11px] text-center tabular-nums focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
        />
    </label>
);

const KeyButton = ({ label, used, title, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        className={`w-full flex items-center gap-2 text-left px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
            used
                ? 'border-regx-orange/40 bg-orange-50/50 text-regx-orange'
                : 'border-gray-200 text-gray-700 hover:border-regx-orange hover:text-regx-orange'
        }`}
    >
        {used ? <Type className="w-3 h-3 shrink-0" /> : <Plus className="w-3 h-3 shrink-0" />}
        <span className="truncate">{label}</span>
    </button>
);

export default IdCardCertificateSetup;

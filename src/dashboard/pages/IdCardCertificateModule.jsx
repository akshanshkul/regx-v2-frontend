import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    Plus, Search, MoreVertical, ExternalLink, ArrowRight, X, Trash2,
    Image as ImageIcon, FileSpreadsheet, Upload, Settings, Eye, Link2,
    IdCard, Award, FolderPlus, Folder, ChevronLeft, CheckCircle2, XCircle,
    AlertCircle, Loader2, FileText, Users, Download, Mail
} from 'lucide-react';
import SendCertificatesModal from '../components/SendCertificatesModal';
import toast from 'react-hot-toast';
import { encodeId } from '../../shared/utils/ids';
import api from '../../services/api';
import {
    createCertificate,
    deleteCertificate,
    fetchCertificateForms,
    fetchCertificates,
    generateCertificates,
    refreshCertificates,
    sendCertificateData,
    uploadCertificateTemplate,
} from '../../store/slices/certificateSlice';

// ─────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 12;

/**
 * The certificate service speaks in numbers; this page speaks in words.
 *
 * One place for the translation, because getting it wrong in one direction
 * creates an ID card collection that says "certificate" on the card.
 */
const TYPE_TO_API = { certificate: 1, idcard: 2 };
const TYPE_FROM_API = { 1: 'certificate', 2: 'idcard' };

/**
 * A collection as the API keeps it, in the shape this page was written for.
 *
 * `public_id` rather than the row id is what every endpoint takes — the numeric
 * id never leaves the server.
 */
const fromApi = (row) => ({
    id: row.public_id,
    name: row.name,
    type: TYPE_FROM_API[Number(row.type)] ?? 'certificate',
    status: row.status || 'draft',
    count: Number(row.recipient_count ?? 0),
    created_at: row.created_at,
    description: row.description || 'No description provided.',
    banner_url: null,
    formId: row.form_id ?? null,
    externalId: row.external_collection_id ?? null,
    isSetUp: Boolean(row.is_set_up),
    hasTemplate: Boolean(row.has_template),
    canDownload: Boolean(row.can_download),
    canGenerate: Boolean(row.can_generate),
    templateUrl: row.template_url || null,
    emailEnabled: Boolean(Number(row.email_enabled ?? 0)),
    // 'player': one certificate each, all their categories on it. 'category': one per category.
    split: row.split === 'category' ? 'category' : 'player',
});

const getTypeColor = (type) => {
    switch ((type || '').toLowerCase()) {
        case 'certificate': return 'bg-orange-50 text-orange-600 border-orange-200';
        case 'idcard': return 'bg-blue-50 text-blue-600 border-blue-200';
        default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
};

const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
        case 'generated': return 'bg-green-50 text-green-600';
        case 'pending': return 'bg-yellow-50 text-yellow-600';
        case 'failed': return 'bg-red-50 text-red-600';
        default: return 'bg-gray-50 text-gray-600';
    }
};

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
const IdCardCertificateModule = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const {
        collections: storedCollections,
        status: collectionsStatus,
        error: collectionsError,
        forms: storedForms,
    } = useSelector((state) => state.certificates);

    // ── Collections State ──────────────────────────────────────
    const collections = useMemo(() => storedCollections.map(fromApi), [storedCollections]);
    const isLoading = collectionsStatus === 'idle' || collectionsStatus === 'loading';
    const [busyId, setBusyId] = useState(null);
    // The collection whose "Send to users" window is open.
    const [mailTarget, setMailTarget] = useState(null);

    // Forms this account owns, so a collection can be pointed at the people who
    // registered on one. Fetched when the create dialog is first opened.
    const forms = storedForms;

    // ── UI State ───────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const menuRef = useRef(null);

    // ── Modal States ───────────────────────────────────────────
    const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
    const [newCollection, setNewCollection] = useState({ name: '', type: 'certificate', description: '', formId: '' });

    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadTarget, setUploadTarget] = useState(null); // { collection, mode: 'certificate'|'idcard' }
    const [parsedRows, setParsedRows] = useState([]);
    const [parsedHeaders, setParsedHeaders] = useState([]);
    const [uploadFileName, setUploadFileName] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState(null);

    // ── Click outside to close menu ────────────────────────────
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Filtering & Pagination ─────────────────────────────────
    /**
     * Reads the collections back from the server.
     *
     * Called after anything that changes one rather than patching the row in
     * place: status moves on the certificate service's schedule, not ours, and
     * a locally-guessed "generated" that turns out to be "failed" is worse than
     * a second request.
     */
    useEffect(() => {
        dispatch(refreshCertificates());
    }, [dispatch]);

    useEffect(() => {
        if (collectionsError && collectionsStatus === 'failed') {
            toast.error(collectionsError);
        }
    }, [collectionsError, collectionsStatus]);

    const load = () => dispatch(refreshCertificates()).unwrap();

    const errorMessage = (error, fallback) =>
        error?.response?.data?.message || error?.message || (typeof error === 'string' ? error : fallback);

    const filteredCollections = useMemo(() => {
        if (!searchQuery.trim()) return collections;
        const q = searchQuery.toLowerCase();
        return collections.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.type.toLowerCase().includes(q) ||
            c.status.toLowerCase().includes(q)
        );
    }, [collections, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredCollections.length / PAGE_SIZE));

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    const paginatedCollections = filteredCollections.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const rangeStart = filteredCollections.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredCollections.length);

    // ── Handlers ───────────────────────────────────────────────
    /**
     * Creates the collection here and in the certificate service at once — the
     * server does both, so a collection that exists on one side and not the
     * other is not a state this page can produce.
     */
    const handleCreateCollection = async () => {
        if (!newCollection.name.trim()) {
            toast.error('Collection name is required.');
            return;
        }

        setBusyId('create');

        try {
            await dispatch(createCertificate({
                name: newCollection.name.trim(),
                description: newCollection.description.trim() || null,
                type: TYPE_TO_API[newCollection.type] ?? 1,
                form_id: newCollection.formId || null,
            })).unwrap();

            toast.success('Collection created.');
            setCreateCollectionOpen(false);
            setNewCollection({ name: '', type: 'certificate', description: '', formId: '' });
            await load();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not create the collection.'));
        } finally {
            setBusyId(null);
        }
    };

    const handleDeleteCollection = async () => {
        if (!selectedCollection) return;

        setBusyId(selectedCollection.id);

        try {
            await dispatch(deleteCertificate(selectedCollection.id)).unwrap();
            toast.success('Collection deleted.');
            setDeleteModalOpen(false);
            setSelectedCollection(null);
            await load();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not delete the collection.'));
        } finally {
            setBusyId(null);
        }
    };

    /** The template the certificates are drawn on. */
    const handleTemplate = async (collection, file) => {
        if (!file) return;

        setBusyId(collection.id);

        const body = new FormData();
        body.append('template', file);

        try {
            await dispatch(uploadCertificateTemplate({ id: collection.id, body })).unwrap();
            toast.success('Template uploaded.');
            await load();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not upload the template.'));
        } finally {
            setBusyId(null);
        }
    };

    /**
     * Renders them.
     *
     * Sends the recipients first: with no rows given the server takes everyone
     * on the attached form, which is the normal case and the reason this lives
     * in RegX rather than in the certificate service.
     */
    const handleGenerateNow = async (collection, rows = null) => {
        setBusyId(collection.id);

        try {
            const sent = await dispatch(sendCertificateData({ id: collection.id, rows })).unwrap();

            toast.success(sent.message || 'Recipients sent.');

            const result = await dispatch(generateCertificates(collection.id)).unwrap();

            toast.success(result.message || 'Certificates generated.');
            await load();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not generate the certificates.'));
        } finally {
            setBusyId(null);
        }
    };

    /**
     * The whole batch as one file.
     *
     * Fetched through our own API rather than linked to directly: the
     * credentials for the certificate service live on the server and must not
     * be handed to a browser.
     */
    const handleDownload = async (collection) => {
        setBusyId(collection.id);

        try {
            const blob = await api.get(`/certificates/${collection.id}/download`, { responseType: 'blob' });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = `${collection.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Nothing to download yet.');
        } finally {
            setBusyId(null);
        }
    };

    const openUploadModal = (collection, mode) => {
        setUploadTarget({ collection, mode });
        setParsedRows([]);
        setParsedHeaders([]);
        setUploadFileName('');
        setUploadProgress(0);
        setUploadModalOpen(true);
        setActiveMenuId(null);
    };

    // ── CSV / Excel Parsing (client-side) ──────────────────────
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(ext)) {
            toast.error('Please upload a CSV or Excel file.');
            return;
        }

        setUploadFileName(file.name);
        setIsParsing(true);

        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                let rows = [];

                if (ext === 'csv') {
                    // Simple CSV parser
                    const text = evt.target.result;
                    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
                    rows = lines.map(line => {
                        const cells = [];
                        let cur = '';
                        let inQuotes = false;
                        for (let i = 0; i < line.length; i++) {
                            const ch = line[i];
                            if (ch === '"') {
                                if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
                                else inQuotes = !inQuotes;
                            } else if (ch === ',' && !inQuotes) {
                                cells.push(cur); cur = '';
                            } else {
                                cur += ch;
                            }
                        }
                        cells.push(cur);
                        return cells;
                    });
                } else {
                    // For xlsx/xls we require the SheetJS global
                    if (typeof window.XLSX === 'undefined') {
                        toast.error('Excel parser not loaded. Please refresh and try again.');
                        setIsParsing(false);
                        return;
                    }
                    const data = new Uint8Array(evt.target.result);
                    const workbook = window.XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                }

                if (rows.length === 0) {
                    toast.error('The file appears to be empty.');
                    setIsParsing(false);
                    return;
                }

                const headers = rows[0].map(h => String(h).trim());
                const dataRows = rows.slice(1).filter(r => r.some(c => String(c).trim() !== ''));

                setParsedHeaders(headers);
                setParsedRows(dataRows.map(r => {
                    const obj = {};
                    headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
                    return obj;
                }));
                toast.success(`Parsed ${dataRows.length} row(s).`);
            } catch (err) {
                console.error(err);
                toast.error('Failed to parse file. Please check the format.');
            } finally {
                setIsParsing(false);
            }
        };

        if (ext === 'csv') reader.readAsText(file);
        else reader.readAsArrayBuffer(file);
    };

    /** Sends the rows that were parsed out of the spreadsheet. */
    const handleUpload = async () => {
        if (parsedRows.length === 0) {
            toast.error('No data to upload.');
            return;
        }

        setIsUploading(true);
        setUploadProgress(40);

        try {
            const response = await dispatch(sendCertificateData({
                id: uploadTarget.collection.id,
                rows: parsedRows,
            })).unwrap();

            setUploadProgress(100);
            toast.success(response.message || `${parsedRows.length} recipient(s) sent.`);
            setUploadModalOpen(false);
            await load();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not send the recipients.'));
        } finally {
            setIsUploading(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-display">
                        ID Cards & Certificates
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Create collections, upload data, and generate certificates or ID cards.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setCreateCollectionOpen(true);

                        // Fetched when the dialog is first opened, not on every
                        // page load: most visits never create anything.
                        dispatch(fetchCertificateForms());
                    }}
                    className="flex items-center gap-2 bg-regx-orange hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shrink-0"
                >
                    <FolderPlus className="w-5 h-5" />
                    Create Collection
                </button>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            placeholder="Search collections..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-regx-orange/20 focus:border-regx-orange transition-all"
                        />
                    </div>

                </div>

                {/* Grid */}
                <div className="p-4 min-h-[300px]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {paginatedCollections.map((collection) => (
                            <div
                                key={collection.id}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible flex flex-col hover:shadow-md hover:border-gray-300 transition-all group"
                            >
                                {/* Banner */}
                                <div className="w-full h-20 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                                    {/*
                                      The artwork itself, where there is any: a wall of identical
                                      placeholder icons tells you nothing about which collection is
                                      which, and the one thing that does is the thing being printed.
                                      Lazily loaded, because these are full-size uploads.
                                    */}
                                    {collection.templateUrl ? (
                                        <img
                                            src={collection.templateUrl}
                                            alt=""
                                            loading="lazy"
                                            decoding="async"
                                            className="absolute inset-0 w-full h-full object-contain p-1.5"
                                            onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                        />
                                    ) : collection.type === 'certificate' ? (
                                        <Award className="w-8 h-8 text-orange-300" />
                                    ) : (
                                        <IdCard className="w-8 h-8 text-blue-300" />
                                    )}
                                    <span className={`absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${getTypeColor(collection.type)}`}>
                                        {collection.type === 'certificate' ? 'Certificate' : 'ID Card'}
                                    </span>
                                </div>

                                <div className="p-3 flex flex-col gap-2 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        {/* Title — min-w-0 lets truncate work inside flex */}
                                        <h3
                                            className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2
                   group-hover:text-regx-orange transition-colors min-w-0 flex-1"
                                            title={collection.name}
                                        >
                                            {collection.name}
                                        </h3>

                                        {/* Menu */}
                                        <div className="relative shrink-0" ref={activeMenuId === collection.id ? menuRef : null}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuId(activeMenuId === collection.id ? null : collection.id);
                                                }}
                                                aria-label="Collection actions"
                                                aria-haspopup="menu"
                                                aria-expanded={activeMenuId === collection.id}
                                                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>

                                            {activeMenuId === collection.id && (
                                                <div
                                                    role="menu"
                                                    className="origin-top-right absolute right-0 mt-2 w-44 rounded-xl shadow-lg bg-white
                           ring-1 ring-black ring-opacity-5 divide-y divide-gray-100
                           focus:outline-none z-50 py-1"
                                                >
                                                    <button
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setActiveMenuId(null);
                                                            navigate(`/dashboard/certificates/collection/${encodeId(collection.id)}`);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                    >
                                                        <ExternalLink className="w-4 h-4 text-gray-400" />
                                                        Open
                                                    </button>

                                                    <button
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setActiveMenuId(null);
                                                            navigate(`/dashboard/certificates/setup/${encodeId(collection.id)}`);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                    >
                                                        <Settings className="w-4 h-4 text-gray-400" />
                                                        Setup
                                                    </button>

                                                    <label
                                                        role="menuitem"
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                                                    >
                                                        <Upload className="w-4 h-4 text-gray-400" />
                                                        Template
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept=".png,.jpg,.jpeg,.pdf,.svg"
                                                            onChange={(e) => {
                                                                setActiveMenuId(null);
                                                                handleTemplate(collection, e.target.files?.[0]);
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </label>

                                                    <button
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setActiveMenuId(null);
                                                            openUploadModal(collection, collection.type);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                    >
                                                        <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                                                        Upload a sheet
                                                    </button>

                                                    <button
                                                        role="menuitem"
                                                        disabled={!collection.isSetUp || busyId === collection.id}
                                                        onClick={() => {
                                                            setActiveMenuId(null);
                                                            handleGenerateNow(collection);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-40"
                                                        title={collection.isSetUp
                                                            ? 'Run it again even though nothing has changed'
                                                            : 'Set up the artwork and fields first'}
                                                    >
                                                        <Award className="w-4 h-4 text-gray-400" />
                                                        {collection.canDownload ? 'Generate again' : 'Generate'}
                                                    </button>

                                                    <button
                                                        role="menuitem"
                                                        disabled={!collection.canDownload || busyId === collection.id}
                                                        onClick={() => {
                                                            setActiveMenuId(null);
                                                            handleDownload(collection);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-40"
                                                        title={collection.canDownload
                                                            ? 'Download them all as one file'
                                                            : 'Nothing has been generated yet'}
                                                    >
                                                        <Download className="w-4 h-4 text-gray-400" />
                                                        Download
                                                    </button>

                                                    {/* Only where emailing has been turned on in Setup. */}
                                                    {collection.emailEnabled && (
                                                        <button
                                                            role="menuitem"
                                                            onClick={() => {
                                                                setActiveMenuId(null);
                                                                setMailTarget(collection);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                        >
                                                            <Mail className="w-4 h-4 text-gray-400" />
                                                            Send to users
                                                        </button>
                                                    )}

                                                    <button
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setSelectedCollection(collection);
                                                            setDeleteModalOpen(true);
                                                            setActiveMenuId(null);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-500 line-clamp-1">{collection.description}</p>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${getStatusColor(collection.status)}`}>
                                            {collection.status}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                                            <Users className="w-3 h-3" /> {collection.count}
                                        </span>
                                        <span
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 text-orange-700"
                                            title="Change it in Setup"
                                        >
                                            {collection.split === 'category' ? 'By category' : 'By player'}
                                        </span>
                                    </div>

                                    {!collection.isSetUp && (
                                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5">
                                            {collection.hasTemplate
                                                ? 'No fields placed yet — open Set up.'
                                                : 'No artwork yet — open Set up.'}
                                        </p>
                                    )}

                                    {collection.isSetUp && collection.canGenerate && collection.canDownload && (
                                        <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-0.5">
                                            Changed since the last run.
                                        </p>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="mt-auto pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => navigate(`/dashboard/certificates/setup/${encodeId(collection.id)}`)}
                                            title={collection.isSetUp
                                                ? 'Change the artwork or move the fields'
                                                : 'Upload the artwork and place the fields'}
                                            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium
                   bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-gray-200
                   border border-gray-200 hover:border-gray-300
                   transition-colors min-w-0"
                                        >
                                            <Settings className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate">{collection.isSetUp ? 'Layout' : 'Set up'}</span>
                                        </button>

                                        {/*
                                          Once they exist and are current, getting hold of them is
                                          what you came for, so the second button becomes Download.
                                          Something changed since the last run puts Generate back:
                                          the file that exists is no longer of the thing on screen,
                                          and offering to download it would be offering the wrong
                                          thing. With nothing to make and nothing made, Generate
                                          stays but says why it cannot run.
                                        */}
                                        {collection.canDownload && !collection.canGenerate ? (
                                            <button
                                                onClick={() => handleDownload(collection)}
                                                disabled={busyId === collection.id}
                                                title="Download every certificate as one PDF"
                                                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium
                   bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200
                   border border-emerald-200 hover:border-emerald-300
                   transition-colors min-w-0 disabled:opacity-40 disabled:hover:bg-emerald-50"
                                            >
                                                {busyId === collection.id
                                                    ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                                                    : <Download className="w-3.5 h-3.5 shrink-0" />}
                                                <span className="truncate">Download</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleGenerateNow(collection)}
                                                disabled={!collection.canGenerate || busyId === collection.id}
                                                title={
                                                    !collection.isSetUp
                                                        ? 'Set up the artwork and fields first'
                                                        : collection.canGenerate
                                                            ? 'Make them for everyone on the attached form'
                                                            : 'Already up to date — nothing has changed since the last run'
                                                }
                                                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium
                   bg-orange-50 text-orange-600 hover:bg-orange-100 active:bg-orange-200
                   border border-orange-200 hover:border-orange-300
                   transition-colors min-w-0 disabled:opacity-40 disabled:hover:bg-orange-50"
                                            >
                                                {busyId === collection.id
                                                    ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                                                    : <Award className="w-3.5 h-3.5 shrink-0" />}
                                                <span className="truncate">Generate</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Utility Buttons */}
                                    <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => navigate(`/dashboard/certificates/view/${encodeId(collection.id)}`)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-regx-orange hover:bg-orange-50 transition-colors"
                                                title="View"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/dashboard/certificates/connect/${encodeId(collection.id)}`)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-regx-orange hover:bg-orange-50 transition-colors"
                                                title="Connect"
                                            >
                                                <Link2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => openUploadModal(collection, collection.type === 'certificate' ? 'certificate' : 'idcard')}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-regx-orange hover:bg-orange-50 transition-colors"
                                                title="Upload Excel / CSV"
                                            >
                                                <Upload className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/dashboard/certificates/setup/${encodeId(collection.id)}`)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-regx-orange hover:bg-orange-50 transition-colors"
                                            title="Setup"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredCollections.length === 0 && (
                        <div className="py-16 text-center">
                            <p className="text-sm font-semibold text-gray-900">
                                {searchQuery ? 'No collections match your search' : 'No collections yet'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {searchQuery
                                    ? 'Try a different name or type.'
                                    : 'Create your first collection to get started.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {filteredCollections.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-xs text-gray-500">
                            Showing <span className="font-medium text-gray-700">{rangeStart}</span>
                            <span>–</span>
                            <span className="font-medium text-gray-700">{rangeEnd}</span> of{' '}
                            <span className="font-medium text-gray-700">{filteredCollections.length}</span> collections
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-2.5 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                            >
                                Previous
                            </button>
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === i + 1
                                        ? 'bg-regx-orange text-white'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-2.5 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════
                CREATE COLLECTION MODAL
            ═══════════════════════════════════════════════════ */}
            {createCollectionOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 text-lg">Create Collection</h3>
                            <button onClick={() => setCreateCollectionOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Collection Name</label>
                                <input
                                    type="text"
                                    value={newCollection.name}
                                    onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                                    placeholder="e.g., Annual Sports Meet 2025"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-regx-orange focus:ring-1 focus:ring-regx-orange"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setNewCollection({ ...newCollection, type: 'certificate' })}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${newCollection.type === 'certificate'
                                            ? 'bg-orange-50 text-orange-600 border-orange-300'
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Award className="w-4 h-4" /> Certificate
                                    </button>
                                    <button
                                        onClick={() => setNewCollection({ ...newCollection, type: 'idcard' })}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${newCollection.type === 'idcard'
                                            ? 'bg-blue-50 text-blue-600 border-blue-300'
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <IdCard className="w-4 h-4" /> ID Card
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
                                <textarea
                                    value={newCollection.description}
                                    onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                                    rows={3}
                                    placeholder="Brief description of this collection..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-regx-orange focus:ring-1 focus:ring-regx-orange resize-none"
                                />
                            </div>

                            {/*
                              * Which form the recipients come from. This is the
                              * reason certificates live in RegX rather than being
                              * done in the certificate service directly — the
                              * people are already here, so nobody has to export a
                              * spreadsheet and import it again.
                              */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Make these for
                                </label>
                                <select
                                    value={newCollection.formId || ''}
                                    onChange={(e) => setNewCollection({ ...newCollection, formId: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-regx-orange focus:ring-1 focus:ring-regx-orange"
                                >
                                    <option value="">Nobody yet — I will upload a sheet</option>
                                    {forms.map((form) => (
                                        <option key={form.id} value={form.id}>
                                            {form.name}
                                            {form.submission_count ? ` — ${form.submission_count} registered` : ''}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    {newCollection.formId
                                        ? 'Everyone registered on that form, minus anyone hidden — and on a form that needs approving, only the approved ones.'
                                        : 'You can attach a form later, or upload a spreadsheet of your own.'}
                                </p>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => setCreateCollectionOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateCollection}
                                className="px-4 py-2 text-sm font-medium text-white bg-regx-orange rounded-lg hover:bg-orange-600"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                UPLOAD MODAL (Excel / CSV)
            ═══════════════════════════════════════════════════ */}
            {uploadModalOpen && uploadTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-8">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">
                                    Upload Data – {uploadTarget.mode === 'certificate' ? 'Certificate' : 'ID Card'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">{uploadTarget.collection.name}</p>
                            </div>
                            <button
                                onClick={() => { setUploadModalOpen(false); setParsedRows([]); setParsedHeaders([]); }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 overflow-y-auto">
                            {/* File Drop Area */}
                            <label className="block">
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-regx-orange hover:bg-orange-50/30 transition-colors cursor-pointer">
                                    <FileSpreadsheet className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-gray-700">
                                        {uploadFileName || 'Click to upload a CSV or Excel file'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Supports .csv, .xlsx, .xls
                                    </p>
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </div>
                            </label>

                            {/* Parsing State */}
                            {isParsing && (
                                <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-sm">Parsing file...</span>
                                </div>
                            )}

                            {/* Preview Table */}
                            {!isParsing && parsedRows.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                            <p className="text-sm font-medium text-gray-900">
                                                {parsedRows.length} record(s) ready to upload
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {parsedHeaders.length} columns detected
                                        </span>
                                    </div>

                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="overflow-x-auto max-h-[320px]">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                                            #
                                                        </th>
                                                        {parsedHeaders.map((h, i) => (
                                                            <th key={i} className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap">
                                                                {h}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {parsedRows.slice(0, 50).map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-orange-50/30">
                                                            <td className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100">
                                                                {idx + 1}
                                                            </td>
                                                            {parsedHeaders.map((h, i) => (
                                                                <td key={i} className="px-3 py-2 text-xs text-gray-700 border-b border-gray-100 whitespace-nowrap">
                                                                    {String(row[h] ?? '')}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {parsedRows.length > 50 && (
                                            <div className="px-3 py-2 bg-gray-50 text-center text-xs text-gray-500 border-t border-gray-200">
                                                Showing first 50 of {parsedRows.length} rows
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Upload Progress */}
                            {isUploading && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                                        <span>Uploading...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-regx-orange rounded-full transition-all duration-200"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center gap-3 shrink-0">
                            <button
                                onClick={() => { setUploadModalOpen(false); setParsedRows([]); setParsedHeaders([]); }}
                                disabled={isUploading}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={isUploading || parsedRows.length === 0}
                                className="px-4 py-2 text-sm font-medium text-white bg-regx-orange rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" /> Upload {parsedRows.length > 0 ? `(${parsedRows.length})` : ''}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {mailTarget && <SendCertificatesModal collection={mailTarget} onClose={() => setMailTarget(null)} />}

            {/* ═══════════════════════════════════════════════════
                DELETE MODAL
            ═══════════════════════════════════════════════════ */}
            {deleteModalOpen && selectedCollection && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-xl mb-2">Delete Collection?</h3>
                            <p className="text-gray-500 text-sm mb-1">Are you sure you want to delete</p>
                            <p className="font-semibold text-gray-900 text-sm mb-4 text-balance">
                                "{selectedCollection.name}"?
                            </p>
                            <p className="text-red-500 text-xs font-medium bg-red-50 py-2 rounded-lg">
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => { setDeleteModalOpen(false); setSelectedCollection(null); }}
                                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteCollection}
                                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IdCardCertificateModule;
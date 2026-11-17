import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    QrCode,
    Save,
    Eye,
    Rocket,
    Plus,
    AlertTriangle,
    CheckCircle2,
    LayoutList,
    GitBranch,
    Inbox,
    Layers,
    Link2,
    IndianRupee,
    BarChart3,
    Pencil,
    Check,
    X,
    Trash2,
    ChevronUp,
    ChevronDown,
    FolderOpen,

    Type,
    AlignLeft,
    Hash,
    Mail,
    Phone,
    Heading,
    List,
    ListChecks,
    CircleDot,
    CheckSquare,
    CircleCheck,
    VenusAndMars,
    Calendar,
    Clock,
    CalendarClock,
    MapPin,
    Globe,
    Map,
    Building2,
    FileUp,
    Image,
    FileText,
    PenLine,
    Tags,
    ListTree,
    Calculator,
    EyeOff,
    Code,
    PhoneCall,
    HeartPulse,
    Palette,
    ImagePlus,
} from "lucide-react";
import {
    fetchForm, saveStructure, publishForm, setSchema, clearCurrent, updateForm,
    uploadFormImages, removeFormImage,
    selectCurrentForm,
    selectGateway, selectCurrentSchema, selectCurrentValidation, selectCurrentDatasets, selectCurrentEvent,
    selectFormStatus, selectFormSaving, selectFormDirty, selectSubmissionsMetaFor,
} from '../../store/slices/formsSlice';
import FieldSettings from '../components/FieldSettings';
import PricingSettings from '../components/PricingSettings';
import SeoSettings from '../components/SeoSettings';
import ThemeSettings from '../components/ThemeSettings';
import ReceiptEmailSettings from '../components/ReceiptEmailSettings';
import FormDetails from '../components/FormDetails';
import RegistrationWindow from '../components/RegistrationWindow';
import RuleBuilder from '../components/RuleBuilder';
import SubmissionsTable from '../components/SubmissionsTable';
import SubmissionSummary from '../components/SubmissionSummary';
import {
    DndContext, DragOverlay, closestCenter,
    PointerSensor, TouchSensor, KeyboardSensor,
    useSensor, useSensors, MeasuringStrategy,
} from '@dnd-kit/core';
import {
    SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableFieldRow from '../components/SortableFieldRow';
import DynamicForm from '../../shared/forms/DynamicForm';
import api from '../../services/api';
import { downloadFormQr } from '../utils/formQr';
import Skeleton from '../../shared/components/Skeleton';
import { encodeId } from '../../shared/utils/ids';
import { useRouteIds } from '../../shared/utils/ids';

/** Palette, grouped so the list is scannable rather than 28 flat entries. */
const FIELD_GROUPS = [
    ["Basic", [
        ["text", "Text", Type],
        ["textarea", "Long text", AlignLeft],
        ["number", "Number", Hash],
        ["email", "Email", Mail],
        ["phone", "Phone", Phone],
        ["heading", "Heading", Heading],
        ["code_block", "HTML/CSS code block", Code],
        // A picture shown on the form (a poster, a rules chart), not a question.
        ["display_image", "Image", ImagePlus],
    ]],

    ["Choice", [
        ["select", "Dropdown", List],
        ["multiselect", "Multi-select", ListChecks],
        ["radio", "Radio", CircleDot],
        ["checkbox", "Checkboxes", CheckSquare],
        ["yes_no", "Yes / No", CircleCheck],
        ["gender", "Gender", VenusAndMars],
    ]],

    ["Date & time", [
        ["date", "Date", Calendar],
        ["time", "Time", Clock],
        ["datetime", "Date and time", CalendarClock],
    ]],

    ["Location", [
        ["address", "Address", MapPin],
        ["country", "Country", Globe],
        ["state", "State", Map],
        ["city", "City", Building2],
    ]],

    ["Files & consent", [
        ["file", "File upload", FileUp],
        ["image", "Image upload", Image],
        ["terms", "Terms", FileText],
        ["signature", "Signature", PenLine],
    ]],

    ["Advanced", [
        ["category", "Category", Tags],
        ["category_entries", "Category entries", ListTree],
        ["calculated", "Calculated", Calculator],
        ["hidden", "Hidden", EyeOff],
        ["emergency_contact", "Emergency contact", PhoneCall],
        ["medical", "Medical info", HeartPulse],
    ]],
];
const uniqueKey = (schema, base) => {
    const taken = new Set((schema.fields || []).map((f) => f.key));
    if (!taken.has(base)) return base;

    let n = 2;
    while (taken.has(`${base}_${n}`)) n++;
    return `${base}_${n}`;
};

const FormBuilder = () => {
    const { eventId, formId } = useRouteIds();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const form = useSelector(selectCurrentForm);
    const gateway = useSelector(selectGateway);
    const schema = useSelector(selectCurrentSchema);
    const validation = useSelector(selectCurrentValidation);
    const datasets = useSelector(selectCurrentDatasets);
    const event = useSelector(selectCurrentEvent);
    const status = useSelector(selectFormStatus);
    const isSaving = useSelector(selectFormSaving);
    const isDirty = useSelector(selectFormDirty);
    const submissionsMeta = useSelector(selectSubmissionsMetaFor(formId));

    const [tab, setTab] = useState('fields');
    const [selectedKey, setSelectedKey] = useState(null);
    // The section new fields are added to; null means "the last one".
    const [activeSection, setActiveSection] = useState(null);
    const [isPublishing, setIsPublishing] = useState(false);

    // The name is a property of the form rather than of the canvas, so it saves
    // on its own — renaming should not require saving a half-finished draft.
    const [renaming, setRenaming] = useState(null);
    const [savingName, setSavingName] = useState(false);

    // Key of the row currently being dragged, for the floating overlay.
    const [activeKey, setActiveKey] = useState(null);

    /**
     * Pointer covers mouse and pen; Touch is separate so a long-press starts a
     * drag while a normal tap still scrolls the list. Keyboard makes the same
     * reorder reachable without a pointer at all.
     */
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const isLoading = status === 'idle' || status === 'loading';

    useEffect(() => {
        dispatch(fetchForm(formId))
            .unwrap()
            .catch((message) => toast.error(message || 'Failed to load the form'));

        return () => {
            dispatch(clearCurrent());
        };
    }, [dispatch, formId]);

    const update = (next) => dispatch(setSchema(next));

    const fields = useMemo(
        () => [...(schema?.fields || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        [schema]
    );

    const selected = fields.find((f) => f.key === selectedKey) ?? null;

    const disabledCount = useMemo(() => fields.filter((f) => f.enabled === false).length, [fields]);

    const sections = useMemo(
        () => [...(schema?.sections || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        [schema]
    );

    /**
     * The canvas as the public form will read it: each section with its fields,
     * in order. Fields with no section — or one pointing at a section that no
     * longer exists — are gathered at the end rather than left invisible.
     * An empty section still shows, so it can be seen, filled or removed.
     */
    const groups = useMemo(() => {
        const known = new Set(sections.map((section) => section.key));

        const list = sections.map((section) => ({
            section,
            fields: fields.filter((field) => field.section === section.key),
        }));

        const loose = fields.filter((field) => !field.section || !known.has(field.section));

        if (loose.length > 0) {
            list.push({ section: null, fields: loose });
        }

        return list;
    }, [sections, fields]);

    /**
     * The draft stores no options for dataset-backed fields — those resolve
     * from the event when the form is served. Fill them in for the preview so
     * the organiser sees the real choices instead of an empty dropdown.
     */
    const previewSchema = useMemo(() => {
        if (!schema) return schema;

        return {
            ...schema,
            fields: (schema.fields || []).map((field) =>
                field.optionsSource === 'dataset'
                    ? { ...field, options: datasets[field.optionsDataset] || [] }
                    : field
            ),
            // Served from the form, not the canvas, so the preview charges
            // what a participant would.
            flatFee: Number(form?.settings?.pricing?.flatFee || 0),
        };
    }, [schema, datasets, form?.settings?.pricing?.flatFee]);

    /**
     * Where a new field lands: the section last clicked — directly, or by
     * clicking one of its fields. With none chosen (or a click on the "No
     * section" group, or a section since deleted) it goes in the last section.
     */
    const targetSectionKey = sections.some((s) => s.key === activeSection)
        ? activeSection
        : sections[sections.length - 1]?.key ?? null;

    const selectField = (key) => {
        setSelectedKey(key);

        const field = fields.find((f) => f.key === key);
        setActiveSection(field?.section ?? null);
    };

    const addField = (type, label) => {
        const key = uniqueKey(schema, type);

        const field = {
            key,
            type,
            label,
            section: targetSectionKey,
            placeholder: '',
            helpText: '',
            required: false,
            hidden: false,
            enabled: true,
            optionsSource: 'static',
            optionsParentKey: null,
            optionsDataset: null,
            config: {},
            order: fields.length,
            options: [],
        };

        update({ ...schema, fields: [...fields, field] });
        setSelectedKey(key);
    };

    const updateField = (next) => {
        // A renamed field would orphan every rule pointing at the old name, so
        // move those references across with it.
        const previousKey = selected.key;
        const renamed = next.key !== previousKey;

        const rules = renamed
            ? (schema.rules || []).map((rule) => ({
                ...rule,
                conditions: (rule.conditions || []).map((c) =>
                    c.field === previousKey ? { ...c, field: next.key } : c
                ),
                actions: (rule.actions || []).map((a) =>
                    a.target === previousKey ? { ...a, target: next.key } : a
                ),
            }))
            : schema.rules;

        const updatedFields = fields.map((f) => (f.key === previousKey ? next : f));

        // Dependent children referencing the old name follow too.
        const withChildren = renamed
            ? updatedFields.map((f) =>
                f.optionsParentKey === previousKey ? { ...f, optionsParentKey: next.key } : f
            )
            : updatedFields;

        update({ ...schema, fields: withChildren, rules });
        setSelectedKey(next.key);
    };

    const deleteField = () => {
        if (!window.confirm(`Remove "${selected.label || selected.key}"?`)) return;

        update({
            ...schema,
            fields: fields.filter((f) => f.key !== selected.key),
            // Drop anything that referenced it rather than leaving broken rules.
            rules: (schema.rules || [])
                .map((rule) => ({
                    ...rule,
                    conditions: (rule.conditions || []).filter((c) => c.field !== selected.key),
                    actions: (rule.actions || []).filter((a) => a.target !== selected.key),
                }))
                .filter((rule) => rule.conditions.length > 0 && rule.actions.length > 0),
        });

        setSelectedKey(null);
    };

    /**
     * Writes a new arrangement back to the schema: every field takes the
     * section of the group it sits in, and `order` is renumbered to match what
     * is on screen, so the public form reads in the same sequence.
     */
    const commit = (nextGroups, extra = {}) => {
        const flat = nextGroups.flatMap((group) =>
            group.fields.map((field) => ({ ...field, section: group.section?.key ?? null }))
        );

        update({ ...schema, ...extra, fields: flat.map((field, index) => ({ ...field, order: index })) });
    };

    const groupOf = (key) => groups.findIndex((group) => group.fields.some((field) => field.key === key));

    /** Up/down arrows: the keyboard path, and the only way without a pointer. */
    const moveField = (groupIndex, from, direction) => {
        const to = from + direction;
        const group = groups[groupIndex];

        if (!group || to < 0 || to >= group.fields.length) return;

        const next = groups.map((g, i) => (i === groupIndex ? { ...g, fields: arrayMove(g.fields, from, to) } : g));

        commit(next);
    };

    /** Drop within a section to reorder, or onto a field in another section to move it there. */
    const handleDragEnd = ({ active, over }) => {
        setActiveKey(null);

        if (!over || active.id === over.id) return;

        const fromGroup = groupOf(active.id);
        const toGroup = groupOf(over.id);

        if (fromGroup < 0 || toGroup < 0) return;

        const next = groups.map((group) => ({ ...group, fields: [...group.fields] }));
        const fromIndex = next[fromGroup].fields.findIndex((field) => field.key === active.id);
        const toIndex = next[toGroup].fields.findIndex((field) => field.key === over.id);

        if (fromGroup === toGroup) {
            next[fromGroup].fields = arrayMove(next[fromGroup].fields, fromIndex, toIndex);
        } else {
            const [moved] = next[fromGroup].fields.splice(fromIndex, 1);
            next[toGroup].fields.splice(toIndex, 0, moved);
        }

        commit(next);
    };

    // ---------------------------------------------------------------- sections

    const renameSection = (key) => {
        const section = sections.find((item) => item.key === key);
        const title = window.prompt('Section title', section?.title ?? '');

        if (!title || !title.trim()) return;

        update({
            ...schema,
            sections: (schema.sections || []).map((item) => (item.key === key ? { ...item, title: title.trim() } : item)),
        });
    };

    const moveSection = (index, direction) => {
        const to = index + direction;

        if (to < 0 || to >= sections.length) return;

        const reordered = arrayMove(sections, index, to).map((section, order) => ({ ...section, order }));

        // Fields follow their section, so the public form reads in the new order.
        const byKey = Object.fromEntries(groups.filter((g) => g.section).map((g) => [g.section.key, g]));
        const next = [
            ...reordered.map((section) => ({ section, fields: byKey[section.key]?.fields ?? [] })),
            ...groups.filter((g) => !g.section),
        ];

        commit(next, { sections: reordered });
    };

    const deleteSection = (key) => {
        const group = groups.find((g) => g.section?.key === key);
        const count = group?.fields.length ?? 0;

        const question = count > 0
            ? `Remove the "${group.section.title}" section? Its ${count} field${count === 1 ? '' : 's'} will move to "No section".`
            : `Remove the empty "${group?.section?.title ?? key}" section?`;

        if (!window.confirm(question)) return;

        const remaining = (schema.sections || [])
            .filter((section) => section.key !== key)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((section, order) => ({ ...section, order }));

        const next = groups.map((g) => (g.section?.key === key ? { section: null, fields: g.fields } : g));

        commit(next, { sections: remaining });
    };

    const addSection = () => {
        const title = window.prompt('Section title');
        if (!title) return;

        const key = uniqueKey({ fields: schema.sections || [] }, title.toLowerCase().replace(/[^a-z0-9]+/g, '_'));

        update({
            ...schema,
            sections: [
                ...(schema.sections || []),
                { key, title, description: '', step: 1, order: (schema.sections || []).length },
            ],
        });
    };

    const saveName = async () => {
        const name = (renaming ?? '').trim();

        if (name === '' || name === form?.name) {
            setRenaming(null);
            return;
        }

        setSavingName(true);

        try {
            await dispatch(updateForm({ formId, name })).unwrap();
            setRenaming(null);
            toast.success('Form renamed.');
        } catch (message) {
            toast.error(message || 'Could not rename the form');
        } finally {
            setSavingName(false);
        }
    };

    const handleSave = async () => {
        try {
            await dispatch(saveStructure({ formId, schema })).unwrap();
            toast.success('Saved.');
        } catch (message) {
            toast.error(message || 'Failed to save');
        }
    };

    const handlePublish = async () => {
        if (isDirty) {
            toast.error('Save your changes before publishing.');
            return;
        }

        setIsPublishing(true);
        try {
            const result = await dispatch(publishForm(formId)).unwrap();
            toast.success(`Published version ${result.version}.`);
            result.warnings?.forEach((w) => toast(w, { icon: '⚠️' }));
        } catch (message) {
            toast.error(message || 'Could not publish');
        } finally {
            setIsPublishing(false);
        }
    };

    if (isLoading || !schema) {
        return (
            <div className="max-w-8xl mx-auto space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-12 gap-6">
                    <Skeleton rounded="rounded-2xl" className="col-span-3 h-96" />
                    <Skeleton rounded="rounded-2xl" className="col-span-6 h-96" />
                    <Skeleton rounded="rounded-2xl" className="col-span-3 h-96" />
                </div>
            </div>
        );
    }

    const errors = validation?.errors ?? [];
    const warnings = validation?.warnings ?? [];

    // The table reports the true total once it has loaded a page; until then the
    // count that came with the form itself is right.
    const submissionCount = submissionsMeta?.total ?? form?.submission_count ?? 0;

    const tabs = [
        ['details', 'Details', FileText],
        ['fields', 'Fields', LayoutList],
        ['rules', 'Rules', GitBranch],
        ['pricing', 'Fees', IndianRupee],
        ['theme', 'Theme', Palette],
        ['email', 'Email', Mail],
        ['seo', 'Sharing', Globe],
        ['preview', 'Preview', Eye],
        ['submissions', `Submissions (${submissionCount})`, Inbox],
        ['summary', 'Summary', BarChart3],
    ];

    return (
        <div className="max-w-8xl mx-auto space-y-5 pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        // A standalone form has no event to go back to, so it
                        // goes back to the list it was made from.
                        onClick={() => navigate(eventId ? `/events/${encodeId(eventId)}` : '/dashboard/forms')}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        {renaming === null ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                                <h1 className="text-xl font-bold text-gray-900 font-display truncate">
                                    {form?.name}
                                </h1>
                                <button
                                    type="button"
                                    onClick={() => setRenaming(form?.name ?? '')}
                                    title="Rename this form"
                                    aria-label="Rename this form"
                                    className="p-1 rounded text-gray-300 hover:text-regx-orange hover:bg-orange-50 transition-colors shrink-0"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <input
                                    autoFocus
                                    value={renaming}
                                    disabled={savingName}
                                    onChange={(e) => setRenaming(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveName();
                                        if (e.key === 'Escape') setRenaming(null);
                                    }}
                                    className="text-xl font-bold text-gray-900 font-display bg-white border border-regx-orange rounded-lg px-2 py-0.5 outline-none focus:ring-1 focus:ring-regx-orange min-w-0 w-full max-w-md disabled:opacity-60"
                                />
                                <button
                                    type="button"
                                    onClick={saveName}
                                    disabled={savingName}
                                    title="Save the new name"
                                    aria-label="Save the new name"
                                    className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-40 shrink-0"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRenaming(null)}
                                    disabled={savingName}
                                    title="Keep the current name"
                                    aria-label="Keep the current name"
                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-40 shrink-0"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs capitalize text-gray-500">{form?.status}</span>
                            {form?.status === 'published' && (
                                <a
                                    href={`/form/${form.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-mono text-regx-orange hover:underline flex items-center gap-1"
                                >
                                    <Link2 className="w-3 h-3" />
                                    /form/{form.slug}
                                </a>
                            )}
                            {form?.status === 'published' && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        downloadFormQr(`${window.location.origin}/form/${form.slug}`, form.slug).catch(() =>
                                            toast.error('Could not create the QR code.')
                                        )
                                    }
                                    title="Download a QR code for this form's link"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 text-[11px] font-medium text-gray-600 hover:border-regx-orange hover:text-regx-orange"
                                >
                                    <QrCode className="w-3 h-3" />
                                    QR
                                </button>
                            )}
                            {isDirty && <span className="text-xs text-amber-600">• unsaved changes</span>}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !isDirty}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving…' : 'Save draft'}
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={isPublishing || errors.length > 0}
                        title={errors.length > 0 ? 'Fix the errors below first' : 'Publish this version'}
                        className="flex items-center gap-2 px-5 py-2 bg-regx-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                        <Rocket className="w-4 h-4" />
                        {isPublishing ? 'Publishing…' : 'Publish'}
                    </button>
                </div>
            </div>

            {/*
              * A published form under an unpublished event answers the public
              * with "not available". Said here, where the organiser is looking
              * at the link, rather than left for them to find as a dead page.
              */}
            {event && event.published === false && (
                <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-amber-50 text-amber-800 border border-amber-200">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                        <strong className="font-semibold">{event.name}</strong> is {event.status.toLowerCase()},
                        so none of its forms are open to the public — this link will not work for anyone
                        until the event itself is published.
                    </span>
                </div>
            )}

            {/* Validation */}
            {(errors.length > 0 || warnings.length > 0) && (
                <div className="space-y-2">
                    {errors.map((error, i) => (
                        <div key={`e${i}`} className="flex items-start gap-2 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            {error}
                        </div>
                    ))}
                    {warnings.map((warning, i) => (
                        <div key={`w${i}`} className="flex items-start gap-2 p-3 rounded-lg text-sm bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            {warning}
                        </div>
                    ))}
                </div>
            )}

            {errors.length === 0 && warnings.length === 0 && validation && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    No problems found — this form is ready to publish.
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-6 overflow-x-auto">
                    {tabs.map(([key, label, Icon]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${tab === key
                                ? 'border-regx-orange text-regx-orange'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Fields */}
            {tab === 'fields' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
                    {/* Palette */}
                    <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-2 h-fit">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Add a field</p>

                        <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {FIELD_GROUPS.map(([group, types]) => (
                                <div key={group}>
                                    <p className="text-[10px] font-medium text-gray-400 mb-1.5">{group}</p>
                                    <div className="grid grid-cols-2 gap-1.5 p-1">
                                        {types.map(([type, label, Icon]) => (
                                            <button
                                                key={type}
                                                onClick={() => addField(type, label)}
                                                className="flex items-center gap-2 text-left px-2 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors"
                                            >
                                                <Icon className="w-3 h-3" />
                                                <span>{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Canvas */}
                    <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm p-2">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                Form canvas ({fields.length} field{fields.length === 1 ? '' : 's'} · {sections.length} section{sections.length === 1 ? '' : 's'}
                                {disabledCount > 0 && `, ${disabledCount} disabled`})
                                {fields.length > 1 && (
                                    <span className="ml-2 font-normal normal-case tracking-normal text-gray-400">
                                        drag to move between sections
                                    </span>
                                )}
                            </p>
                            <button
                                onClick={addSection}
                                className="inline-flex items-center gap-1 text-xs font-medium text-regx-orange hover:underline"
                            >
                                <Layers className="w-3.5 h-3.5" />
                                Add section
                            </button>
                        </div>

                        {fields.length === 0 && (
                            <p className="text-sm text-gray-400 italic py-8 text-center">
                                Add a field from the left to get started.
                            </p>
                        )}

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            // Keyboard dragging steps between droppable rects, so they
                            // have to be measured continuously rather than only on drag
                            // start — otherwise the arrow keys find no neighbour to
                            // move to.
                            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                            onDragStart={({ active }) => setActiveKey(active.id)}
                            onDragCancel={() => setActiveKey(null)}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="space-y-4">
                                {groups.map((group, groupIndex) => {
                                    const sectionIndex = group.section
                                        ? sections.findIndex((section) => section.key === group.section.key)
                                        : -1;

                                    const isTarget = !!group.section && group.section.key === targetSectionKey;

                                    return (
                                        <div
                                            key={group.section?.key ?? '__none'}
                                            className={`rounded-xl border transition-colors ${
                                                isTarget
                                                    ? 'border-regx-orange bg-orange-50/30 ring-1 ring-regx-orange/30'
                                                    : group.section
                                                      ? 'border-gray-200 bg-gray-50/60'
                                                      : 'border-dashed border-amber-300 bg-amber-50/40'
                                            }`}
                                        >
                                            {/* Section header — clicking it chooses where new fields go */}
                                            <div
                                                onClick={() => setActiveSection(group.section?.key ?? null)}
                                                className="flex items-start gap-2 px-3 py-2.5 border-b border-gray-200/70 cursor-pointer"
                                            >
                                                <FolderOpen className={`w-4 h-4 mt-0.5 shrink-0 ${group.section ? 'text-regx-orange' : 'text-amber-500'}`} />

                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                                        {group.section ? group.section.title : 'No section'}
                                                        <span className="ml-2 text-xs font-normal text-gray-400">
                                                            {group.fields.length} field{group.fields.length === 1 ? '' : 's'}
                                                        </span>
                                                    </p>

                                                    {group.section ? (
                                                        <p className="text-[11px] text-gray-400 font-mono truncate">
                                                            {group.section.key} · step {group.section.step ?? 1}
                                                            {group.section.description ? ` · ${group.section.description}` : ''}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[11px] text-amber-700">
                                                            Not in any section. Pick one under “Section” in the field’s settings.
                                                        </p>
                                                    )}
                                                </div>

                                                {group.section && (
                                                    <div className="flex items-center gap-0.5 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => moveSection(sectionIndex, -1)}
                                                            disabled={sectionIndex <= 0}
                                                            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-30"
                                                            aria-label="Move section up"
                                                            title="Move section up"
                                                        >
                                                            <ChevronUp className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => moveSection(sectionIndex, 1)}
                                                            disabled={sectionIndex === sections.length - 1}
                                                            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-30"
                                                            aria-label="Move section down"
                                                            title="Move section down"
                                                        >
                                                            <ChevronDown className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => renameSection(group.section.key)}
                                                            className="p-1 rounded text-gray-400 hover:text-regx-orange hover:bg-white"
                                                            aria-label="Rename section"
                                                            title="Rename section"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteSection(group.section.key)}
                                                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-white"
                                                            aria-label="Remove section"
                                                            title="Remove section"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Its fields */}
                                            <div className="p-2">
                                                {group.fields.length === 0 ? (
                                                    <p className="text-xs text-gray-400 italic py-3 text-center">
                                                        Empty — to put a field here, select it and choose this section under “Section” in its settings.
                                                    </p>
                                                ) : (
                                                    <SortableContext
                                                        items={group.fields.map((f) => f.key)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        <div className="space-y-1.5">
                                                            {group.fields.map((field, index) => (
                                                                <SortableFieldRow
                                                                    key={field.key}
                                                                    field={field}
                                                                    index={index}
                                                                    total={group.fields.length}
                                                                    isSelected={selectedKey === field.key}
                                                                    onSelect={selectField}
                                                                    onMove={(i, direction) => moveField(groupIndex, i, direction)}
                                                                />
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Follows the cursor so the row stays readable while it moves. */}
                            <DragOverlay>
                                {activeKey ? (
                                    <SortableFieldRow
                                        field={fields.find((f) => f.key === activeKey)}
                                        index={0}
                                        total={fields.length}
                                        isOverlay
                                    />
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </div>

                    {/* Settings */}
                    <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm h-fit">
                        <FieldSettings
                            field={selected}
                            schema={schema}
                            onChange={updateField}
                            onDelete={deleteField}
                            // Stores a picture for an Image field; the field keeps its key.
                            onUploadImage={async (file) => {
                                const body = new FormData();
                                body.append('image', file);
                                const response = await api.post(`/forms/${formId}/content-image`, body);
                                return response.data;
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Rules */}
            {tab === 'rules' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <RuleBuilder schema={schema} onChange={update} />
                </div>
            )}

            {/* Preview */}
            {tab === 'pricing' && (
                <PricingSettings
                    schema={schema}
                    onChange={update}
                    form={form}
                    gateway={gateway}
                    // Payment collection is a property of the form, not of the
                    // canvas, so it saves immediately rather than waiting for a
                    // structure save.
                    onFormChange={async (patch) => {
                        try {
                            await dispatch(updateForm({ formId, ...patch })).unwrap();
                            toast.success('Payment settings saved.');
                        } catch (error) {
                            toast.error(error || 'Could not save the payment settings.');
                        }
                    }}
                />
            )}

            {/* Open or closed, and when it closes by itself — saved at once. */}
            {tab === 'details' && (
                <RegistrationWindow
                    form={form}
                    onChange={async (patch) => {
                        try {
                            await dispatch(updateForm({ formId, ...patch })).unwrap();
                            toast.success(
                                patch.isActive === false ? 'Form closed — registrations stopped.'
                                    : patch.isActive === true ? 'Form open — taking registrations.'
                                    : patch.closesAt === '' ? 'Automatic closing removed.'
                                    : 'Closing time saved.'
                            );
                        } catch (error) {
                            toast.error(error || 'Could not save.');
                        }
                    }}
                />
            )}

            {tab === 'details' && (
                <FormDetails
                    form={form}
                    event={event}
                    onChange={async (patch) => {
                        try {
                            await dispatch(updateForm({ formId, ...patch })).unwrap();
                            toast.success('Details saved.');
                        } catch (error) {
                            toast.error(error || 'Could not save the details.');
                        }
                    }}
                    onUploadImage={async (which, file) => {
                        try {
                            const result = await dispatch(
                                uploadFormImages({ formId, files: { [which]: file } })
                            ).unwrap();

                            toast.success(result.message || 'Image updated.');
                        } catch (error) {
                            toast.error(error || 'Could not upload the image.');
                        }
                    }}
                    onRemoveImage={async (which) => {
                        try {
                            const result = await dispatch(removeFormImage({ formId, which })).unwrap();
                            toast.success(result.message || 'Image removed.');
                        } catch (error) {
                            toast.error(error || 'Could not remove the image.');
                        }
                    }}
                />
            )}

            {/*
              * How the link looks when it is shared and when it is found. Saved
              * on its own, like the payment settings, because it is a property
              * of the form rather than of the canvas.
              */}
            {/* The participant's email after registering. Saved on its own, like the theme. */}
            {tab === 'email' && (
                <ReceiptEmailSettings
                    form={form}
                    formId={formId}
                    onSave={async (receiptEmail) => {
                        try {
                            await dispatch(updateForm({ formId, settings: { ...(form?.settings ?? {}), receiptEmail } })).unwrap();
                            toast.success('Email saved.');
                        } catch (error) {
                            toast.error(error || 'Could not save the email.');
                        }
                    }}
                />
            )}

            {tab === 'theme' && (
                <ThemeSettings
                    form={form}
                    onChange={async (patch) => {
                        try {
                            await dispatch(updateForm({ formId, ...patch })).unwrap();
                            toast.success('Theme saved.');
                        } catch (error) {
                            toast.error(error || 'Could not save the theme.');
                        }
                    }}
                />
            )}

            {tab === 'seo' && (
                <SeoSettings
                    form={form}
                    event={event}
                    onChange={async (patch) => {
                        try {
                            await dispatch(updateForm({ formId, ...patch })).unwrap();
                            toast.success('Sharing settings saved.');
                        } catch (error) {
                            toast.error(error || 'Could not save the sharing settings.');
                        }
                    }}
                />
            )}

            {tab === 'preview' && (
                <div>
                    <p className="text-sm text-gray-500 mb-4">
                        This is the same component participants use. Try combinations to check your rules.
                        {isDirty && ' Showing your unsaved draft.'}
                    </p>
                    <div className="max-w-2xl">
                        <DynamicForm
                            key={JSON.stringify(previewSchema).length}
                            schema={previewSchema}
                            onSubmit={(values, state) =>
                                toast.success(
                                    `Preview only — category: ${state.category ?? 'none'}, fee: ₹${state.fee ?? 0}`
                                )
                            }
                        />
                    </div>
                </div>
            )}

            {/* Submissions */}
            {tab === 'submissions' && <SubmissionsTable formId={formId} />}

            {/* What the answers add up to, rather than who gave them. */}
            {tab === 'summary' && <SubmissionSummary formId={formId} />}

        </div>
    );
};

export default FormBuilder;

import React, { useEffect, useState } from 'react';
import {
    X, ArrowLeft, Check, Loader2, Sparkles, Users, User, Database, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const control =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none';

/**
 * Picking a template, then saying what it should contain.
 *
 * Two steps. The first shows what is on offer; the second shows the form the
 * template would build, with every field the organiser is allowed to drop, the
 * category data they can import or skip, and the prices. Nothing is created
 * until they say so — and what is created is an ordinary form they can then
 * open in the builder and change however they like.
 */
const TemplatePicker = ({ eventId, onClose, onCreated }) => {
    const [templates, setTemplates] = useState(null);
    const [chosen, setChosen] = useState(null);
    const [config, setConfig] = useState(null);

    const [name, setName] = useState('');
    const [fields, setFields] = useState({});
    const [importData, setImportData] = useState(true);
    const [pricing, setPricing] = useState({ basePrice: 0, discountPercent: 0, perCategory: {} });
    const [creating, setCreating] = useState(false);

    // Where a new form can start from: a ready-made template, or a form that
    // already exists on this account.
    const [source, setSource] = useState('template');

    useEffect(() => {
        api.get('/form-templates', { params: { eventId } })
            .then((response) => setTemplates(response.data || []))
            .catch(() => {
                toast.error('Could not load the templates.');
                setTemplates([]);
            });
    }, [eventId]);

    const choose = async (template) => {
        setChosen(template);
        setConfig(null);

        try {
            const response = await api.get(`/form-templates/${template.key}`);
            const loaded = response.data;

            setConfig(loaded);
            setName(loaded.name);
            setImportData(loaded.data?.default ?? true);
            setPricing({
                basePrice: loaded.pricing?.basePrice ?? 0,
                discountPercent: loaded.pricing?.discountPercent ?? 0,
                // Each age band starts at the fee the template suggests, so a
                // form made without touching the prices matches the template.
                perCategory: Object.fromEntries(
                    (loaded.pricing?.perCategory ?? [])
                        .filter((category) => category.price !== null && category.price !== undefined)
                        .map((category) => [category.value, String(category.price)])
                ),
            });

            // Everything starts on, which is the point of a template.
            setFields(
                Object.fromEntries(
                    loaded.fields.map((field) => [
                        field.key,
                        { on: true, label: field.label, required: field.required },
                    ])
                )
            );
        } catch {
            toast.error('Could not load that template.');
            setChosen(null);
        }
    };

    const setField = (key, patch) =>
        setFields((current) => ({ ...current, [key]: { ...current[key], ...patch } }));

    const create = async () => {
        setCreating(true);

        try {
            // Without an event this creates a form that stands on its own —
            // an application or a feedback round has nothing to hang on one.
            const response = await api.post(
                eventId ? `/events/${eventId}/forms/from-template` : '/forms/from-template',
                {
                    template: chosen.key,
                    name,
                    fields,
                    importData,
                    pricing,
                }
            );

            toast.success(response.message || 'Form created.');
            onCreated?.(response.data, response.validation);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not create the form.');
        } finally {
            setCreating(false);
        }
    };

    // Fields grouped the way the created form will be sectioned.
    const groups = (config?.fields ?? []).reduce((out, field) => {
        (out[field.group] ??= []).push(field);
        return out;
    }, {});

    const keptCount = Object.values(fields).filter((f) => f.on).length;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-xl">
                {/* Header */}
                <div className="flex items-center gap-3 p-5 border-b border-gray-200">
                    {chosen && (
                        <button
                            onClick={() => { setChosen(null); setConfig(null); }}
                            aria-label="Back to the templates"
                            className="p-1.5 -ml-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}

                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-gray-900 truncate">
                            {chosen
                                ? chosen.name
                                : source === 'existing' ? 'Copy an existing form' : 'Start from a template'}
                        </h2>
                        <p className="text-sm text-gray-500 truncate">
                            {chosen
                                ? 'Everything here can be changed later in the builder.'
                                : source === 'existing'
                                    ? 'Same questions, rules and categories — then change what you need.'
                                    : 'A ready-made form you can adjust before creating. Not all of them are registrations.'}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {!chosen && (
                        <div role="tablist" aria-label="Where to start" className="inline-flex p-1 mb-5 rounded-xl bg-gray-100">
                            {[
                                ['template', 'Templates'],
                                ['existing', 'From an existing form'],
                            ].map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={source === key}
                                    onClick={() => setSource(key)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        source === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {!chosen && source === 'template' && <Catalogue templates={templates} onChoose={choose} />}

                    {!chosen && source === 'existing' && (
                        <ExistingForms
                            eventId={eventId}
                            onCreated={(form, validation, message) => {
                                toast.success(message || 'Form created.');
                                onCreated?.(form, validation);
                            }}
                        />
                    )}

                    {chosen && !config && (
                        <div className="flex items-center justify-center py-16 text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    )}

                    {chosen && config && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Form name</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={control}
                                />
                            </div>

                            {/* Fields */}
                            {Object.entries(groups).map(([group, groupFields]) => (
                                <div key={group}>
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        {group}
                                    </h3>

                                    <div className="space-y-1.5">
                                        {groupFields.map((field) => (
                                            <FieldRow
                                                key={field.key}
                                                field={field}
                                                value={fields[field.key]}
                                                onChange={(patch) => setField(field.key, patch)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Default data */}
                            {config.data && (
                                <div className="border border-gray-200 rounded-xl p-4">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={importData}
                                            onChange={(e) => setImportData(e.target.checked)}
                                            className="mt-0.5 w-4 h-4 rounded accent-regx-orange"
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900">{config.data.label}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{config.data.description}</p>

                                            <ul className="mt-2 space-y-0.5">
                                                {config.data.summary.map((line) => (
                                                    <li key={line} className="text-[11px] text-gray-500 font-mono">
                                                        {line}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </label>

                                    {!importData && (
                                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                                            Without the categories the form is created as a draft — you will need to add
                                            them in the builder before it can be published.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Pricing */}
                            {config.pricing.mode !== 'none' && (
                                <Pricing
                                    config={config.pricing}
                                    value={pricing}
                                    onChange={setPricing}
                                    enabled={importData}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {chosen && config && (
                    <div className="flex items-center gap-3 p-5 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mr-auto">
                            {keptCount} field{keptCount === 1 ? '' : 's'} on the form
                        </p>

                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={create}
                            disabled={creating || keptCount === 0}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Create form
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Starting from a form that already exists.
 *
 * Lists every form on the account, whichever event it belongs to, so last
 * season's form can seed this season's — in this event, or on its own when the
 * dialog was opened without one. The copy is an ordinary draft: same fields,
 * rules, categories and prices, with the options below applied on the way.
 */
const ExistingForms = ({ eventId, onCreated }) => {
    const [forms, setForms] = useState(null);
    const [query, setQuery] = useState('');
    const [picked, setPicked] = useState(null);
    const [name, setName] = useState('');
    const [free, setFree] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/events/forms/list')
            .then((response) => setForms(response.data || []))
            .catch(() => {
                toast.error('Could not load your forms.');
                setForms([]);
            });
    }, []);

    const shown = (forms ?? []).filter((form) => {
        const text = `${form.name} ${form.event_name ?? ''}`.toLowerCase();
        return text.includes(query.trim().toLowerCase());
    });

    const choose = (form) => {
        setPicked(form);
        setName(`${form.name} (copy)`);
        setFree(false);
    };

    const create = async () => {
        if (name.trim().length < 2) {
            toast.error('Give the new form a name.');
            return;
        }

        setSaving(true);

        try {
            const response = await api.post(`/forms/${picked.id}/duplicate`, {
                name: name.trim(),
                free,
                // In this event when opened from one, on its own otherwise.
                ...(eventId ? { eventId } : { standalone: true }),
            });

            onCreated(response.data, response.validation, response.message);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not copy the form.');
            setSaving(false);
        }
    };

    if (forms === null) {
        return (
            <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    if (forms.length === 0) {
        return <p className="text-sm text-gray-500 py-8 text-center">You have no forms to copy yet.</p>;
    }

    if (picked) {
        return (
            <div className="space-y-5">
                <button
                    type="button"
                    onClick={() => setPicked(null)}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
                >
                    <ArrowLeft className="w-4 h-4" /> Choose a different form
                </button>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500">Copying</p>
                    <p className="font-semibold text-gray-900">{picked.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {[picked.event_name, `${picked.submission_count} registration${picked.submission_count === 1 ? '' : 's'}`]
                            .filter(Boolean).join(' · ')}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Name of the new form</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} className={control} />
                </div>

                <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200 p-4">
                    <input
                        type="checkbox"
                        checked={free}
                        onChange={(e) => setFree(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded accent-regx-orange"
                    />
                    <span>
                        <span className="block text-sm font-medium text-gray-900">Copy without fees</span>
                        <span className="block text-xs text-gray-500 mt-0.5">
                            Keeps every question and category, but takes every price out and collects nothing.
                        </span>
                    </span>
                </label>

                <p className="text-xs text-gray-500">
                    {eventId
                        ? 'The copy is created in this event, as a draft. Registrations are not copied.'
                        : 'The copy is created on its own, with no event, as a draft. Registrations are not copied.'}
                </p>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={create}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Create copy
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your forms…"
                aria-label="Search your forms"
                className={control}
            />

            {shown.length === 0 && <p className="text-sm text-gray-500 py-6 text-center">No form matches.</p>}

            {shown.map((form) => (
                <button
                    key={form.id}
                    type="button"
                    onClick={() => choose(form)}
                    className="w-full text-left flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-regx-orange hover:bg-orange-50/30 transition-colors"
                >
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">{form.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {[form.event_name, form.status, `${form.submission_count} registration${form.submission_count === 1 ? '' : 's'}`]
                                .filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
            ))}
        </div>
    );
};

const ICONS = { armwrestling: User, cricket: Users, data_collection: Database };

const Catalogue = ({ templates, onChoose }) => {
    if (templates === null) {
        return (
            <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    if (templates.length === 0) {
        return <p className="text-sm text-gray-500 py-8 text-center">No templates are available for this event.</p>;
    }

    return (
        <div className="space-y-3">
            {templates.map((template) => {
                const Icon = ICONS[template.key] ?? Sparkles;

                return (
                    <button
                        key={template.key}
                        onClick={() => onChoose(template)}
                        className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-regx-orange hover:bg-orange-50/30 transition-colors group flex gap-4"
                    >
                        <div className="w-10 h-10 rounded-lg bg-gray-50 group-hover:bg-white flex items-center justify-center shrink-0 transition-colors">
                            <Icon className="w-5 h-5 text-gray-400 group-hover:text-regx-orange transition-colors" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900">{template.name}</p>
                            <p className="text-sm text-gray-500">{template.tagline}</p>

                            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                {template.highlights.map((line) => (
                                    <li key={line} className="text-[11px] text-gray-500 flex items-center gap-1">
                                        <Check className="w-3 h-3 text-green-600 shrink-0" />
                                        {line}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-regx-orange self-center shrink-0 transition-colors" />
                    </button>
                );
            })}
        </div>
    );
};

/**
 * One default field: keep it or not, what to call it, and whether it must be
 * answered. A field the form cannot work without says so instead of offering a
 * checkbox that would break it.
 */
const FieldRow = ({ field, value, onChange }) => (
    <div
        className={`flex items-center gap-3 border rounded-lg px-3 py-2 transition-colors ${
            value?.on ? 'border-gray-200' : 'border-gray-100 bg-gray-50/60'
        }`}
    >
        <input
            type="checkbox"
            checked={field.optional ? (value?.on ?? true) : true}
            disabled={!field.optional}
            onChange={(e) => onChange({ on: e.target.checked })}
            aria-label={`Include ${field.label}`}
            title={field.optional ? undefined : 'This field is needed for the form to work'}
            className="w-4 h-4 rounded accent-regx-orange disabled:opacity-40 shrink-0"
        />

        <input
            value={value?.label ?? field.label}
            disabled={!value?.on}
            onChange={(e) => onChange({ label: e.target.value })}
            aria-label={`Label for ${field.label}`}
            className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 outline-none focus:bg-white focus:ring-1 focus:ring-regx-orange rounded px-1.5 py-1 disabled:text-gray-400"
        />

        <span className="text-[11px] text-gray-400 font-mono shrink-0 hidden sm:inline">{field.type}</span>

        <label className="flex items-center gap-1.5 text-[11px] text-gray-500 shrink-0 cursor-pointer">
            <input
                type="checkbox"
                checked={value?.required ?? field.required}
                disabled={!value?.on}
                onChange={(e) => onChange({ required: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-regx-orange disabled:opacity-40"
            />
            Required
        </label>
    </div>
);

const Pricing = ({ config, value, onChange, enabled }) => (
    <div className="border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-900">Registration price</h3>
        <p className="text-xs text-gray-500 mt-0.5">{config.note}</p>

        <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    {config.mode === 'per_entry' ? 'Price per entry' : 'Price per team'} ({config.currency})
                </label>
                <input
                    type="number"
                    min="0"
                    value={value.basePrice}
                    onChange={(e) => onChange({ ...value, basePrice: e.target.value })}
                    className={control}
                />
            </div>

            {config.mode === 'per_entry' && (
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Repeat-category discount (%)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={value.discountPercent}
                        onChange={(e) => onChange({ ...value, discountPercent: e.target.value })}
                        className={control}
                    />
                </div>
            )}
        </div>

        {/* A category that costs something different from the rest. */}
        {enabled && config.perCategory.length > 0 && (
            <div className="mt-4">
                <p className="text-xs font-medium text-gray-600 mb-2">
                    Different price for a category? Leave blank to use the price above.
                </p>

                <div className="grid sm:grid-cols-2 gap-2">
                    {config.perCategory.map((category) => (
                        <div key={category.value} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-28 shrink-0">{category.label}</span>
                            <input
                                type="number"
                                min="0"
                                placeholder={String(value.basePrice)}
                                value={value.perCategory[category.value] ?? ''}
                                onChange={(e) =>
                                    onChange({
                                        ...value,
                                        perCategory: { ...value.perCategory, [category.value]: e.target.value },
                                    })
                                }
                                className={`${control} py-1.5`}
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);

export default TemplatePicker;

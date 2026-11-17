import React from 'react';
import { Plus, Trash2, Eye, EyeOff, IndianRupee, ImagePlus, Loader2 } from 'lucide-react';

const input =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none';

const CHOICE_TYPES = ['select', 'multiselect', 'radio', 'checkbox', 'gender', 'category', 'country', 'state', 'city'];
const TEXTY_TYPES = ['text', 'textarea', 'email', 'phone', 'address', 'signature', 'medical'];
const CODE_BLOCK_LIMIT = 12000;

const Row = ({ label, children, hint }) => (
    <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        {children}
        {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
);

/**
 * Settings panel for the field selected on the canvas.
 *
 * Which controls appear depends on the field type — a number field gets
 * min/max, a choice field gets an option editor, a dependent field gets its
 * parent picker.
 */
/**
 * The picture for an Image field: upload or replace it, and choose how wide
 * it shows. The field stores the key the server returns; the server turns it
 * into a working URL whenever the form is shown.
 */
const ImagePicker = ({ field, setConfig, onUpload }) => {
    const inputRef = React.useRef(null);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState(null);

    const choose = async (file) => {
        if (!file || !onUpload) return;

        setBusy(true);
        setError(null);

        try {
            const { key, url } = await onUpload(file);
            setConfig({ imageKey: key, imageUrl: url });
        } catch (e) {
            setError(e?.response?.data?.messages?.image || 'The image could not be uploaded.');
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const url = field.config?.imageUrl;

    return (
        <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Picture</p>

            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="relative w-full aspect-video rounded-xl border border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center hover:border-regx-orange transition-colors disabled:cursor-wait"
            >
                {url ? (
                    <img src={url} alt="" className="w-full h-full object-contain" />
                ) : (
                    <span className="flex flex-col items-center gap-1 text-xs text-gray-500">
                        <ImagePlus className="w-6 h-6 text-gray-400" />
                        Click to upload — JPG, PNG, WebP or GIF
                    </span>
                )}
                {busy && (
                    <span className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                    </span>
                )}
            </button>

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => choose(e.target.files?.[0])}
            />

            {url && (
                <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="text-xs font-medium text-regx-orange hover:underline">
                    Replace picture
                </button>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Width on the form</p>
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                    {[['small', 'Small'], ['medium', 'Medium'], ['full', 'Full']].map(([size, label]) => (
                        <button
                            key={size}
                            type="button"
                            onClick={() => setConfig({ size })}
                            aria-pressed={(field.config?.size ?? 'full') === size}
                            className={`px-3 py-1 rounded-md text-xs font-medium ${
                                (field.config?.size ?? 'full') === size ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const FieldSettings = ({ field, schema, onChange, onDelete, onUploadImage }) => {
    if (!field) {
        return (
            <div className="p-6 text-center">
                <p className="text-sm text-gray-400">Select a field on the canvas to edit it.</p>
            </div>
        );
    }

    const set = (patch) => onChange({ ...field, ...patch });
    const setConfig = (patch) => set({ config: { ...(field.config || {}), ...patch } });

    const isChoice = CHOICE_TYPES.includes(field.type);
    const isDependent = field.optionsSource === 'dependent';

    // Absent means on the form: a schema saved before disabling existed must
    // not read as every field switched off.
    const enabled = field.enabled !== false;

    /**
     * The entry grid, if any, that takes its per-entry price from this field's
     * options. When there is one, each option carries a price — so it belongs
     * here next to the option, as well as on the Fees tab.
     */
    const pricedByGrid = (schema.fields || []).find(
        (grid) =>
            grid.type === 'category_entries' &&
            (grid.config?.columns || []).some(
                (column) => column.key === grid.config?.priceFrom && column.optionsFrom === field.key
            )
    );

    const options = field.options || [];

    const setOption = (index, patch) =>
        set({ options: options.map((o, i) => (i === index ? { ...o, ...patch } : o)) });

    const addOption = () =>
        set({ options: [...options, { label: '', value: '', parentValue: null, meta: {}, active: true }] });

    const removeOption = (index) => set({ options: options.filter((_, i) => i !== index) });

    /**
     * What this one option costs. It rides on the option's own meta so it
     * travels with the option — into the published snapshot a registration is
     * later priced against, and into any copy of the form.
     */
    const setPrice = (index, price) => {
        const cleared = price === '' || price === null || Number.isNaN(Number(price));

        setOption(index, {
            meta: cleared
                ? Object.fromEntries(Object.entries(options[index].meta || {}).filter(([key]) => key !== 'price'))
                : { ...(options[index].meta || {}), price: Number(price) },
        });
    };

    // ------------------------------------------------------ entry grid columns
    const columns = field.config?.columns || [];

    const setColumn = (index, patch) =>
        setConfig({ columns: columns.map((c, i) => (i === index ? { ...c, ...patch } : c)) });

    const addColumn = () => {
        const taken = new Set(columns.map((c) => c.key));

        let key = 'column';
        let n = 2;
        while (taken.has(key)) key = 'column_' + n++;

        setConfig({ columns: [...columns, { key, label: '', type: 'select', optionsFrom: null }] });
    };

    /**
     * Removing a column takes the settings that pointed at it with it, so the
     * grid is never left pricing or de-duplicating on a column that is gone.
     */
    const removeColumn = (index) => {
        const removed = columns[index];
        const next = columns.filter((_, i) => i !== index);

        setConfig({
            columns: next.map((c) =>
                c.dependsOn === removed.key ? { ...c, dependsOn: undefined, parentKeys: undefined } : c
            ),
            matchOn: (field.config?.matchOn || []).filter((k) => k !== removed.key),
            priceFrom: field.config?.priceFrom === removed.key ? null : field.config?.priceFrom,
        });
    };

    const choiceFields = (schema.fields || []).filter((f) => CHOICE_TYPES.includes(f.type));

    // --------------------------------------------------------- terms wording
    const terms = (field.config?.termsText || '').trim();
    const linkFound =
        terms !== '' &&
        (field.config?.text || 'I accept the terms and conditions.')
            .toLowerCase()
            .includes(((field.config?.linkText || '').trim() || 'terms and conditions').toLowerCase());

    // Candidate parents: any other choice field on the form.
    const parentCandidates = (schema.fields || [])
        .filter((f) => f.key !== field.key && CHOICE_TYPES.includes(f.type));

    const parentField = parentCandidates.find((f) => f.key === field.optionsParentKey);

    /**
     * Names a parent option with its value beside the label.
     *
     * "Sub-Junior" for men and "Sub-Junior" for women read the same but are
     * different options, told apart only by their value (sub_jr_m, sub_jr_f) —
     * so the value is always shown, exactly as stored.
     */
    const parentOptionName = (po) => `${po.label} (${po.value})`;

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{field.label || field.key}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{field.type}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => set({ enabled: !enabled })}
                        title={enabled ? 'Take this field off the form, keeping its settings' : 'Put this field back on the form'}
                        className={`p-1.5 rounded-lg transition-colors ${
                            enabled
                                ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                                : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                        }`}
                    >
                        {enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        title="Delete this field and everything set on it"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/*
              * Disabling is the reversible half of deleting: the field stops
              * appearing on the live form and stops being asked for, but its
              * options, prices, validation and rules stay exactly as they are
              * until somebody switches it back on.
              */}
            <div
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${
                    enabled ? 'border-gray-200 bg-gray-50/60' : 'border-amber-300 bg-amber-50'
                }`}
            >
                <input
                    id="field-enabled"
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => set({ enabled: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded accent-regx-orange shrink-0"
                />
                <label htmlFor="field-enabled" className="text-sm text-gray-800 cursor-pointer">
                    {enabled ? 'On the form' : 'Disabled'}
                    <span className="block text-[11px] text-gray-500 mt-0.5">
                        {enabled
                            ? 'Turn this off to stop asking the question without losing anything set up here.'
                            : 'Kept with all its settings, but not shown on the live form and not asked for. Publish to apply.'}
                    </span>
                </label>
            </div>

            {field.type === 'display_image' && (
                <ImagePicker field={field} setConfig={setConfig} onUpload={onUploadImage} />
            )}

            {field.type === 'code_block' && (
                <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                    <p className="text-xs text-blue-900">
                        Static form content. Safe HTML and scoped CSS are allowed; scripts, forms, embeds and external resources are removed.
                    </p>
                    <Row label="HTML" hint={`${(field.config?.html || '').length}/${CODE_BLOCK_LIMIT} characters`}>
                        <textarea
                            className={`${input} min-h-40 resize-y font-mono text-xs`}
                            value={field.config?.html || ''}
                            maxLength={CODE_BLOCK_LIMIT}
                            onChange={(e) => setConfig({ html: e.target.value })}
                            placeholder="<div class=&quot;notice&quot;><strong>Welcome</strong><p>Enter instructions here.</p></div>"
                            spellCheck="false"
                        />
                    </Row>
                    <Row
                        label="CSS"
                        hint={`Styles are limited to this block. Selectors are simple element/class names; external resources and scripts are blocked. ${(field.config?.css || '').length}/${CODE_BLOCK_LIMIT} characters`}
                    >
                        <textarea
                            className={`${input} min-h-32 resize-y font-mono text-xs`}
                            value={field.config?.css || ''}
                            maxLength={CODE_BLOCK_LIMIT}
                            onChange={(e) => setConfig({ css: e.target.value })}
                            placeholder=".notice { background-color: #fff7ed; padding: 16px; border-radius: 8px; }"
                            spellCheck="false"
                        />
                    </Row>
                    <Row label="Block height" hint="Fixed height in pixels; content scrolls inside the block when needed.">
                        <input
                            type="number"
                            min="40"
                            max="1000"
                            step="10"
                            className={input}
                            value={field.config?.height ?? 180}
                            onChange={(e) => {
                                const height = e.target.value === '' ? undefined : Number(e.target.value);
                                setConfig({ height });
                            }}
                        />
                    </Row>
                </div>
            )}

            <Row
                label={field.type === 'display_image' ? 'Description (for screen readers)' : 'Label'}
                hint={field.type === 'display_image' ? 'Not shown on the form; read aloud to people who cannot see the picture.' : undefined}
            >
                <input className={input} value={field.label || ''} onChange={(e) => set({ label: e.target.value })} />
            </Row>

            <Row label="Field name" hint="Used by rules and stored on submissions. Letters, numbers and underscores.">
                <input
                    className={`${input} font-mono text-xs`}
                    value={field.key || ''}
                    onChange={(e) => set({ key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() })}
                />
            </Row>

            <Row label="Section">
                <select
                    className={input}
                    value={field.section || ''}
                    onChange={(e) => set({ section: e.target.value || null })}
                >
                    <option value="">No section</option>
                    {(schema.sections || []).map((section) => (
                        <option key={section.key} value={section.key}>
                            {section.title} (step {section.step})
                        </option>
                    ))}
                </select>
            </Row>

            {!['heading', 'hidden', 'calculated', 'display_image', 'code_block'].includes(field.type) && (
                <Row label="Placeholder">
                    <input
                        className={input}
                        value={field.placeholder || ''}
                        onChange={(e) => set({ placeholder: e.target.value })}
                    />
                </Row>
            )}

            <Row label={field.type === 'display_image' ? 'Caption (shown under the picture)' : 'Help text'}>
                <input
                    className={input}
                    value={field.helpText || ''}
                    onChange={(e) => set({ helpText: e.target.value })}
                />
            </Row>

            <div className="flex items-center gap-5 pt-1">
                {/* A picture asks nothing, so it cannot be required. */}
                {!['display_image', 'code_block'].includes(field.type) && (
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!field.required}
                        onChange={(e) => set({ required: e.target.checked })}
                        className="w-4 h-4 rounded text-regx-orange focus:ring-regx-orange/30"
                    />
                    Required
                </label>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!field.hidden}
                        onChange={(e) => set({ hidden: e.target.checked })}
                        className="w-4 h-4 rounded text-regx-orange focus:ring-regx-orange/30"
                    />
                    Hidden until a rule shows it
                </label>
            </div>

            {/* ---------------------------------------------------- validation */}
            {(TEXTY_TYPES.includes(field.type) || field.type === 'number') && (
                <div className="pt-3 border-t border-gray-100 space-y-3">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Validation</p>

                    {field.type === 'number' ? (
                        <div className="grid grid-cols-2 gap-3">
                            <Row label="Minimum">
                                <input
                                    type="number"
                                    className={input}
                                    value={field.config?.min ?? ''}
                                    onChange={(e) => setConfig({ min: e.target.value === '' ? undefined : Number(e.target.value) })}
                                />
                            </Row>
                            <Row label="Maximum">
                                <input
                                    type="number"
                                    className={input}
                                    value={field.config?.max ?? ''}
                                    onChange={(e) => setConfig({ max: e.target.value === '' ? undefined : Number(e.target.value) })}
                                />
                            </Row>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <Row label="Min length">
                                <input
                                    type="number"
                                    className={input}
                                    value={field.config?.minLength ?? ''}
                                    onChange={(e) => setConfig({ minLength: e.target.value === '' ? undefined : Number(e.target.value) })}
                                />
                            </Row>
                            <Row label="Max length">
                                <input
                                    type="number"
                                    className={input}
                                    value={field.config?.maxLength ?? ''}
                                    onChange={(e) => setConfig({ maxLength: e.target.value === '' ? undefined : Number(e.target.value) })}
                                />
                            </Row>
                        </div>
                    )}

                    {TEXTY_TYPES.includes(field.type) && (
                        <Row label="Pattern" hint="A regular expression, without slashes. Leave blank for none.">
                            <input
                                className={`${input} font-mono text-xs`}
                                value={field.config?.pattern || ''}
                                onChange={(e) => setConfig({ pattern: e.target.value || undefined })}
                                placeholder="^[A-Z]{2}[0-9]{4}$"
                            />
                        </Row>
                    )}
                </div>
            )}

            {/* ------------------------------------------------------- options */}
            {isChoice && (
                <div className="pt-3 border-t border-gray-100 space-y-3">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Options</p>

                    <Row label="Where options come from">
                        <select
                            className={input}
                            value={field.optionsSource || 'static'}
                            onChange={(e) => set({ optionsSource: e.target.value })}
                        >
                            <option value="static">A fixed list I enter</option>
                            <option value="dependent">Filtered by another field</option>
                            <option value="dataset">From event configuration</option>
                        </select>
                    </Row>

                    {isDependent && (
                        <Row
                            label="Filtered by"
                            hint="Each option below only appears when this field holds the matching value."
                        >
                            <select
                                className={input}
                                value={field.optionsParentKey || ''}
                                onChange={(e) => set({ optionsParentKey: e.target.value || null })}
                            >
                                <option value="">Choose a field…</option>
                                {parentCandidates.map((f) => (
                                    <option key={f.key} value={f.key}>{f.label || f.key}</option>
                                ))}
                            </select>
                        </Row>
                    )}

                    <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!field.config?.autoSelectSingle}
                            onChange={(e) => setConfig({ autoSelectSingle: e.target.checked || undefined })}
                            className="w-4 h-4 mt-0.5 rounded text-regx-orange focus:ring-regx-orange/30 shrink-0"
                        />
                        <span>
                            Hide when there is only one option
                            <span className="block text-[11px] text-gray-400">
                                Selects it automatically instead of showing a list of one.
                            </span>
                        </span>
                    </label>

                    {field.optionsSource === 'dataset' && (
                        <Row label="Data source">
                            <select
                                className={input}
                                value={field.optionsDataset || ''}
                                onChange={(e) => set({ optionsDataset: e.target.value || null })}
                            >
                                <option value="">Choose a source…</option>
                                <option value="participant_types">Participant types (from the sport format)</option>
                                <option value="event_subtypes">Subtypes of this event's type</option>
                            </select>
                        </Row>
                    )}

                    {field.optionsSource !== 'dataset' && (
                        <div className="space-y-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex items-start gap-1.5">
                                    <div className="flex-1 grid grid-cols-2 gap-1.5 p-1">
                                        <input
                                            className={`${input} py-1.5`}
                                            placeholder="Label"
                                            value={option.label || ''}
                                            onChange={(e) => setOption(index, { label: e.target.value })}
                                        />
                                        <input
                                            className={`${input} py-1.5 font-mono text-xs`}
                                            placeholder="value"
                                            value={option.value || ''}
                                            onChange={(e) => setOption(index, { value: e.target.value })}
                                        />

                                        {isDependent && (
                                            <select
                                                className={`${input} py-1.5 col-span-2`}
                                                value={option.parentValue || ''}
                                                onChange={(e) => setOption(index, { parentValue: e.target.value || null })}
                                            >
                                                <option value="">Show for every value</option>
                                                {(parentField?.options || []).map((po) => (
                                                    <option key={po.value} value={po.value}>
                                                        {parentField.label} = {parentOptionName(po)}
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        {pricedByGrid && (
                                            <div className="col-span-2 relative">
                                                <IndianRupee className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className={`${input} py-1.5 pl-7`}
                                                    placeholder={`Price — ${
                                                        pricedByGrid.config?.basePrice ?? 0
                                                    } by default`}
                                                    value={option.meta?.price ?? ''}
                                                    onChange={(e) => setPrice(index, e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeOption(index)}
                                        className="p-1.5 mt-0.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addOption}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-regx-orange hover:underline"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add option
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ------------------------------------------- category entry grid */}
            {field.type === 'category_entries' && (
                <div className="pt-3 border-t border-gray-100 space-y-3">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Entry grid</p>

                    <p className="text-[11px] text-gray-500">
                        Each row a participant adds is one entry. The columns are the choices they make
                        for it, and every column takes its options from a field on this form.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        <Row label="Fewest entries">
                            <input
                                type="number"
                                min="0"
                                className={input}
                                value={field.config?.minEntries ?? ''}
                                onChange={(e) =>
                                    setConfig({ minEntries: e.target.value === '' ? undefined : Number(e.target.value) })
                                }
                            />
                        </Row>
                        <Row label="Most entries">
                            <input
                                type="number"
                                min="1"
                                className={input}
                                value={field.config?.maxEntries ?? ''}
                                onChange={(e) =>
                                    setConfig({ maxEntries: e.target.value === '' ? undefined : Number(e.target.value) })
                                }
                            />
                        </Row>
                    </div>

                    <div className="space-y-2">
                        {columns.length === 0 && (
                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                                This grid has no columns yet, so there is nothing for a participant to pick.
                            </p>
                        )}

                        {columns.map((column, index) => (
                            <div key={index} className="rounded-lg border border-gray-200 p-2 space-y-1.5">
                                <div className="flex items-start gap-1.5">
                                    <input
                                        className={`${input} py-1.5`}
                                        placeholder="Column heading"
                                        value={column.label || ''}
                                        onChange={(e) => setColumn(index, { label: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeColumn(index)}
                                        title="Remove this column"
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <select
                                    className={`${input} py-1.5`}
                                    value={column.optionsFrom || ''}
                                    onChange={(e) => setColumn(index, { optionsFrom: e.target.value || null })}
                                >
                                    <option value="">Choices come from…</option>
                                    {choiceFields.map((f) => (
                                        <option key={f.key} value={f.key}>
                                            {f.label || f.key}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    className={`${input} py-1.5`}
                                    value={column.dependsOn || ''}
                                    onChange={(e) =>
                                        setColumn(index, {
                                            dependsOn: e.target.value || undefined,
                                            // The cascade reads parentKeys; keep the two in step so a
                                            // column edited here behaves like one that came from a template.
                                            parentKeys: e.target.value ? [e.target.value] : undefined,
                                        })
                                    }
                                >
                                    <option value="">Always offers every choice</option>
                                    {columns
                                        .filter((_, i) => i !== index)
                                        .map((other) => (
                                            <option key={other.key} value={other.key}>
                                                Narrowed by {other.label || other.key}
                                            </option>
                                        ))}
                                </select>

                                <p className="text-[10px] text-gray-400 font-mono">{column.key}</p>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addColumn}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-regx-orange hover:underline"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add column
                        </button>
                    </div>

                    <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
                        <IndianRupee className="w-3 h-3 mt-0.5 shrink-0 text-gray-400" />
                        <span>
                            What each entry costs is set on the <strong className="font-medium">Fees</strong> tab.
                        </span>
                    </p>
                </div>
            )}

            {/* ------------------------------------------------ terms wording */}
            {field.type === 'terms' && (
                <div className="pt-3 border-t border-gray-100 space-y-3">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Terms &amp; conditions
                    </p>

                    <Row
                        label="Wording beside the checkbox"
                        hint="One line. Leave blank for “I accept the terms and conditions.”"
                    >
                        <textarea
                            rows={2}
                            className={input}
                            placeholder="I accept the terms and conditions."
                            value={field.config?.text || ''}
                            onChange={(e) => setConfig({ text: e.target.value })}
                        />
                    </Row>

                    <Row
                        label="The terms themselves"
                        hint={
                            terms === ''
                                ? 'Leave this blank and the wording above stays plain text, as it is today.'
                                : 'Line breaks are kept. Participants read this in a popup without leaving the form.'
                        }
                    >
                        <textarea
                            rows={8}
                            className={`${input} leading-relaxed`}
                            placeholder={'1. Entry is confirmed once the form is submitted.\n2. Fees are non-refundable.\n…'}
                            value={field.config?.termsText || ''}
                            onChange={(e) => setConfig({ termsText: e.target.value || undefined })}
                        />
                    </Row>

                    {terms !== '' && (
                        <>
                            <Row
                                label="Words that open the popup"
                                hint={
                                    linkFound
                                        ? 'These words in the wording above become the link.'
                                        : 'Not found in the wording above, so a “Read them” link is shown after it instead.'
                                }
                            >
                                <input
                                    className={input}
                                    placeholder="terms and conditions"
                                    value={field.config?.linkText || ''}
                                    onChange={(e) => setConfig({ linkText: e.target.value || undefined })}
                                />
                            </Row>

                            <Row label="Heading of the popup" hint={`Leave blank to use “${field.label || 'Terms & Conditions'}”.`}>
                                <input
                                    className={input}
                                    placeholder={field.label || 'Terms & Conditions'}
                                    value={field.config?.termsTitle || ''}
                                    onChange={(e) => setConfig({ termsTitle: e.target.value || undefined })}
                                />
                            </Row>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default FieldSettings;

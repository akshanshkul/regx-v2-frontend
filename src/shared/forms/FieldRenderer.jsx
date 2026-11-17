import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Paperclip, Loader2, AlertTriangle } from 'lucide-react';
import LocationField from './LocationField';
import { sanitizeCodeBlockCss, sanitizeCodeBlockHtml } from './sanitizeCodeBlock';

const base =
    'rf-input w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none disabled:bg-gray-50 disabled:text-gray-400';

/**
 * Renders one field of any supported type from its schema definition.
 *
 * Knows nothing about rules — visibility, required-ness, the options to offer
 * and the disabled state are all decided by the engine and passed in, so the
 * same component serves the public form, the preview and the builder canvas.
 */
/**
 * The value a location field cascades from: a state hangs off whichever field
 * asks for the country, a district off whichever asks for the state.
 *
 * Found by field type rather than by a configured key, so a template and a
 * hand-built form behave the same without either naming the other's keys.
 */
/**
 * The consent checkbox, with the terms themselves a click away.
 *
 * Organisers write terms that run to several paragraphs; printing them beside
 * a checkbox buries the rest of the form, and linking away from a half-filled
 * form loses the answers. So the wording stays one line and the full text opens
 * over the page.
 *
 * Its own component because it needs state, and a hook cannot live inside the
 * renderer's switch.
 */
const TermsField = ({ field, value, disabled, onChange }) => {
    const [open, setOpen] = useState(false);

    const config = field.config || {};
    const label = config.text || 'I accept the terms and conditions.';
    const terms = (config.termsText || '').trim();
    const linkText = (config.linkText || '').trim() || 'terms and conditions';
    const title = (config.termsTitle || '').trim() || field.label || 'Terms & Conditions';

    // Escape closes it, and the page behind stays put rather than scrolling
    // under the dialog.
    useEffect(() => {
        if (!open) return undefined;

        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };

        const previous = document.body.style.overflow;

        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previous;
        };
    }, [open]);

    const show = (e) => {
        // The checkbox is the label's control; opening the terms must not tick it.
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
    };

    const link = (text) => (
        <button
            type="button"
            onClick={show}
            className="text-regx-orange font-medium underline underline-offset-2 hover:text-orange-600 focus:outline-none focus:ring-1 focus:ring-regx-orange rounded-sm"
        >
            {text}
        </button>
    );

    /**
     * The wording as written, with the link words inside it made clickable.
     * When those words are not in the wording — or the organiser wrote nothing
     * to link to — the sentence is left exactly as typed.
     */
    const wording = () => {
        if (terms === '') return label;

        const at = label.toLowerCase().indexOf(linkText.toLowerCase());

        if (at < 0) {
            return (
                <>
                    {label} {link('Read them')}
                </>
            );
        }

        return (
            <>
                {label.slice(0, at)}
                {link(label.slice(at, at + linkText.length))}
                {label.slice(at + linkText.length)}
            </>
        );
    };

    return (
        <>
            <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
                <input
                    type="checkbox"
                    disabled={disabled}
                    checked={value === true || value === 'true'}
                    onChange={(e) => onChange(field.key, e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-regx-orange focus:ring-regx-orange/30 shrink-0"
                />
                <span>{wording()}</span>
            </label>

            {/* Rendered into the page body, not here: a card with a blur or
                transform (the form themes use them) turns "fixed" into "fixed
                to this card", which is how the popup ended up cut off inside it. */}
            {open && createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                    onClick={() => setOpen(false)}
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-8"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl w-full max-w-2xl max-h-full flex flex-col overflow-hidden shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 shrink-0">
                            <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
                            <button
                                type="button"
                                autoFocus
                                onClick={() => setOpen(false)}
                                aria-label="Close"
                                className="p-1.5 -m-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                            {terms}
                        </div>

                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(field.key, true);
                                        setOpen(false);
                                    }}
                                    className="px-5 py-2 bg-regx-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                                >
                                    I accept
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

/**
 * A file attached to an answer.
 *
 * The file is sent as soon as it is picked rather than with the submission, for
 * two reasons: the submit path stays plain JSON, and somebody attaching a scan
 * that is too big finds out straight away instead of after filling in the rest
 * of the form. What the answer then holds is a reference to the stored file —
 * `{ key, name, size, type, url }` — not the file and not merely its name.
 *
 * Without somewhere to upload to (the builder's preview) the control says so
 * rather than pretending: a picker that silently keeps nothing is how this
 * field came to record filenames and no files in the first place.
 */
const FileField = ({ field, value, disabled, onChange, onUpload }) => {
    const input = useRef(null);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(null);

    const attached = value && typeof value === 'object' && value.key ? value : null;

    const pick = async (file) => {
        if (!file) return;

        setFailed(null);
        setBusy(true);

        try {
            const stored = await onUpload(field, file);

            if (stored) onChange(stored);
        } catch (message) {
            setFailed(typeof message === 'string' ? message : 'That file could not be uploaded.');
        } finally {
            setBusy(false);
            // Cleared so picking the same file again still fires a change.
            if (input.current) input.current.value = '';
        }
    };

    if (!onUpload) {
        return (
            <p className="text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg px-4 py-3">
                File uploads are not available here.
            </p>
        );
    }

    return (
        <div>
            <input
                ref={input}
                type="file"
                className="hidden"
                disabled={disabled || busy}
                accept={field.config?.accept || (field.type === 'image' ? 'image/*' : undefined)}
                onChange={(e) => pick(e.target.files?.[0])}
            />

            {attached ? (
                <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50/60">
                    {field.type === 'image' && attached.url ? (
                        <img src={attached.url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    ) : (
                        <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                    )}

                    <div className="min-w-0 flex-1">
                        <a
                            href={attached.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-sm text-gray-900 truncate hover:underline"
                        >
                            {attached.name}
                        </a>
                        {attached.size > 0 && (
                            <span className="text-[11px] text-gray-400">{readableSize(attached.size)}</span>
                        )}
                    </div>

                    {!disabled && (
                        <button
                            type="button"
                            onClick={() => input.current?.click()}
                            className="text-xs font-medium text-regx-orange hover:underline shrink-0"
                        >
                            Replace
                        </button>
                    )}

                    {!disabled && (
                        <button
                            type="button"
                            onClick={() => onChange(null)}
                            aria-label="Remove this file"
                            className="p-1 rounded text-gray-400 hover:text-red-600 shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    disabled={disabled || busy}
                    onClick={() => input.current?.click()}
                    className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-regx-orange hover:text-regx-orange transition-colors disabled:opacity-50"
                >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {busy ? 'Uploading…' : field.placeholder || 'Choose a file'}
                </button>
            )}

            {failed && (
                <p className="text-xs text-red-600 mt-1.5 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                    {failed}
                </p>
            )}
        </div>
    );
};

const readableSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const locationParentId = (level, schema, answers) => {
    const parentType = { state: 'country', district: 'state' }[level];

    if (!parentType) return null;

    const parent = (schema?.fields ?? []).find((f) => f.type === parentType);

    return parent ? answers[parent.key] || null : null;
};

const FieldRenderer = ({ field, value, options = [], answers = {}, schema, disabled = false, required = false, error, onChange, onUpload }) => {
    const id = `f_${field.key}`;
    const common = {
        id,
        name: field.key,
        disabled,
        placeholder: field.placeholder || '',
        className: `${base} ${error ? 'border-red-400 focus:ring-red-300 focus:border-red-400' : ''}`,
    };

    const set = (v) => onChange(field.key, v);

    const toggleInList = (list, entry, on) => {
        const current = Array.isArray(list) ? list : [];
        return on ? [...new Set([...current, entry])] : current.filter((v) => v !== entry);
    };

    const control = () => {
        switch (field.type) {
            case 'heading':
                return null;

            case 'textarea':
            case 'medical':
                return (
                    <textarea
                        {...common}
                        rows={field.type === 'medical' ? 3 : 4}
                        value={value ?? ''}
                        onChange={(e) => set(e.target.value)}
                    />
                );

            case 'number':
                return (
                    <input
                        {...common}
                        type="number"
                        min={field.config?.min}
                        max={field.config?.max}
                        value={value ?? ''}
                        onChange={(e) => set(e.target.value)}
                    />
                );

            case 'calculated':
                return (
                    <input
                        {...common}
                        type="text"
                        readOnly
                        value={value ?? ''}
                        className={`${base} bg-gray-50 text-gray-700 font-medium`}
                    />
                );

            case 'email':
                return <input {...common} type="email" value={value ?? ''} onChange={(e) => set(e.target.value)} />;

            case 'phone':
                return <input {...common} type="tel" value={value ?? ''} onChange={(e) => set(e.target.value)} />;

            case 'date':
                return <input {...common} type="date" value={value ?? ''} onChange={(e) => set(e.target.value)} />;

            case 'time':
                return <input {...common} type="time" value={value ?? ''} onChange={(e) => set(e.target.value)} />;

            case 'datetime':
                return <input {...common} type="datetime-local" value={value ?? ''} onChange={(e) => set(e.target.value)} />;

            // Location fields read the shared master data and cascade off one
            // another, so they fetch their own options rather than taking the
            // schema's. The value stored is the row id.
            case 'country':
            case 'state':
            case 'district':
                return (
                    <LocationField
                        field={field}
                        level={field.type}
                        parentId={locationParentId(field.type, schema, answers)}
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        error={error}
                    />
                );

            case 'select':
            case 'gender':
            case 'city':
            case 'category':
                // A choice field with no options but a value was assigned by a
                // rule, not picked — show the outcome rather than an empty
                // dropdown the participant cannot use.
                if (options.length === 0 && value !== undefined && value !== null && value !== '') {
                    return (
                        <div className={`${base} bg-gray-50 text-gray-900 font-medium`}>{String(value)}</div>
                    );
                }

                return (
                    <select {...common} value={value ?? ''} onChange={(e) => set(e.target.value)}>
                        <option value="">
                            {options.length === 0
                                ? 'Choose the field above first'
                                : field.placeholder || 'Select…'}
                        </option>
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );

            case 'multiselect':
                return (
                    <select
                        {...common}
                        multiple
                        value={Array.isArray(value) ? value : []}
                        onChange={(e) => set([...e.target.selectedOptions].map((o) => o.value))}
                        className={`${common.className} min-h-[110px]`}
                    >
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );

            case 'radio':
                return (
                    <div className="space-y-2">
                        {options.length === 0 && (
                            <p className="text-sm text-gray-400 italic">Choose the field above first</p>
                        )}
                        {options.map((option) => (
                            <label key={option.value} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name={field.key}
                                    value={option.value}
                                    disabled={disabled}
                                    checked={String(value ?? '') === String(option.value)}
                                    onChange={() => set(option.value)}
                                    className="w-4 h-4 text-regx-orange focus:ring-regx-orange/30"
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>
                );

            case 'checkbox':
                return (
                    <div className="space-y-2">
                        {options.map((option) => (
                            <label key={option.value} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={disabled}
                                    checked={Array.isArray(value) && value.includes(option.value)}
                                    onChange={(e) => set(toggleInList(value, option.value, e.target.checked))}
                                    className="w-4 h-4 rounded text-regx-orange focus:ring-regx-orange/30"
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>
                );

            case 'yes_no':
                return (
                    <div className="flex gap-3">
                        {[['Yes', 'yes'], ['No', 'no']].map(([label, v]) => (
                            <label key={v} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name={field.key}
                                    disabled={disabled}
                                    checked={value === v}
                                    onChange={() => set(v)}
                                    className="w-4 h-4 text-regx-orange focus:ring-regx-orange/30"
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                );

            case 'terms':
                return <TermsField field={field} value={value} disabled={disabled} onChange={onChange} />;

            case 'file':
            case 'image':
                return (
                    <FileField
                        field={field}
                        value={value}
                        disabled={disabled}
                        onChange={set}
                        onUpload={onUpload}
                    />
                );

            case 'address':
                return (
                    <textarea {...common} rows={3} value={value ?? ''} onChange={(e) => set(e.target.value)} />
                );

            case 'emergency_contact':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                            {...common}
                            id={`${id}_name`}
                            placeholder="Contact name"
                            value={value?.name ?? ''}
                            onChange={(e) => set({ ...(value || {}), name: e.target.value })}
                        />
                        <input
                            {...common}
                            id={`${id}_phone`}
                            type="tel"
                            placeholder="Contact phone"
                            value={value?.phone ?? ''}
                            onChange={(e) => set({ ...(value || {}), phone: e.target.value })}
                        />
                    </div>
                );

            case 'signature':
                return (
                    <input
                        {...common}
                        type="text"
                        placeholder={field.placeholder || 'Type your full name as a signature'}
                        value={value ?? ''}
                        onChange={(e) => set(e.target.value)}
                        className={`${base} font-[cursive] text-base`}
                    />
                );

            case 'hidden':
                return null;

            default:
                return (
                    <input
                        {...common}
                        type="text"
                        maxLength={field.config?.maxLength}
                        value={value ?? ''}
                        onChange={(e) => set(e.target.value)}
                    />
                );
        }
    };

    if (field.type === 'hidden') return null;

    // A picture the organiser placed on the form. The label is its alt text,
    // the help text its caption; nothing is asked.
    if (field.type === 'display_image') {
        const src = field.config?.imageUrl;
        if (!src) return null;

        const width = { small: 'max-w-xs', medium: 'max-w-md', full: 'max-w-full' }[field.config?.size] ?? 'max-w-full';

        return (
            <figure className="rf-image">
                <img src={src} alt={field.label || ''} loading="lazy" className={`block mx-auto w-full ${width} h-auto rounded-xl`} />
                {field.helpText && (
                    <figcaption className="text-sm text-gray-500 mt-2 text-center whitespace-pre-line">{field.helpText}</figcaption>
                )}
            </figure>
        );
    }

    if (field.type === 'heading') {
        return (
            <div className="pt-2">
                <h4 className="font-bold text-gray-900">{field.label}</h4>
                {/* Kept as written: organisers set fees and prizes out line by line. */}
                {field.helpText && <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{field.helpText}</p>}
            </div>
        );
    }

    if (field.type === 'code_block') {
        const height = Math.min(1000, Math.max(40, Number(field.config?.height) || 180));
        const css = sanitizeCodeBlockCss(field.config?.css);

        return (
            <div
                className="rf-code-block overflow-auto rounded-lg"
                role="region"
                aria-label={field.label || 'Additional form content'}
                style={{ height: `${height}px` }}
            >
                {css && <style>{css}</style>}
                <div
                    className="regx-code-block-content h-full"
                    dangerouslySetInnerHTML={{ __html: sanitizeCodeBlockHtml(field.config?.html) }}
                />
            </div>
        );
    }

    return (
        <div className="rf-field">
            <label htmlFor={id} className="rf-label block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            {control()}

            {field.helpText && !error && <p className="rf-help text-xs text-gray-500 mt-1">{field.helpText}</p>}
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
};

export default FieldRenderer;

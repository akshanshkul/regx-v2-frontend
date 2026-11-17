import React from 'react';
import { Loader2, RotateCcw, Save, CalendarDays, MapPin } from 'lucide-react';
import {
    CUSTOM_DEFAULTS, CUSTOM_FONTS, CUSTOM_PRESETS,
    normaliseCustom, customThemeStyle, customThemeClasses, loadCustomFonts,
} from '../../forms/themes';
import '../../forms/formThemes.css';

const control =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none';

/**
 * The custom theme: the organiser's own colours, fonts, corners and wording.
 *
 * Edits stay a draft — shown live in the preview, which is drawn by the same
 * stylesheet as the public page — until Save, so trying colours never flickers
 * the live form through every shade on the way.
 */
const CustomThemeEditor = ({ form, onSave }) => {
    const saved = React.useMemo(() => normaliseCustom(form?.settings?.customTheme), [form?.settings?.customTheme]);
    const [draft, setDraft] = React.useState(saved);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => setDraft(saved), [saved]);

    React.useEffect(() => {
        loadCustomFonts(draft);
    }, [draft.font, draft.headingFont]); // eslint-disable-line react-hooks/exhaustive-deps

    const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
    const set = (patch) => setDraft((d) => normaliseCustom({ ...d, ...patch }));

    const save = async () => {
        setSaving(true);

        try {
            await onSave(draft);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-gray-900">Custom theme</h3>
                    <p className="text-xs text-gray-500">
                        Change anything below and watch the preview. The form changes when you save.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setDraft(saved)}
                        disabled={!dirty || saving}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Undo changes
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={!dirty || saving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-40"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save theme
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-6 mt-5">
                {/* Controls */}
                <div className="space-y-5">
                    <Group title="Start from">
                        <div className="flex flex-wrap gap-2">
                            {CUSTOM_PRESETS.map(({ name, ...colours }) => (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => set(colours)}
                                    className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-700 hover:border-gray-400"
                                >
                                    <span
                                        className="w-5 h-5 rounded-full border border-black/10"
                                        style={{
                                            background: `linear-gradient(135deg, ${colours.background} 50%, ${colours.accent} 50%)`,
                                        }}
                                    />
                                    {name}
                                </button>
                            ))}
                        </div>
                    </Group>

                    <Group title="Colours">
                        <Colour label="Page background" value={draft.background} onChange={(v) => set({ background: v })} />

                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={draft.gradient}
                                onChange={(e) => set({ gradient: e.target.checked })}
                                className="w-4 h-4 rounded accent-regx-orange"
                            />
                            Blend into a second colour
                        </label>

                        {draft.gradient && (
                            <Colour label="Second colour" value={draft.background2} onChange={(v) => set({ background2: v })} />
                        )}

                        <Colour label="Boxes" value={draft.card} onChange={(v) => set({ card: v })} />
                        <Colour label="Text in the boxes" value={draft.text} onChange={(v) => set({ text: v })} />
                        <Colour label="Buttons and highlights" value={draft.accent} onChange={(v) => set({ accent: v })} />
                    </Group>

                    <Group title="Text">
                        <Select label="Body font" value={draft.font} onChange={(v) => set({ font: v })}>
                            {CUSTOM_FONTS.map((f) => (
                                <option key={f.key} value={f.key}>{f.name}</option>
                            ))}
                        </Select>

                        <Select label="Heading font" value={draft.headingFont} onChange={(v) => set({ headingFont: v })}>
                            {CUSTOM_FONTS.map((f) => (
                                <option key={f.key} value={f.key}>{f.name}</option>
                            ))}
                        </Select>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Line above the title</label>
                            <input
                                value={draft.eyebrow}
                                maxLength={80}
                                placeholder={form?.event_name || 'Your event name, or “Registration form”'}
                                onChange={(e) => set({ eyebrow: e.target.value })}
                                className={control}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Submit button text</label>
                            <input
                                value={draft.submitLabel}
                                maxLength={40}
                                placeholder="Submit registration"
                                onChange={(e) => set({ submitLabel: e.target.value })}
                                className={control}
                            />
                        </div>
                    </Group>

                    <Group title="Layout">
                        <Segmented
                            label="Corners"
                            value={draft.corners}
                            onChange={(v) => set({ corners: v })}
                            options={[['sharp', 'Square'], ['rounded', 'Rounded'], ['round', 'Round']]}
                        />
                        <Segmented
                            label="Header"
                            value={draft.header}
                            onChange={(v) => set({ header: v })}
                            options={[['box', 'In a box'], ['plain', 'On the background']]}
                        />
                        <Segmented
                            label="Header alignment"
                            value={draft.align}
                            onChange={(v) => set({ align: v })}
                            options={[['left', 'Left'], ['center', 'Centre']]}
                        />
                    </Group>

                    <button
                        type="button"
                        onClick={() => setDraft(normaliseCustom(CUSTOM_DEFAULTS))}
                        className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2"
                    >
                        Reset everything to the starting look
                    </button>
                </div>

                {/* Live preview */}
                <div className="lg:sticky lg:top-4 self-start">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview</p>
                    <Preview form={form} theme={draft} />
                </div>
            </div>
        </div>
    );
};

/**
 * A slice of the public page in the draft theme, drawn with the real theme
 * classes so what is shown here is what a participant will see.
 */
const Preview = ({ form, theme }) => {
    const images = form?.images ?? {};
    const logos = [images.logo, images.logo2, images.logo3].filter(Boolean);

    return (
        <div
            className={`rf-theme rf-theme--custom rf-preview ${customThemeClasses(theme)}`}
            style={customThemeStyle(theme)}
        >
            <div className="rf-bg" aria-hidden="true" />

            <div className="rf-wrap">
                {logos.length > 0 && (
                    <div className={`rf-logos${logos.length > 1 ? ' has-many' : ''}`}>
                        {logos.map((src) => (
                            <img key={src} src={src} alt="" className="rf-logo" style={{ height: '3rem' }} />
                        ))}
                    </div>
                )}

                <header className="rf-hero">
                    {images.banner && <img src={images.banner} alt="" className="rf-banner" style={{ maxHeight: '8rem' }} />}

                    <div className="rf-hero-body">
                        <div className="min-w-0 flex-1">
                            <p className="rf-eyebrow">{theme.eyebrow || 'Registration form'}</p>
                            <h1 className="rf-title" style={{ fontSize: '1.6rem' }}>{form?.name || 'Your form'}</h1>
                            <div className="rf-rule" aria-hidden="true" />
                            <div className="rf-meta">
                                <span className="rf-chip">
                                    <CalendarDays aria-hidden="true" /> 12 Dec 2026
                                </span>
                                <span className="rf-chip">
                                    <MapPin aria-hidden="true" /> City Stadium
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="rf-card">
                    <div className="rf-section-head">
                        <h3 className="rf-section-title">Participant details</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="rf-field">
                            <label className="rf-label block text-sm mb-1">Full name</label>
                            <input className="rf-input w-full text-sm outline-none" placeholder="e.g. Asha Verma" readOnly />
                        </div>
                        <div className="rf-field">
                            <label className="rf-label block text-sm mb-1">Phone</label>
                            <input className="rf-input w-full text-sm outline-none" placeholder="98765 43210" readOnly />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <span className="rf-submit inline-block text-sm">
                        {theme.submitLabel || 'Submit registration'}
                    </span>
                </div>
            </div>
        </div>
    );
};

const Group = ({ title, children }) => (
    <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
        <div className="space-y-3">{children}</div>
    </div>
);

const Colour = ({ label, value, onChange }) => {
    const [text, setText] = React.useState(value);

    React.useEffect(() => setText(value), [value]);

    return (
        <div className="flex items-center gap-3">
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={label}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white shrink-0"
            />
            <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-700">{label}</p>
            </div>
            <input
                value={text}
                onChange={(e) => {
                    setText(e.target.value);
                    if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value);
                }}
                onBlur={() => setText(value)}
                aria-label={`${label}, hex value`}
                className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-mono uppercase outline-none focus:border-regx-orange"
            />
        </div>
    );
};

const Select = ({ label, value, onChange, children }) => (
    <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className={control}>
            {children}
        </select>
    </div>
);

const Segmented = ({ label, value, onChange, options }) => (
    <div>
        <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
        <div className="inline-flex flex-wrap rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            {options.map(([key, text]) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => onChange(key)}
                    aria-pressed={value === key}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        value === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                    {text}
                </button>
            ))}
        </div>
    </div>
);

export default CustomThemeEditor;

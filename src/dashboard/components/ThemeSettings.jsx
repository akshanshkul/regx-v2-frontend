import React from 'react';
import { Check, ExternalLink, Palette } from 'lucide-react';
import { THEMES, themeFor, normaliseCustom, isDark } from '../../forms/themes';
import CustomThemeEditor from './CustomThemeEditor';

/**
 * Which look the public form wears.
 *
 * A property of the form, saved on its own like the payment settings, and live
 * the moment it is picked — a theme changes how the page looks, never what it
 * asks, so there is nothing to publish.
 */
const ThemeSettings = ({ form, onChange }) => {
    const current = themeFor(form?.settings?.theme).key;
    const [saving, setSaving] = React.useState(null);

    const pick = async (key) => {
        if (key === current || saving) return;

        setSaving(key);

        try {
            await onChange({
                settings: {
                    ...(form?.settings ?? {}),
                    theme: key,
                    // Choosing Custom for the first time starts from the defaults,
                    // so the page has something whole to draw straight away.
                    ...(key === 'custom' ? { customTheme: normaliseCustom(form?.settings?.customTheme) } : {}),
                },
            });
        } finally {
            setSaving(null);
        }
    };

    const link = form?.public_url;

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                        <Palette className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900">Form theme</h3>
                        <p className="text-xs text-gray-500">
                            How the public registration page looks. The questions, rules and fees stay the
                            same whichever you pick, and the change is live straight away.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                    {THEMES.map((theme) => {
                        const active = theme.key === current;

                        return (
                            <div
                                key={theme.key}
                                className={`rounded-2xl border-2 overflow-hidden transition-colors ${
                                    active ? 'border-regx-orange' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => pick(theme.key)}
                                    disabled={saving !== null}
                                    aria-pressed={active}
                                    className="block w-full text-left disabled:cursor-wait"
                                >
                                    <ThemeSwatch theme={theme.key} custom={form?.settings?.customTheme} />

                                    <div className="p-4 flex items-start gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900">{theme.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{theme.tagline}</p>
                                        </div>

                                        <span
                                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                                active ? 'bg-regx-orange text-white' : 'border border-gray-300'
                                            }`}
                                        >
                                            {(active || saving === theme.key) && <Check className="w-3 h-3" />}
                                        </span>
                                    </div>
                                </button>

                                {link && (
                                    <a
                                        href={`${link}?theme=${theme.key}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-1.5 border-t border-gray-100 px-4 py-2 text-xs font-medium text-gray-600 hover:text-regx-orange hover:bg-gray-50 transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Preview on your form
                                    </a>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {current === 'custom' && (
                <CustomThemeEditor
                    form={form}
                    onSave={(customTheme) =>
                        onChange({ settings: { ...(form?.settings ?? {}), theme: 'custom', customTheme } })
                    }
                />
            )}

            <p className="text-xs text-gray-500 px-1">
                Where the event has a banner or logo, the ready-made themes pick up its colour, so the page
                matches your branding. Custom uses exactly the colours you choose.
            </p>
        </div>
    );
};

/** A miniature of each theme, drawn rather than screenshotted so it never goes stale. */
const ThemeSwatch = ({ theme, custom }) => {
    if (theme === 'custom') return <SimpleSwatch {...customSwatch(custom)} />;
    if (SIMPLE_SWATCHES[theme]) return <SimpleSwatch {...SIMPLE_SWATCHES[theme]} />;

    if (theme === 'sport') {
        return (
            <div
                className="h-36 p-4 relative overflow-hidden"
                style={{
                    background:
                        'repeating-linear-gradient(-55deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 14px), linear-gradient(160deg, #111a33, #070b16)',
                }}
                aria-hidden="true"
            >
                <div className="absolute -left-6 -right-6 top-10 h-10 bg-yellow-400/30 -skew-y-6 blur-[1px]" />
                <div className="relative border-l-4 border-yellow-400 bg-[#111a33] px-3 py-2">
                    <div className="inline-block bg-yellow-400 -skew-x-12 px-1.5 text-[7px] font-bold tracking-[0.2em] text-slate-900">
                        TOURNAMENT
                    </div>
                    <div className="mt-1 text-white font-extrabold italic uppercase text-base leading-none tracking-tight">
                        Open 2026
                    </div>
                </div>
                <div className="relative mt-2 bg-white border-t-4 border-yellow-400 px-3 py-2 space-y-1.5">
                    <div className="h-1.5 w-12 bg-slate-800" />
                    <div className="h-3 bg-slate-100 border-l-2 border-slate-300" />
                </div>
            </div>
        );
    }

    if (theme === 'classic') {
        return (
            <div
                className="h-36 p-4 flex flex-col items-center"
                style={{
                    background:
                        'repeating-linear-gradient(0deg, rgba(120,90,40,0.05) 0 1px, transparent 1px 4px), #ece4d3',
                }}
                aria-hidden="true"
            >
                <div className="w-full bg-[#fffdf6] border border-neutral-700 outline outline-1 outline-neutral-700 outline-offset-2 px-3 py-2 text-center">
                    <div className="text-[7px] tracking-[0.3em] text-[#6b5b3e]">REGISTRATION FORM</div>
                    <div className="font-serif font-bold text-sm text-neutral-800 mt-0.5">Annual Meet</div>
                    <div className="mx-auto mt-1 w-16 h-[3px] border-y border-neutral-700" />
                </div>
                <div className="w-full mt-3 bg-[#fffdf6] border border-neutral-700 px-3 py-2 space-y-2">
                    <div className="font-serif text-[9px] text-blue-900" style={{ fontVariant: 'small-caps' }}>
                        Part I — Particulars
                    </div>
                    <div className="h-px bg-neutral-700" />
                </div>
            </div>
        );
    }

    return (
        <div
            className="h-36 p-4"
            style={{
                background:
                    'radial-gradient(10rem 7rem at 0% 0%, rgba(249,115,22,0.35), transparent 70%), radial-gradient(10rem 7rem at 100% 20%, rgba(99,102,241,0.3), transparent 70%), #f5f6fb',
            }}
            aria-hidden="true"
        >
            <div className="bg-white/90 rounded-xl overflow-hidden shadow-sm">
                <div className="h-1 bg-gradient-to-r from-orange-500 via-indigo-500 to-orange-500" />
                <div className="px-3 py-2">
                    <div className="inline-block rounded-full bg-orange-100 px-1.5 text-[7px] font-bold text-orange-700">
                        City Marathon
                    </div>
                    <div className="mt-1 font-extrabold text-sm text-slate-900 leading-none">Register now</div>
                </div>
            </div>
            <div className="mt-2 bg-white/90 rounded-xl px-3 py-2 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-1">
                    <span className="w-1 h-2.5 rounded-full bg-gradient-to-b from-orange-500 to-indigo-500" />
                    <span className="h-1.5 w-10 rounded bg-slate-800" />
                </div>
                <div className="h-3 rounded-md bg-slate-100" />
            </div>
        </div>
    );
};

/**
 * The rest of the miniatures differ only in colour and shape, so they are
 * described rather than drawn one by one: a background, a header, a field card.
 */
const SIMPLE_SWATCHES = {
    none: {
        bg: '#f3f4f6',
        hero: { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12 },
        title: { color: '#111827', fontWeight: 600 },
        eyebrow: { color: '#f97316' },
        card: { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12 },
        input: { background: '#ffffff', border: '1px solid #d1d5db', borderRadius: 6 },
        label: 'Event registration',
        heading: 'Plain form',
    },
    minimal: {
        bg: '#ffffff',
        topBar: '#2563eb',
        hero: { background: 'transparent' },
        title: { color: '#0a0a0a', fontWeight: 700, letterSpacing: '-0.04em', fontSize: 16 },
        eyebrow: { color: '#2563eb', letterSpacing: '0.12em', textTransform: 'uppercase' },
        card: { background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: 8 },
        input: { background: '#ffffff', border: '1px solid #d4d4d4', borderRadius: 5 },
        label: 'Conference',
        heading: 'Tech Summit',
    },
    festive: {
        bg: 'radial-gradient(circle at 15% 30%, #f472b6 0 3px, transparent 4px), radial-gradient(circle at 85% 20%, #facc15 0 3px, transparent 4px), radial-gradient(circle at 70% 85%, #22d3ee 0 3px, transparent 4px), #fff1e6',
        hero: { background: 'linear-gradient(135deg, #db2777, #f97316 55%, #facc15)', borderRadius: 14 },
        title: { color: '#ffffff', fontWeight: 800 },
        eyebrow: { color: '#ffffff', background: 'rgba(255,255,255,0.25)', borderRadius: 999, padding: '0 6px' },
        card: { background: '#ffffff', borderRadius: 14, borderTop: '3px solid #db2777' },
        input: { background: '#fff7fb', border: '1.5px solid #fce7f3', borderRadius: 8 },
        label: 'Cultural fest',
        heading: 'Rang Utsav',
    },
    nature: {
        bg: 'repeating-radial-gradient(ellipse at 20% 30%, transparent 0 9px, rgba(21,128,61,0.12) 9px 10px), #eef3ea',
        hero: { background: 'linear-gradient(160deg, #14532d, #3f6212)', borderRadius: 12 },
        title: { color: '#ffffff', fontWeight: 800 },
        eyebrow: { color: '#bef264', letterSpacing: '0.12em', textTransform: 'uppercase' },
        card: { background: '#fbfdf9', border: '1px solid #d9e5d3', borderRadius: 10 },
        input: { background: '#ffffff', border: '1.5px solid #cfdcc8', borderRadius: 6 },
        label: 'Trail run',
        heading: 'Hill Trek 21K',
    },
    elegant: {
        bg: 'radial-gradient(12rem 6rem at 50% 0%, rgba(212,162,76,0.3), transparent 70%), #0e0d0b',
        hero: { background: 'transparent', border: '1px solid rgba(212,162,76,0.6)', textAlign: 'center' },
        title: { color: '#f8f3e7', fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: 15 },
        eyebrow: { color: '#d4a24c', letterSpacing: '0.35em', textTransform: 'uppercase' },
        card: { background: '#171512', border: '1px solid rgba(212,162,76,0.35)' },
        input: { background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(212,162,76,0.5)' },
        label: 'Awards night',
        heading: 'The Gala',
    },
    league: {
        bg: 'linear-gradient(32deg, #d40000 0%, #8f0000 28%, #3d0000 52%, #000 78%)',
        logo: true,
        hero: { background: '#000', borderRadius: 6, textAlign: 'center', boxShadow: '0 0 14px rgba(255,40,40,0.35)' },
        title: { color: '#ffffff', fontWeight: 800 },
        eyebrow: { color: '#d4d4d4', textShadow: '0 0 4px rgba(255,255,255,0.8)' },
        card: { background: '#000', borderRadius: 6, boxShadow: '0 0 14px rgba(255,40,40,0.3)' },
        input: { background: '#111', border: '1px solid #3f3f46', borderRadius: 4 },
        label: 'Pro League',
        heading: 'Registration',
    },
};

/** The Custom card wears the organiser's own saved colours. */
const customSwatch = (raw) => {
    const c = normaliseCustom(raw);
    const radius = { sharp: 0, rounded: 10, round: 16 }[c.corners];

    return {
        bg: c.gradient ? `linear-gradient(145deg, ${c.background}, ${c.background2})` : c.background,
        topBar: c.accent,
        hero: c.header === 'box'
            ? { background: c.card, borderRadius: radius, textAlign: c.align }
            : { background: 'transparent', textAlign: c.align },
        title: { color: c.header === 'box' ? c.text : isDark(c.background) ? '#ffffff' : '#0f172a', fontWeight: 800 },
        eyebrow: { color: c.accent, letterSpacing: '0.12em', textTransform: 'uppercase' },
        card: { background: c.card, borderRadius: radius },
        input: { background: c.card, border: `1.5px solid ${c.accent}55`, borderRadius: Math.min(radius, 8) },
        label: c.eyebrow || 'Your colours',
        heading: 'Make it yours',
    };
};

const SimpleSwatch = ({ bg, topBar, logo, hero, title, eyebrow, card, input, label, heading }) => (
    <div className="h-36 p-4 relative overflow-hidden" style={{ background: bg }} aria-hidden="true">
        {topBar && <div className="absolute inset-x-0 top-0 h-1" style={{ background: topBar }} />}

        {logo && (
            <div className="mx-auto -mt-2 mb-1 w-7 h-8 bg-red-600 border-2 border-yellow-400"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)' }} />
        )}

        <div className="px-3 py-2" style={hero}>
            <div className="text-[7px] font-bold" style={eyebrow}>{label}</div>
            <div className="text-sm leading-tight mt-0.5" style={title}>{heading}</div>
        </div>

        <div className="mt-2 px-3 py-2 space-y-1.5" style={card}>
            <div className="h-1.5 w-10 rounded" style={{ background: title.color, opacity: 0.8 }} />
            <div className="h-3" style={input} />
        </div>
    </div>
);

export default ThemeSettings;

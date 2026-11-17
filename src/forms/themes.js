/**
 * The looks a public form can wear.
 *
 * The theme is a property of the form (settings.theme), chosen on the Theme
 * tab. Every theme renders the same DynamicForm — a theme only restyles it
 * through the `rf-*` hook classes in formThemes.css — so switching one never
 * changes what a participant is asked or what is validated.
 *
 * `ground` says what the accent colour sits on, so a banner colour that would
 * vanish there is passed over for the theme's own (see accentFor).
 */
export const THEMES = [
    {
        key: 'none',
        name: 'No theme',
        tagline: 'Plain white cards on grey. No extra styling.',
        accent: '#f97316',
        ground: 'light',
    },
    {
        key: 'modern',
        name: 'Modern',
        tagline: 'Soft colour, rounded cards. Suits any event.',
        accent: '#f97316',
        ground: 'light',
        font: 'Plus+Jakarta+Sans:wght@400;500;600;700;800',
    },
    {
        key: 'sport',
        name: 'Sport',
        tagline: 'Dark, bold and fast. Built for tournaments and races.',
        accent: '#facc15',
        ground: 'dark',
        font: 'Barlow+Condensed:ital,wght@0,600;0,700;1,800&family=Barlow:wght@400;500;600',
    },
    {
        key: 'classic',
        name: 'Classic',
        tagline: 'A printed paper form — serif type and ruled lines.',
        accent: '#1e3a8a',
        ground: 'paper',
        font: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400',
    },
    {
        key: 'minimal',
        name: 'Minimal',
        tagline: 'Black, white and one colour. For seminars and conferences.',
        accent: '#2563eb',
        ground: 'light',
        font: 'Inter:wght@400;500;600;700',
    },
    {
        key: 'festive',
        name: 'Festive',
        tagline: 'Warm gradients and confetti. For fests and cultural events.',
        accent: '#db2777',
        ground: 'light',
        font: 'Poppins:wght@400;500;600;700;800',
    },
    {
        key: 'nature',
        name: 'Outdoor',
        tagline: 'Greens and contour lines. For treks, runs and camps.',
        accent: '#15803d',
        ground: 'light',
        font: 'Outfit:wght@400;500;600;700;800',
    },
    {
        key: 'elegant',
        name: 'Elegant',
        tagline: 'Black and gold, serif titles. For galas and award nights.',
        accent: '#d4a24c',
        ground: 'dark',
        font: 'Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Jost:wght@400;500;600',
    },
    {
        key: 'league',
        name: 'League',
        tagline: 'Red-to-black with your logo on top. For leagues and fight nights.',
        accent: '#ef1c1c',
        ground: 'dark',
        font: 'Mulish:wght@400;500;600;700;800',
    },
    {
        key: 'custom',
        name: 'Custom',
        tagline: 'Your own colours, fonts, corners and wording.',
        accent: '#f97316',
        ground: 'light',
        // Fonts and accent come from settings.customTheme; see customThemeStyle.
        custom: true,
    },
];

export const DEFAULT_THEME = 'modern';

/* ------------------------------------------------------------ custom theme */

/** Typefaces the custom theme offers. `google` is the css2 family spec. */
export const CUSTOM_FONTS = [
    { key: 'system', name: 'System default', css: 'ui-sans-serif, system-ui, sans-serif' },
    { key: 'inter', name: 'Inter', css: "'Inter', sans-serif", google: 'Inter:wght@400;500;600;700;800' },
    { key: 'poppins', name: 'Poppins', css: "'Poppins', sans-serif", google: 'Poppins:wght@400;500;600;700;800' },
    { key: 'montserrat', name: 'Montserrat', css: "'Montserrat', sans-serif", google: 'Montserrat:wght@400;500;600;700;800' },
    { key: 'mulish', name: 'Mulish', css: "'Mulish', sans-serif", google: 'Mulish:wght@400;500;600;700;800' },
    { key: 'outfit', name: 'Outfit', css: "'Outfit', sans-serif", google: 'Outfit:wght@400;500;600;700;800' },
    { key: 'oswald', name: 'Oswald (bold, narrow)', css: "'Oswald', sans-serif", google: 'Oswald:wght@500;600;700' },
    { key: 'playfair', name: 'Playfair Display (serif)', css: "'Playfair Display', serif", google: 'Playfair+Display:wght@500;600;700;800' },
    { key: 'baskerville', name: 'Libre Baskerville (serif)', css: "'Libre Baskerville', serif", google: 'Libre+Baskerville:wght@400;700' },
    { key: 'hind', name: 'Hind (Devanagari)', css: "'Hind', sans-serif", google: 'Hind:wght@400;500;600;700' },
];

export const CUSTOM_DEFAULTS = {
    background: '#0f172a',
    background2: '#1d4ed8',
    gradient: true,
    card: '#ffffff',
    text: '#0f172a',
    accent: '#f97316',
    font: 'inter',
    headingFont: 'montserrat',
    corners: 'rounded',
    header: 'box',
    align: 'left',
    eyebrow: '',
    submitLabel: '',
};

/** Ready-made colour sets to start from in the editor. */
export const CUSTOM_PRESETS = [
    { name: 'Ocean', background: '#0f172a', background2: '#1d4ed8', gradient: true, card: '#ffffff', text: '#0f172a', accent: '#f97316' },
    { name: 'Sunset', background: '#7c2d12', background2: '#db2777', gradient: true, card: '#fff7ed', text: '#431407', accent: '#ea580c' },
    { name: 'Forest', background: '#052e16', background2: '#3f6212', gradient: true, card: '#f7fee7', text: '#14532d', accent: '#65a30d' },
    { name: 'Royal', background: '#1e1b4b', background2: '#6d28d9', gradient: true, card: '#ffffff', text: '#1e1b4b', accent: '#7c3aed' },
    { name: 'Midnight', background: '#000000', background2: '#27272a', gradient: true, card: '#18181b', text: '#fafafa', accent: '#22d3ee' },
    { name: 'Saffron', background: '#fff7ed', background2: '#fed7aa', gradient: true, card: '#ffffff', text: '#431407', accent: '#ea580c' },
    { name: 'Clean', background: '#f4f4f5', background2: '#f4f4f5', gradient: false, card: '#ffffff', text: '#18181b', accent: '#2563eb' },
];

const HEX = /^#[0-9a-f]{6}$/i;
const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

/**
 * The stored custom theme with every value checked, so nothing malformed ever
 * reaches a style attribute.
 */
export const normaliseCustom = (raw = {}) => {
    const c = { ...CUSTOM_DEFAULTS };

    ['background', 'background2', 'card', 'text', 'accent'].forEach((key) => {
        if (HEX.test(raw?.[key] ?? '')) c[key] = raw[key].toLowerCase();
    });

    c.gradient = raw?.gradient === undefined ? CUSTOM_DEFAULTS.gradient : Boolean(raw.gradient);
    c.font = pick(raw?.font, CUSTOM_FONTS.map((f) => f.key), CUSTOM_DEFAULTS.font);
    c.headingFont = pick(raw?.headingFont, CUSTOM_FONTS.map((f) => f.key), CUSTOM_DEFAULTS.headingFont);
    c.corners = pick(raw?.corners, ['sharp', 'rounded', 'round'], CUSTOM_DEFAULTS.corners);
    c.header = pick(raw?.header, ['box', 'plain'], CUSTOM_DEFAULTS.header);
    c.align = pick(raw?.align, ['left', 'center'], CUSTOM_DEFAULTS.align);
    c.eyebrow = typeof raw?.eyebrow === 'string' ? raw.eyebrow.slice(0, 80) : '';
    c.submitLabel = typeof raw?.submitLabel === 'string' ? raw.submitLabel.slice(0, 40) : '';

    return c;
};

const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

export const isDark = (hex) => {
    const [r, g, b] = rgbOf(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
};

const fontCss = (key) => (CUSTOM_FONTS.find((f) => f.key === key) ?? CUSTOM_FONTS[0]).css;

/**
 * CSS variables for a custom theme, read by .rf-theme--custom. Text that sits
 * on the page background, rather than in a box, is picked light or dark from
 * the background so it always reads.
 */
export const customThemeStyle = (raw) => {
    const c = normaliseCustom(raw);
    const [r, g, b] = rgbOf(c.accent);

    return {
        '--rf-accent': c.accent,
        '--rf-accent-rgb': `${r}, ${g}, ${b}`,
        '--rf-accent-text': isDark(c.accent) ? '#ffffff' : '#111827',
        '--regx-accent': c.accent,
        '--regx-accent-text': isDark(c.accent) ? '#ffffff' : '#111827',
        '--rfc-bg': c.background,
        '--rfc-bg2': c.gradient ? c.background2 : c.background,
        '--rfc-card': c.card,
        '--rfc-text': c.text,
        '--rfc-page-text': isDark(c.background) ? '#f8fafc' : '#0f172a',
        '--rfc-font': fontCss(c.font),
        '--rfc-heading-font': fontCss(c.headingFont),
        '--rfc-radius': { sharp: '0px', rounded: '14px', round: '26px' }[c.corners],
        '--rfc-control-radius': { sharp: '0px', rounded: '10px', round: '999px' }[c.corners],
    };
};

/** Classes the custom theme's layout choices switch on. */
export const customThemeClasses = (raw) => {
    const c = normaliseCustom(raw);
    return [`rfc-header-${c.header}`, `rfc-align-${c.align}`].join(' ');
};

/** Loads the custom theme's chosen typefaces. */
export const loadCustomFonts = (raw) => {
    const c = normaliseCustom(raw);

    [c.font, c.headingFont].forEach((key) => {
        const font = CUSTOM_FONTS.find((f) => f.key === key);
        if (font?.google) loadThemeFont({ key: `custom-${font.key}`, font: font.google });
    });
};

export const themeFor = (key) =>
    THEMES.find((theme) => theme.key === key) ?? THEMES.find((theme) => theme.key === DEFAULT_THEME);

/** Loads a theme's typeface once, on the pages that use it. */
export const loadThemeFont = (theme) => {
    if (typeof document === 'undefined' || !theme?.font) return;

    const id = `rf-font-${theme.key}`;
    if (document.getElementById(id)) return;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${theme.font}&display=swap`;
    document.head.appendChild(link);
};

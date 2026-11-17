/**
 * Reading the server's timestamps.
 *
 * The API sends times as "2026-09-19 14:12:00" — no zone marker — written in
 * the server's own zone, which is India (appTimezone = Asia/Kolkata in the
 * backend's Config/App.php). Handing that to `new Date()` makes the browser
 * assume the *reader's* zone, which is only right for a reader in India.
 * Everything that turns a server timestamp into a Date goes through here, so
 * the zone is stated once and the time is right wherever it is read.
 *
 * If the backend's zone ever changes, this offset changes with it — set
 * VITE_SERVER_UTC_OFFSET (e.g. "+00:00") rather than editing call sites.
 *
 * A value that already says which zone it is in (a trailing Z, or an offset)
 * is left alone, and so is a date with no time — "2026-09-19" is a day, not an
 * instant, and shifting it would move it to the day before for half the world.
 */
const SERVER_OFFSET = import.meta.env?.VITE_SERVER_UTC_OFFSET || '+05:30';

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const parseServerDate = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);

    const text = String(value).trim();

    if (DATE_ONLY.test(text)) {
        const [year, month, day] = text.split('-').map(Number);

        return new Date(year, month - 1, day);
    }

    const iso = text.replace(' ', 'T');
    const date = new Date(HAS_ZONE.test(iso) ? iso : `${iso}${SERVER_OFFSET}`);

    return Number.isNaN(date.getTime()) ? null : date;
};

/** "19 Sep 2026, 2:12 pm", in the reader's own time zone. */
export const formatDateTime = (value, locale = 'en-IN') => {
    const date = parseServerDate(value);

    return date
        ? date.toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
        : '—';
};

/** "19 Sep 2026". */
export const formatDate = (value, locale = 'en-IN') => {
    const date = parseServerDate(value);

    return date ? date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
};

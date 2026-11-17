/**
 * The hall screen's look: a colour per card, a pill per state, and initials
 * standing in for photographs.
 */

export const ACCENTS = {
    red: {
        header: 'bg-gradient-to-r from-red-600 to-red-500',
        border: 'border-red-500/40',
        glow: 'shadow-[0_0_30px_-12px_rgba(239,68,68,0.8)]',
        score: 'bg-red-600',
        dot: 'bg-red-500',
        rail: 'bg-red-500',
        text: 'text-red-400',
    },
    blue: {
        header: 'bg-gradient-to-r from-blue-600 to-blue-500',
        border: 'border-blue-500/40',
        glow: 'shadow-[0_0_30px_-12px_rgba(59,130,246,0.8)]',
        score: 'bg-blue-600',
        dot: 'bg-blue-500',
        rail: 'bg-blue-500',
        text: 'text-blue-400',
    },
    green: {
        header: 'bg-gradient-to-r from-emerald-600 to-emerald-500',
        border: 'border-emerald-500/40',
        glow: 'shadow-[0_0_30px_-12px_rgba(16,185,129,0.8)]',
        score: 'bg-emerald-600',
        dot: 'bg-emerald-500',
        rail: 'bg-emerald-500',
        text: 'text-emerald-400',
    },
    amber: {
        header: 'bg-gradient-to-r from-amber-500 to-orange-500',
        border: 'border-amber-500/40',
        glow: 'shadow-[0_0_30px_-12px_rgba(245,158,11,0.8)]',
        score: 'bg-amber-500',
        dot: 'bg-amber-500',
        rail: 'bg-amber-500',
        text: 'text-amber-400',
    },
    violet: {
        header: 'bg-gradient-to-r from-violet-600 to-fuchsia-500',
        border: 'border-violet-500/40',
        glow: 'shadow-[0_0_30px_-12px_rgba(139,92,246,0.8)]',
        score: 'bg-violet-600',
        dot: 'bg-violet-500',
        rail: 'bg-violet-500',
        text: 'text-violet-400',
    },
};

/** Cards take their colour in turn, so neighbours never match. */
export const accentFor = (index) => Object.values(ACCENTS)[index % Object.keys(ACCENTS).length];

export const STATUSES = {
    live: { label: 'LIVE', className: 'bg-white text-red-600', pulse: true },
    in_progress: { label: 'IN PROGRESS', className: 'bg-amber-300 text-amber-950', pulse: false },
    up_next: { label: 'UP NEXT', className: 'bg-white/90 text-gray-900', pulse: false },
    done: { label: 'DONE', className: 'bg-white/20 text-white', pulse: false },
};

/** Initials, for the round badges that stand in for photographs. */
export const initials = (name) =>
    (name ?? '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

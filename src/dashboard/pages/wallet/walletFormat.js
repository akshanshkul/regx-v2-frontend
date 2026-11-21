export const formatRp = (value) => `${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 4,
}).format(Number(value) || 0)} RP`;

export const formatInr = (value) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
}).format(Number(value) || 0);

export const formatWalletDate = (value, timeZone = 'Asia/Kolkata') => {
    if (!value) return 'No expiry';
    const iso = String(value).includes('T') ? value : `${String(value).replace(' ', 'T')}Z`;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone,
    }).format(date);
};

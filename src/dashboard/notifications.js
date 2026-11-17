/** Where a notification leads, or null when it is not about anything specific. */
export const notificationLink = (notification, encodeId) =>
    notification.form_id ? `/forms/${encodeId(notification.form_id)}` : null;

/** "5 min ago", "2 h ago", then the date. */
export const timeAgo = (value) => {
    if (!value) return '';

    const then = new Date(String(value).replace(' ', 'T'));

    if (Number.isNaN(then.getTime())) return '';

    const seconds = Math.max(0, Math.round((Date.now() - then.getTime()) / 1000));

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
    if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)} d ago`;

    return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

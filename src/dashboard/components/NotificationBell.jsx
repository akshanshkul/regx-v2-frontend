import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, UserPlus } from 'lucide-react';

import {
    fetchNotifications,
    fetchUnreadCount,
    markAllNotificationsRead,
    markNotificationRead,
    selectNotifications,
    selectUnreadCount,
} from '../../store/slices/notificationsSlice';
import { encodeId } from '../../shared/utils/ids';
import { notificationLink, timeAgo } from '../notifications';

const POLL_MS = 5 * 60 * 1000;

/**
 * The bell in the top bar.
 *
 * Asks the server for the unread count when the dashboard opens and then every
 * five minutes while the tab is showing; a tab hidden longer than that checks
 * again when it comes back into view. When the count goes up
 * between two checks, something just happened: the list is reloaded and the
 * newest one is announced in a toast, so an organiser looking at another page
 * still finds out.
 */
const NotificationBell = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const items = useSelector(selectNotifications);
    const unread = useSelector(selectUnreadCount);

    const [open, setOpen] = useState(false);
    const box = useRef(null);
    const previous = useRef(null);

    useEffect(() => {
        let last = 0;

        const check = () => {
            last = Date.now();
            dispatch(fetchUnreadCount());
        };

        // Once when the dashboard opens, then every five minutes while the tab is showing.
        check();

        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') check();
        }, POLL_MS);

        // A tab that was hidden for a while catches up when it comes back — but only
        // if the last check is already that old, so switching tabs does not add calls.
        const returned = () => {
            if (document.visibilityState === 'visible' && Date.now() - last >= POLL_MS) check();
        };

        document.addEventListener('visibilitychange', returned);

        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', returned);
        };
    }, [dispatch]);

    // The first count is just the starting point; only a rise after it is news.
    useEffect(() => {
        const before = previous.current;
        previous.current = unread;

        if (before === null || unread <= before) return;

        dispatch(fetchNotifications())
            .unwrap()
            .then(({ items: latest }) => {
                const newest = latest.find((n) => !n.read_at);

                if (newest) toast(`${newest.title}: ${newest.message}`, { icon: '🔔', duration: 6000 });
            })
            .catch(() => {});
    }, [unread, dispatch]);

    // The list is loaded when the panel opens, not on every page.
    useEffect(() => {
        if (open) dispatch(fetchNotifications());
    }, [open, dispatch]);

    useEffect(() => {
        if (!open) return undefined;

        const away = (event) => box.current && !box.current.contains(event.target) && setOpen(false);
        const escape = (event) => event.key === 'Escape' && setOpen(false);

        document.addEventListener('mousedown', away);
        document.addEventListener('keydown', escape);

        return () => {
            document.removeEventListener('mousedown', away);
            document.removeEventListener('keydown', escape);
        };
    }, [open]);

    const openOne = (notification) => {
        if (!notification.read_at) dispatch(markNotificationRead(notification.id));

        setOpen(false);

        const link = notificationLink(notification, encodeId);

        if (link) navigate(link);
    };

    const latest = items.slice(0, 6);

    return (
        <div className="relative" ref={box}>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                aria-expanded={open}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 relative"
            >
                <Bell className="w-5 h-5" />

                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-bold text-gray-900">Notifications</p>

                        <button
                            type="button"
                            onClick={() => dispatch(markAllNotificationsRead())}
                            disabled={unread === 0}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-regx-orange hover:underline disabled:text-gray-300 disabled:no-underline"
                        >
                            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                        </button>
                    </div>

                    {latest.length === 0 ? (
                        <p className="px-4 py-10 text-center text-sm text-gray-500">Nothing yet. New registrations show up here.</p>
                    ) : (
                        <ul className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                            {latest.map((notification) => (
                                <li key={notification.id}>
                                    <button
                                        type="button"
                                        onClick={() => openOne(notification)}
                                        className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                                            notification.read_at ? '' : 'bg-orange-50/40'
                                        }`}
                                    >
                                        <span className="mt-0.5 w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                                            <UserPlus className="w-4 h-4" />
                                        </span>

                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-semibold text-gray-900 truncate">{notification.title}</span>
                                                {!notification.read_at && <span className="w-2 h-2 rounded-full bg-regx-orange shrink-0" />}
                                            </span>
                                            <span className="block text-xs text-gray-600 mt-0.5 line-clamp-2">{notification.message}</span>
                                            <span className="block text-[11px] text-gray-400 mt-1">{timeAgo(notification.created_at)}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <Link
                        to="/dashboard/notifications"
                        onClick={() => setOpen(false)}
                        className="block text-center px-4 py-3 text-sm font-semibold text-gray-700 border-t border-gray-100 hover:bg-gray-50"
                    >
                        View all notifications
                    </Link>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;

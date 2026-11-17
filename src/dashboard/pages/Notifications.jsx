import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Bell, CheckCircle2, Clock, Loader2, Trash2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

import {
    clearNotifications,
    fetchNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    selectNotifications,
    selectNotificationsStatus,
    selectUnreadCount,
} from '../../store/slices/notificationsSlice';
import { encodeId } from '../../shared/utils/ids';
import { notificationLink, timeAgo } from '../notifications';

const Notifications = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const notifications = useSelector(selectNotifications);
    const unread = useSelector(selectUnreadCount);
    const status = useSelector(selectNotificationsStatus);

    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'

    const loading = status === 'idle' || (status === 'loading' && notifications.length === 0);

    useEffect(() => {
        dispatch(fetchNotifications())
            .unwrap()
            .catch((message) => toast.error(message || 'Could not load notifications'));
    }, [dispatch]);

    const run = (action, done) =>
        dispatch(action)
            .unwrap()
            .then(() => done && toast.success(done))
            .catch((message) => toast.error(message || 'Something went wrong'));

    const handleClearAll = () => {
        if (!window.confirm('Clear all notifications? This cannot be undone.')) return;

        run(clearNotifications(), 'Notifications cleared');
    };

    const open = (notification) => {
        if (!notification.read_at) dispatch(markNotificationRead(notification.id));

        const link = notificationLink(notification, encodeId);

        if (link) navigate(link);
    };

    const filtered = notifications.filter((n) => activeTab === 'all' || !n.read_at);

    return (
        <div className="max-w-6xl mx-auto pb-16">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-1 flex items-center gap-3">
                        <div className="p-2 bg-regx-orange/10 rounded-xl">
                            <Bell className="w-6 h-6 text-regx-orange" />
                        </div>
                        Notifications
                    </h1>
                    <p className="text-gray-500 text-sm">New registrations and activity across your events.</p>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => run(markAllNotificationsRead(), 'All notifications marked as read')}
                        disabled={unread === 0}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Mark all as read
                    </button>
                    <button
                        type="button"
                        onClick={handleClearAll}
                        disabled={notifications.length === 0}
                        className="p-2 text-gray-400 hover:text-red-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Clear all"
                        aria-label="Clear all notifications"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex space-x-6 border-b border-gray-200 mb-6" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'all'}
                    onClick={() => setActiveTab('all')}
                    className={`pb-3 font-medium text-sm transition-colors border-b-2 ${
                        activeTab === 'all' ? 'border-regx-orange text-regx-orange' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    All Notifications
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'unread'}
                    onClick={() => setActiveTab('unread')}
                    className={`pb-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
                        activeTab === 'unread' ? 'border-regx-orange text-regx-orange' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Unread
                    {unread > 0 && (
                        <span className="bg-regx-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
                    )}
                </button>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-500" role="status">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">
                            {notifications.length === 0 ? 'Nothing here yet' : "You're all caught up!"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {notifications.length === 0
                                ? 'When someone registers on one of your forms, it shows up here.'
                                : 'No unread notifications right now.'}
                        </p>
                    </div>
                ) : (
                    filtered.map((notification) => {
                        const isRead = !!notification.read_at;
                        const link = notificationLink(notification, encodeId);

                        return (
                            <div
                                key={notification.id}
                                className={`flex gap-4 p-5 rounded-2xl border transition-all duration-200 hover:shadow-md ${
                                    isRead ? 'bg-white border-gray-100' : 'bg-green-50/50 border-green-100 shadow-sm'
                                }`}
                            >
                                <div className="mt-1 shrink-0 w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                    <UserPlus className="w-4 h-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <button
                                            type="button"
                                            onClick={() => open(notification)}
                                            disabled={!link && isRead}
                                            className="text-left min-w-0"
                                        >
                                            <h4 className={`text-sm font-bold ${isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                                                {notification.title}
                                            </h4>
                                            <p className="text-sm text-gray-600 mt-1 leading-relaxed break-words">{notification.message}</p>
                                            {link && <span className="inline-block mt-2 text-xs font-semibold text-regx-orange">View registrations →</span>}
                                        </button>

                                        {!isRead && (
                                            <button
                                                type="button"
                                                onClick={() => run(markNotificationRead(notification.id))}
                                                className="shrink-0 p-1.5 text-gray-400 hover:text-regx-orange bg-white rounded-full shadow-sm border border-gray-200 transition-colors"
                                                title="Mark as read"
                                                aria-label="Mark as read"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-gray-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        {timeAgo(notification.created_at)}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Notifications;

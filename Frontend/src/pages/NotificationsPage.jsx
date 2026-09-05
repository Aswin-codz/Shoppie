import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, Check, Settings, Package, Tag, ArrowRight, Activity,
    ShoppingCart, CheckCheck, Filter, ShieldCheck, Clock, RefreshCcw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    fetchNotifications, fetchUnreadCount, markNotificationRead,
    markAllNotificationsRead, fetchPreferences, updatePreferences
} from '../features/notifications/notificationSlice';

const getIconForType = (type) => {
    switch (type) {
        case 'ORDER_UPDATE': return <Package className="w-5 h-5 text-blue-600" />;
        case 'PRICE_DROP': return <Tag className="w-5 h-5 text-emerald-600" />;
        case 'BACK_IN_STOCK': return <Activity className="w-5 h-5 text-purple-600" />;
        case 'CART_REMINDER': return <ShoppingCart className="w-5 h-5 text-amber-600" />;
        default: return <Bell className="w-5 h-5 text-indigo-600" />;
    }
};

const getLinkForType = (notification) => {
    switch (notification.type) {
        case 'ORDER_UPDATE': return `/orders/${notification.related_object_id || ''}`;
        case 'PRICE_DROP':
        case 'BACK_IN_STOCK': return `/products/${notification.related_object_id || ''}`;
        case 'CART_REMINDER': return `/cart`;
        default: return null;
    }
};

const NotificationsPage = () => {
    const dispatch = useDispatch();
    const { items: rawItems, unreadCount, loading, preferences } = useSelector((state) => state.notifications);
    const notifications = Array.isArray(rawItems) ? rawItems : (rawItems?.results || []);
    
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'unread', 'orders', 'preferences'

    useEffect(() => {
        dispatch(fetchNotifications());
        dispatch(fetchUnreadCount());
        dispatch(fetchPreferences());
    }, [dispatch]);

    const handleMarkAll = () => {
        dispatch(markAllNotificationsRead());
        toast.success("All notifications marked as read");
    };

    const handleMarkOne = (id) => {
        dispatch(markNotificationRead(id));
    };

    const handlePreferenceToggle = (key, value) => {
        const updated = { ...preferences, [key]: value };
        dispatch(updatePreferences(updated));
        toast.success("Notification preference updated");
    };

    const filteredNotifications = notifications.filter((item) => {
        if (activeTab === 'unread') return !item.is_read;
        if (activeTab === 'orders') return item.type === 'ORDER_UPDATE';
        return true;
    });

    return (
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span>Notifications</span>
                        {unreadCount > 0 && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                                {unreadCount} Unread
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Stay informed about your purchases, shipping status, price drops, and account alerts.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={handleMarkAll}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-semibold transition shadow-xs"
                        >
                            <CheckCheck className="w-4 h-4" /> Mark All as Read
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-3 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                        activeTab === 'all'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    All Notifications ({notifications.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('unread')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                        activeTab === 'unread'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    Unread ({unreadCount})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                        activeTab === 'orders'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    Order Updates
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('preferences')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                        activeTab === 'preferences'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    <Settings className="w-3.5 h-3.5" /> Preferences & Settings
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'preferences' ? (
                /* Notification Preferences Panel */
                <div className="max-w-2xl bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Notification Preferences</h2>
                            <p className="text-xs text-gray-500">Configure which messages and alerts you want to receive.</p>
                        </div>
                    </div>

                    {preferences ? (
                        <div className="space-y-4 divide-y divide-gray-100">
                            {Object.entries(preferences).map(([key, value]) => {
                                const title = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                                return (
                                    <div key={key} className="flex items-center justify-between pt-4 first:pt-0">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{title}</p>
                                            <p className="text-xs text-gray-400">Receive alerts related to {title.toLowerCase()}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={!!value}
                                                onChange={(e) => handlePreferenceToggle(key, e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-gray-500 text-sm">
                            <RefreshCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                            Loading preferences...
                        </div>
                    )}
                </div>
            ) : (
                /* Notifications List */
                <div className="space-y-3">
                    {loading && notifications.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-xs">
                            <RefreshCcw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">Loading notifications...</p>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-xs">
                            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-gray-900">
                                {activeTab === 'unread' ? "You're all caught up!" : "No notifications to show"}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                                {activeTab === 'unread'
                                    ? "All your notifications have been read."
                                    : "Updates about your orders, price alerts, and deliveries will appear here."}
                            </p>
                        </div>
                    ) : (
                        filteredNotifications.map((notif) => {
                            const link = getLinkForType(notif);
                            return (
                                <div
                                    key={notif.id}
                                    className={`bg-white border rounded-2xl p-4.5 shadow-xs transition-all flex items-start justify-between gap-4 ${
                                        !notif.is_read ? 'border-indigo-200 bg-indigo-50/20' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                        <div
                                            className={`p-2.5 rounded-xl flex-shrink-0 ${
                                                !notif.is_read ? 'bg-indigo-100/70' : 'bg-gray-100'
                                            }`}
                                        >
                                            {getIconForType(notif.type)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className={`text-sm font-bold ${!notif.is_read ? 'text-indigo-950' : 'text-gray-900'}`}>
                                                    {notif.title}
                                                </h4>
                                                {!notif.is_read && (
                                                    <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                                {notif.message}
                                            </p>
                                            <div className="flex items-center gap-3 mt-2.5 text-[11px] text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {notif.created_at
                                                        ? new Date(notif.created_at).toLocaleDateString('en-IN', {
                                                              day: 'numeric',
                                                              month: 'short',
                                                              year: 'numeric',
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                          })
                                                        : 'Recent'}
                                                </span>
                                                {link && (
                                                    <Link
                                                        to={link}
                                                        onClick={() => !notif.is_read && handleMarkOne(notif.id)}
                                                        className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                                                    >
                                                        <span>View Details</span>
                                                        <ArrowRight className="w-3 h-3" />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {!notif.is_read && (
                                        <button
                                            type="button"
                                            onClick={() => handleMarkOne(notif.id)}
                                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors flex-shrink-0"
                                            title="Mark as read"
                                        >
                                            Mark Read
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;

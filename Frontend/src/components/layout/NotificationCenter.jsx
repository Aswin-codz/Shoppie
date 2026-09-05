import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { Bell, Check, Settings, X, Package, Tag, ArrowRight, Activity, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchNotifications, fetchUnreadCount, markNotificationRead, markAllNotificationsRead } from '../../features/notifications/notificationSlice';

const getIconForType = (type) => {
    switch (type) {
        case 'ORDER_UPDATE': return <Package className="w-5 h-5 text-blue-500" />;
        case 'PRICE_DROP': return <Tag className="w-5 h-5 text-green-500" />;
        case 'BACK_IN_STOCK': return <Activity className="w-5 h-5 text-purple-500" />;
        case 'CART_REMINDER': return <ShoppingCart className="w-5 h-5 text-yellow-500" />;
        default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
};

const getLinkForType = (notification) => {
    switch (notification.type) {
        case 'ORDER_UPDATE': return `/orders/${notification.related_object_id || ''}`;
        case 'PRICE_DROP': 
        case 'BACK_IN_STOCK': return `/products/${notification.related_object_id || ''}`;
        case 'CART_REMINDER': return `/cart`;
        default: return '#';
    }
};

const NotificationCenter = () => {
    const dispatch = useDispatch();
    const { items: rawItems, unreadCount, loading } = useSelector((state) => state.notifications);
    const notifications = Array.isArray(rawItems) ? rawItems : (rawItems?.results || []);
    const { isAuthenticated, accessToken } = useSelector((state) => state.auth);
    
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Polling setup
    useEffect(() => {
        if (!isAuthenticated || !accessToken) return;
        
        dispatch(fetchUnreadCount());
        const intervalId = setInterval(() => {
            dispatch(fetchUnreadCount());
        }, 60000); // 1 minute polling
        
        return () => clearInterval(intervalId);
    }, [dispatch, isAuthenticated, accessToken]);
    
    // Fetch notifications when opened
    useEffect(() => {
        if (isOpen && isAuthenticated && accessToken) {
            dispatch(fetchNotifications());
        }
    }, [isOpen, isAuthenticated, accessToken, dispatch]);

    const handleMarkAllRead = () => {
        dispatch(markAllNotificationsRead());
    };

    const handleMarkRead = (id) => {
        dispatch(markNotificationRead(id));
    };

    if (!isAuthenticated) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 border-2 border-white rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 z-50 w-80 md:w-96 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-800">Notifications</h3>
                            <div className="flex gap-2">
                                <Link 
                                    to="/notifications"
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                                    title="Notification Preferences & History"
                                >
                                    <Settings className="w-4 h-4" />
                                </Link>
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={handleMarkAllRead}
                                        className="p-1 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-200 transition-colors"
                                        title="Mark all as read"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {loading && notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                                    <p>Loading...</p>
                                </div>
                            ) : !Array.isArray(notifications) || notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                    <p>You have no notifications</p>
                                </div>
                            ) : (
                                <ul>
                                    {notifications.map((notification) => (
                                        <li 
                                            key={notification.id} 
                                            className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-indigo-50/30' : ''}`}
                                        >
                                            <div className="flex items-start p-4 gap-3">
                                                <div className={`p-2 rounded-full flex-shrink-0 ${!notification.is_read ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                                                    {getIconForType(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
                                                        {notification.message}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(notification.created_at).toLocaleDateString()}
                                                        </span>
                                                        {getLinkForType(notification) !== '#' && (
                                                            <Link 
                                                                to={getLinkForType(notification)}
                                                                onClick={() => {
                                                                    setIsOpen(false);
                                                                    if (!notification.is_read) handleMarkRead(notification.id);
                                                                }}
                                                                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                                            >
                                                                View details <ArrowRight className="w-3 h-3" />
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                                {!notification.is_read && (
                                                    <button 
                                                        onClick={() => handleMarkRead(notification.id)}
                                                        className="w-2 h-2 mt-2 rounded-full bg-indigo-600 flex-shrink-0 hover:bg-indigo-800 transition-colors"
                                                        title="Mark as read"
                                                    />
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
                            <Link 
                                to="/account/notifications"
                                onClick={() => setIsOpen(false)}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                            >
                                View all notifications
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationCenter;

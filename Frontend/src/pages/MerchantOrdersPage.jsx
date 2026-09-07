import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    Download, DollarSign, Package, ShoppingBag, Truck, Clock, TrendingUp,
    AlertTriangle, Eye, ShoppingCart, RefreshCcw, Check, X,
    ChevronDown, ChevronUp, Lock, MapPin, Mail, Phone, User, Calendar,
    Search, Filter, CheckCircle2, AlertCircle, ExternalLink, ChevronRight,
    Layers, CreditCard, Sparkles, HelpCircle, RotateCcw
} from 'lucide-react';
import { fetchMerchantOrders } from '../features/orders/ordersSlice';
import { ordersApi } from '../features/orders/ordersApi';
import axiosClient from '../api/axiosClient';
import { getMerchantAnalytics as getProductAnalytics } from '../features/catalog/catalogApi';

const STATUS_CONFIG = {
    PENDING: {
        label: 'Pending',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 ring-amber-400',
        dotClass: 'bg-amber-500',
        icon: Clock,
    },
    PACKAGING: {
        label: 'Packaging',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100 ring-blue-400',
        dotClass: 'bg-blue-500',
        icon: Package,
    },
    TRANSPORTED: {
        label: 'Transported',
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100 ring-purple-400',
        dotClass: 'bg-purple-500',
        icon: Truck,
    },
    DELIVERED: {
        label: 'Delivered',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 ring-emerald-400',
        dotClass: 'bg-emerald-500',
        icon: CheckCircle2,
    },
    CANCELLED: {
        label: 'Cancelled',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 ring-rose-400',
        dotClass: 'bg-rose-500',
        icon: AlertCircle,
    },
    RETURNED: {
        label: 'Returned',
        badgeClass: 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100 ring-orange-400',
        dotClass: 'bg-orange-500',
        icon: RotateCcw,
    },
};

/**
 * Modern crafty status dropdown component with status pills,
 * visual hierarchy, micro-interactions, and immutability lock.
 */
const ModernStatusDropdown = ({ currentStatus, isLocked, isUpdating, onStatusChange, lockReason }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.PENDING;
    const CurrentIcon = config.icon;

    if (isLocked) {
        return (
            <div className="relative group inline-block">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs cursor-not-allowed select-none">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Delivered</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-900 ml-0.5">
                        Immutable
                    </span>
                </div>
                <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 w-64 p-2.5 bg-gray-900/95 backdrop-blur text-white text-[11px] leading-snug rounded-lg shadow-xl text-center border border-gray-700">
                    <p className="font-semibold text-emerald-400 mb-0.5 flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3 inline" /> Status Locked
                    </p>
                    {lockReason || "Delivered orders are immutable. Modifying status is locked unless the customer initiates a return request."}
                </div>
            </div>
        );
    }

    return (
        <div className={`relative inline-block text-left ${isOpen ? 'z-50' : 'z-20'}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isUpdating}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border shadow-xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed ${config.badgeClass}`}
            >
                {isUpdating ? (
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin text-gray-600" />
                ) : (
                    <>
                        <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
                        <CurrentIcon className="w-3.5 h-3.5" />
                        <span>{config.label}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 z-50 focus:outline-none ring-1 ring-black/5"
                    >
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                            Update Order Status
                        </div>
                        <div className="py-1">
                            {Object.entries(STATUS_CONFIG).map(([statusKey, item]) => {
                                const ItemIcon = item.icon;
                                const isSelected = currentStatus === statusKey;
                                return (
                                    <button
                                        key={statusKey}
                                        type="button"
                                        onClick={() => {
                                            setIsOpen(false);
                                            if (statusKey !== currentStatus) {
                                                onStatusChange(statusKey);
                                            }
                                        }}
                                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50 transition-colors group ${
                                            isSelected ? 'bg-indigo-50 font-semibold text-indigo-900' : 'text-gray-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className={`w-2 h-2 rounded-full ${item.dotClass}`} />
                                            <ItemIcon className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-900" />
                                            <span>{item.label}</span>
                                        </div>
                                        {isSelected && (
                                            <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const MerchantOrdersPage = () => {
    const dispatch = useDispatch();
    const { merchantOrders, loading, error } = useSelector((state) => state.orders);
    const [updatingId, setUpdatingId] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [productAnalytics, setProductAnalytics] = useState([]);
    const [returns, setReturns] = useState([]);
    const [loadingReturns, setLoadingReturns] = useState(false);
    const [isReturnsOpen, setIsReturnsOpen] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const pendingReturnsCount = useMemo(() => {
        return returns.filter((r) => r.status === 'REQUESTED').length;
    }, [returns]);

    // Product search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [expandedProducts, setExpandedProducts] = useState({});

    useEffect(() => {
        dispatch(fetchMerchantOrders());
        const fetchAnalytics = async () => {
            try {
                setAnalyticsLoading(true);
                const response = await ordersApi.getMerchantAnalytics();
                setAnalytics(response.data);
            } catch (err) {
                console.error("Failed to load analytics", err);
            } finally {
                setAnalyticsLoading(false);
            }
        };
        const fetchProdAnalytics = async () => {
            try {
                const response = await getProductAnalytics();
                setProductAnalytics(response);
            } catch (err) {
                console.error("Failed to load product analytics", err);
            }
        };
        const fetchReturns = async () => {
            try {
                setLoadingReturns(true);
                const res = await axiosClient.get('/orders/returns/merchant/');
                setReturns(Array.isArray(res.data) ? res.data : (res.data?.results || []));
            } catch (err) {
                console.error("Failed to load returns", err);
            } finally {
                setLoadingReturns(false);
            }
        };
        fetchAnalytics();
        fetchProdAnalytics();
        fetchReturns();
    }, [dispatch]);

    const handleReturnAction = async (returnId, action) => {
        try {
            await axiosClient.post(`/orders/returns/merchant/${returnId}/${action}/`);
            toast.success(`Return request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
            // Refresh returns and orders
            const res = await axiosClient.get('/orders/returns/merchant/');
            setReturns(Array.isArray(res.data) ? res.data : (res.data?.results || []));
            dispatch(fetchMerchantOrders());
        } catch (err) {
            toast.error(`Failed to ${action} return`);
        }
    };

    const handleStatusUpdate = async (orderId, newStatus) => {
        setUpdatingId(orderId);
        try {
            await ordersApi.updateMerchantOrderStatus(orderId, newStatus);
            toast.success(`Order status updated to ${newStatus}`);
            dispatch(fetchMerchantOrders());
        } catch (err) {
            const errorMsg = err.response?.data?.detail || 'Failed to update status';
            toast.error(errorMsg);
        } finally {
            setUpdatingId(null);
        }
    };

    const handleExportCsv = async (e) => {
        e.preventDefault();
        try {
            setIsExporting(true);
            const response = await axiosClient.get('/orders/orders/merchant/csv_export/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `merchant_orders_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success("CSV export downloaded successfully!");
        } catch (err) {
            toast.error("Failed to export CSV");
        } finally {
            setIsExporting(false);
        }
    };

    /**
     * Group orders by product:
     * Transforms merchantOrders into a product-centric array where each entry
     * is a distinct product containing aggregated metrics and its list of customer orders.
     */
    const groupedProducts = useMemo(() => {
        const map = {};
        (merchantOrders || []).forEach((order) => {
            (order.items || []).forEach((item) => {
                const key = item.product_id ? `prod-${item.product_id}` : `sku-${item.product_sku || item.product_name}`;
                if (!map[key]) {
                    map[key] = {
                        key,
                        productId: item.product_id,
                        productName: item.product_name,
                        productSku: item.product_sku,
                        productImage: item.product_image || item.product_image_url,
                        unitPrice: item.unit_price,
                        totalOrdersCount: 0,
                        totalUnitsSold: 0,
                        totalRevenue: 0,
                        statusCounts: {},
                        orders: [],
                    };
                }
                map[key].totalOrdersCount += 1;
                map[key].totalUnitsSold += (Number(item.quantity) || 0);
                map[key].totalRevenue += (Number(item.line_total) || 0);

                const status = order.status || 'PENDING';
                map[key].statusCounts[status] = (map[key].statusCounts[status] || 0) + 1;

                map[key].orders.push({
                    order,
                    item,
                });
            });
        });
        return Object.values(map);
    }, [merchantOrders]);

    // Expand all by default on first load if not set
    useEffect(() => {
        if (groupedProducts.length > 0 && Object.keys(expandedProducts).length === 0) {
            const initial = {};
            groupedProducts.forEach((p) => {
                initial[p.key] = true;
            });
            setExpandedProducts(initial);
        }
    }, [groupedProducts]);

    const toggleProductExpand = (key) => {
        setExpandedProducts((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const expandAll = () => {
        const all = {};
        groupedProducts.forEach((p) => {
            all[p.key] = true;
        });
        setExpandedProducts(all);
    };

    const collapseAll = () => {
        setExpandedProducts({});
    };

    // Filter products based on search query and status filter
    const filteredProducts = useMemo(() => {
        return groupedProducts.filter((product) => {
            // Status filter matching
            if (statusFilter !== 'ALL') {
                if (statusFilter === 'RETURNS') {
                    const hasReturn = product.orders.some(({ order, item }) => {
                        return order.has_return || returns.some(
                            (r) => (r.order === order.id || r.order_number === order.order_number) &&
                                   (!r.order_item || r.order_item === item.id)
                        );
                    });
                    if (!hasReturn) return false;
                } else {
                    const count = product.statusCounts[statusFilter] || 0;
                    if (count === 0) return false;
                }
            }

            // Search query matching
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();

            const matchProduct =
                product.productName?.toLowerCase().includes(q) ||
                product.productSku?.toLowerCase().includes(q);

            if (matchProduct) return true;

            // Search in customer orders
            const matchOrder = product.orders.some(({ order }) => {
                const addr = order.shipping_address_snapshot || {};
                return (
                    order.order_number?.toLowerCase().includes(q) ||
                    order.customer_name?.toLowerCase().includes(q) ||
                    order.customer_email?.toLowerCase().includes(q) ||
                    order.customer_phone?.toLowerCase().includes(q) ||
                    addr.city?.toLowerCase().includes(q) ||
                    addr.state?.toLowerCase().includes(q) ||
                    addr.postal_code?.toLowerCase().includes(q)
                );
            });

            return matchOrder;
        });
    }, [groupedProducts, statusFilter, searchQuery, returns]);

    const renderAddressSnapshot = (snapshot) => {
        if (!snapshot || typeof snapshot !== 'object') {
            return <span className="text-gray-400 text-xs italic">No address recorded</span>;
        }
        const { full_name, phone, phone_number, address_line_1, address_line_2, city, state, postal_code, country } = snapshot;
        const contactNumber = phone || phone_number;
        return (
            <div className="text-xs text-gray-600 space-y-0.5">
                <p className="font-semibold text-gray-900">{full_name || 'Customer'}</p>
                {address_line_1 && <p>{address_line_1}</p>}
                {address_line_2 && <p>{address_line_2}</p>}
                <p>{[city, state, postal_code].filter(Boolean).join(', ')}</p>
                {country && <p className="text-gray-500">{country}</p>}
                {contactNumber && (
                    <p className="text-gray-500 flex items-center gap-1 pt-1 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{contactNumber}</span>
                    </p>
                )}
            </div>
        );
    };

    if (loading && (!merchantOrders || merchantOrders.length === 0)) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading merchant dashboard & orders...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-16 text-center">
                <div className="inline-flex items-center gap-2 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-full min-w-0">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
                        <span>Merchant Orders</span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                            Product-Centric Hub
                        </span>
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Manage fulfillment, inspect customer deliveries, and control order lifecycles by product.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={isExporting}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 w-full sm:w-auto border border-transparent rounded-xl shadow-xs text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50"
                    >
                        {isExporting ? (
                            <RefreshCcw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        <span>{isExporting ? 'Exporting...' : 'Export Orders (CSV)'}</span>
                    </button>
                </div>
            </div>


            {/* Analytics Overview Cards */}
            {analyticsLoading ? (
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6 mb-8 sm:mb-10">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-gray-100 animate-pulse min-h-[140px]"></div>
                    ))}
                </div>
            ) : analytics && (
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6 mb-8 sm:mb-10">
                    {/* Net Revenue (factoring in returned orders) */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-gray-200/90 hover:border-emerald-200 hover:shadow-md transition-all duration-200 min-h-[140px] flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Net Revenue</span>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">
                                ₹{Number(analytics.net_revenue ?? (analytics.total_revenue - (analytics.returned_revenue || 0)) ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <div className="text-xs text-gray-500 mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="text-gray-600 font-medium">Gross: ₹{Number(analytics.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                {Number(analytics.returned_revenue || 0) > 0 && (
                                    <>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-rose-600 font-medium">Returns: -₹{Number(analytics.returned_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Total Orders */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-gray-200/90 hover:border-indigo-200 hover:shadow-md transition-all duration-200 min-h-[140px] flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Orders</span>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">
                                {analytics.total_orders || 0}
                            </p>
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                Total customer orders received
                            </p>
                        </div>
                    </div>

                    {/* Units Sold */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-gray-200/90 hover:border-sky-200 hover:shadow-md transition-all duration-200 min-h-[140px] flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Units Sold</span>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">
                                {analytics.units_sold || 0}
                            </p>
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                Individual products shipped & sold
                            </p>
                        </div>
                    </div>

                    {/* Avg Order Value */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-gray-200/90 hover:border-violet-200 hover:shadow-md transition-all duration-200 min-h-[140px] flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Avg Order Value</span>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">
                                ₹{Number(analytics.average_order_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                Average ticket size per checkout
                            </p>
                        </div>
                    </div>

                    {/* Returned Products (replaces Conversion Rate) */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-gray-200/90 hover:border-amber-200 hover:shadow-md transition-all duration-200 min-h-[140px] flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Returned Products</span>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center flex-shrink-0">
                                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xl sm:text-3xl font-black text-amber-600 tracking-tight">
                                {analytics.returned_units || 0} <span className="text-base font-semibold text-gray-500">Units</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                {analytics.returned_requests_count || 0} return request(s) filed
                                {Number(analytics.returned_revenue || 0) > 0 && ` (-₹${Number(analytics.returned_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })})`}
                            </p>
                        </div>
                    </div>

                    {/* Add to Cart */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-gray-200/90 hover:border-indigo-200 hover:shadow-md transition-all duration-200 min-h-[140px] flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Add to Cart</span>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xl sm:text-3xl font-black text-indigo-600 tracking-tight">
                                {Number(analytics.add_to_cart_rate || 0).toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                Shoppers adding items to their basket
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Intelligence Section */}
            {productAnalytics && productAnalytics.length > 0 && (
                <div className="mb-10">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-indigo-600" />
                        Product Intelligence Funnel
                    </h2>
                    <div className="overflow-x-auto bg-white rounded-2xl shadow-xs border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50/70">
                                <tr>
                                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Funnel (Views → Cart → Buy)</th>
                                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversion</th>
                                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Abandonment</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {productAnalytics.map((pa) => (
                                    <tr key={pa.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-3 sm:px-4 py-3 font-medium text-gray-900 max-w-[200px] sm:max-w-[280px] break-words whitespace-normal leading-snug">
                                            <span title={pa.name}>{pa.name}</span>
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-gray-500">
                                            {pa.status === 'OUT_OF_STOCK' ? (
                                                <span className="inline-flex items-center text-red-600 font-semibold gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50">
                                                    <AlertTriangle className="h-3.5 w-3.5" /> Out of stock ({pa.stock})
                                                </span>
                                            ) : pa.status === 'LOW_STOCK' || pa.status === 'LOW_STOCK_HIGH_DEMAND' ? (
                                                <span className="inline-flex items-center text-amber-600 font-semibold gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50">
                                                    <AlertTriangle className="h-3.5 w-3.5" /> Low stock ({pa.stock})
                                                    {pa.status === 'LOW_STOCK_HIGH_DEMAND' && <TrendingUp className="h-3 w-3 text-emerald-500" title="High Demand" />}
                                                </span>
                                            ) : (
                                                <span className="text-gray-700 font-medium">{pa.stock} in stock</span>
                                            )}
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-gray-500">
                                            <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
                                                <span className="flex items-center gap-1 text-gray-600"><Eye className="h-3.5 w-3.5 text-gray-400" /> {pa.funnel?.views || 0}</span>
                                                <span className="text-gray-300">→</span>
                                                <span className="flex items-center gap-1 text-gray-600"><ShoppingCart className="h-3.5 w-3.5 text-indigo-400" /> {pa.funnel?.adds || 0}</span>
                                                <span className="text-gray-300">→</span>
                                                <span className="flex items-center gap-1 text-gray-600"><ShoppingBag className="h-3.5 w-3.5 text-emerald-500" /> {pa.funnel?.purchases || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-xs">
                                            <span className={(pa.rates?.conversion_rate || 0) > 5 ? 'text-emerald-600 font-semibold' : 'text-gray-700'}>
                                                {(pa.rates?.conversion_rate || 0).toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-xs">
                                            {(() => {
                                                const adds = pa.funnel?.adds || 0;
                                                const purchases = pa.funnel?.purchases || 0;
                                                const ab_rate = adds > 0 ? ((adds - purchases) / adds) * 100 : 0;
                                                return (
                                                    <span className={ab_rate > 50 ? 'text-rose-600 font-semibold' : 'text-gray-600'}>
                                                        {ab_rate.toFixed(1)}%
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Return Requests Collapsible Section */}
            {returns.length > 0 && (
                <div className="mb-10 bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
                    {/* Accordion Toggle Header */}
                    <button
                        type="button"
                        onClick={() => setIsReturnsOpen((prev) => !prev)}
                        className="w-full px-5 py-4 flex items-center justify-between bg-white hover:bg-gray-50/80 transition-colors text-left"
                    >
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                                <RefreshCcw className="h-5 w-5" />
                            </div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                                    Return Requests
                                </h2>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                    {returns.length}
                                </span>
                            </div>

                            {/* Status Badge: Red pulsing when action needed, neutral when cleared */}
                            {pendingReturnsCount > 0 ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-xs animate-pulse">
                                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                    {pendingReturnsCount} Action Required
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    All Cleared
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-gray-400">
                            <span className="text-xs hidden sm:inline text-gray-500">
                                {isReturnsOpen ? 'Collapse' : 'Expand'}
                            </span>
                            <ChevronDown
                                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                                    isReturnsOpen ? 'rotate-180 text-indigo-600' : ''
                                }`}
                            />
                        </div>
                    </button>

                    {/* Collapsible Content */}
                    {isReturnsOpen && (
                        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/40 space-y-3">
                            {returns.map((req) => (
                                <div
                                    key={req.id}
                                    className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition hover:border-gray-300"
                                >
                                    <div className="flex-1 min-w-0">
                                        {/* Neatly aligned Request ID, Order ID & Product Name */}
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono shrink-0">
                                                Return #{req.id}
                                            </span>
                                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono shrink-0 flex items-center gap-1">
                                                <span className="text-gray-400">Order:</span>
                                                <span>{req.order_number || `#${req.order}`}</span>
                                            </span>
                                            <span className="text-gray-300 hidden sm:inline">•</span>
                                            <span className="font-semibold text-gray-900 text-sm break-words">
                                                {req.product_name}
                                            </span>
                                        </div>

                                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                            <span>Quantity: <strong className="text-gray-800">{req.quantity}</strong></span>
                                            <span>Reason: <strong className="text-amber-700 font-medium">{req.reason}</strong></span>
                                        </div>

                                        {req.customer_notes && (
                                            <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2.5 rounded-lg italic border border-gray-100">
                                                "{req.customer_notes}"
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                                        <span
                                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                req.status === 'APPROVED' || req.status === 'COMPLETED'
                                                    ? 'bg-green-100 text-green-800'
                                                    : req.status === 'REJECTED'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-amber-100 text-amber-800'
                                            }`}
                                        >
                                            {req.status}
                                        </span>
                                        {req.status === 'REQUESTED' && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleReturnAction(req.id, 'approve')}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-medium transition-colors"
                                                    title="Approve Return"
                                                >
                                                    <Check className="w-3.5 h-3.5" /> Approve
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleReturnAction(req.id, 'reject')}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-medium transition-colors"
                                                    title="Reject Return"
                                                >
                                                    <X className="w-3.5 h-3.5" /> Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Product-Centric Orders Header & Search/Filter Controls */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2.5">
                            <Layers className="w-6 h-6 text-indigo-600" />
                            Orders by Product
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Each product card aggregates units sold, revenue, and active customer orders.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-auto sm:min-w-[240px]">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search product, SKU, buyer, order..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Bulk Expand / Collapse */}
                        <div className="inline-flex rounded-xl border border-gray-200 p-0.5 bg-gray-50 text-xs justify-center">
                            <button
                                type="button"
                                onClick={expandAll}
                                className="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg hover:bg-white text-gray-700 font-medium transition-colors text-center"
                            >
                                Expand All
                            </button>
                            <button
                                type="button"
                                onClick={collapseAll}
                                className="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg hover:bg-white text-gray-700 font-medium transition-colors text-center"
                            >
                                Collapse All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Status Filter Badges */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 overflow-x-auto pb-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1 mr-1 flex-shrink-0">
                        <Filter className="w-3.5 h-3.5" /> Filter:
                    </span>
                    {[
                        { key: 'ALL', label: 'All Products' },
                        { key: 'PENDING', label: 'Pending' },
                        { key: 'PACKAGING', label: 'Packaging' },
                        { key: 'TRANSPORTED', label: 'Transported' },
                        { key: 'DELIVERED', label: 'Delivered' },
                        { key: 'CANCELLED', label: 'Cancelled' },
                        { key: 'RETURNED', label: 'Returned' },
                        { key: 'RETURNS', label: 'Has Returns' },
                    ].map((tab) => {
                        const isActive = statusFilter === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setStatusFilter(tab.key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                                    isActive
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Product Cards List */}
            {filteredProducts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-xs">
                    <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-gray-900">No matching product orders found</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        {searchQuery || statusFilter !== 'ALL'
                            ? "Try adjusting your search query or filter to see relevant product orders."
                            : "Orders placed by customers for your products will be grouped and listed here."}
                    </p>
                    {(searchQuery || statusFilter !== 'ALL') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('ALL');
                            }}
                            className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-semibold hover:bg-indigo-100"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredProducts.map((product) => {
                        const isExpanded = !!expandedProducts[product.key];
                        return (
                            <div
                                key={product.key}
                                className={`bg-white rounded-2xl border border-gray-200 shadow-xs transition-all duration-200 hover:border-gray-300 ${
                                    isExpanded ? 'overflow-visible' : 'overflow-hidden'
                                }`}
                            >
                                {/* Product Summary Card Header */}
                                <div
                                    onClick={() => toggleProductExpand(product.key)}
                                    className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 cursor-pointer bg-white hover:bg-gray-50/60 transition-colors select-none min-w-0"
                                >
                                    {/* Product Details (Left) */}
                                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full md:w-auto">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gray-100 border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center shadow-xs">
                                            {product.productImage ? (
                                                <img
                                                    src={product.productImage}
                                                    alt={product.productName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Package className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400" />
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                <h3 className="text-sm sm:text-base font-bold text-gray-900 break-words line-clamp-2 leading-snug">
                                                    {product.productName}
                                                </h3>
                                                {product.productSku && (
                                                    <span className="text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200 self-start">
                                                        SKU: {product.productSku}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                                                <span className="font-semibold text-gray-900">
                                                    ₹{Number(product.unitPrice || 0).toLocaleString('en-IN')} <span className="font-normal text-gray-400">/ unit</span>
                                                </span>
                                                <span className="text-gray-300">•</span>
                                                <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                                                    <ShoppingBag className="w-3.5 h-3.5" />
                                                    {product.totalOrdersCount} {product.totalOrdersCount === 1 ? 'Order' : 'Orders'}
                                                </span>
                                                <span className="text-gray-300">•</span>
                                                <span className="text-gray-600">
                                                    {product.totalUnitsSold} units sold
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Aggregated Metrics & Expand Button (Right) */}
                                    <div className="flex items-center gap-3 sm:gap-6 w-full md:w-auto justify-between md:justify-end pt-2 sm:pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                                        <div className="text-left md:text-right">
                                            <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Total Revenue</p>
                                            <p className="text-sm sm:text-base font-extrabold text-emerald-600">
                                                ₹{product.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>

                                        {/* Status Distribution Pills */}
                                        <div className="hidden sm:flex items-center gap-1.5">
                                            {product.statusCounts.PENDING > 0 && (
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                    {product.statusCounts.PENDING} Pend
                                                </span>
                                            )}
                                            {product.statusCounts.PACKAGING > 0 && (
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                    {product.statusCounts.PACKAGING} Pack
                                                </span>
                                            )}
                                            {product.statusCounts.TRANSPORTED > 0 && (
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                                    {product.statusCounts.TRANSPORTED} Transit
                                                </span>
                                            )}
                                            {product.statusCounts.DELIVERED > 0 && (
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {product.statusCounts.DELIVERED} Deliv
                                                </span>
                                            )}
                                            {product.statusCounts.RETURNED > 0 && (
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                                                    {product.statusCounts.RETURNED} Ret
                                                </span>
                                            )}
                                            {product.statusCounts.CANCELLED > 0 && (
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                                    {product.statusCounts.CANCELLED} Canc
                                                </span>
                                            )}
                                        </div>

                                        {/* Toggle Chevron & Button */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleProductExpand(product.key);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <span>{isExpanded ? 'Hide Orders' : `View Orders (${product.orders.length})`}</span>
                                            <ChevronDown
                                                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                                                    isExpanded ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Customer Orders Section */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="border-t border-gray-100 bg-slate-50/60 p-3 sm:p-5 overflow-visible min-w-0"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                                    <User className="w-4 h-4 text-indigo-600 shrink-0" />
                                                    Customer Orders ({product.orders.length})
                                                </h4>
                                                <span className="text-[11px] text-gray-400">
                                                    Delivery details & fulfillment controls
                                                </span>
                                            </div>

                                            <div className="space-y-3">
                                                {product.orders.map(({ order, item }) => {
                                                    // Find if there is an active return request for this order/item
                                                    const orderReturns = returns.filter(
                                                        (r) =>
                                                            (r.order === order.id || r.order_number === order.order_number) &&
                                                            (!r.order_item || r.order_item === item.id)
                                                    );
                                                    const hasReturnRequest = order.has_return || orderReturns.length > 0;
                                                    const returnRequest = orderReturns[0];

                                                    // Delivered status is immutable UNLESS customer requested a return
                                                    const isDelivered = order.status === 'DELIVERED';
                                                    const isLocked = isDelivered && !hasReturnRequest;

                                                    return (
                                                        <div
                                                            key={`${order.id}-${item.id}`}
                                                            className="bg-white rounded-xl border border-gray-200/90 shadow-xs p-3.5 sm:p-5 transition-shadow hover:shadow-sm relative overflow-visible min-w-0"
                                                        >
                                                            {/* Order Row Header */}
                                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 pb-3 border-b border-gray-100 relative overflow-visible">
                                                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                                    <span className="font-mono font-bold text-xs sm:text-sm text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 break-all">
                                                                        {order.order_number}
                                                                    </span>
                                                                    <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                                                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                                        {order.created_at
                                                                            ? new Date(order.created_at).toLocaleDateString('en-IN', {
                                                                                  day: 'numeric',
                                                                                  month: 'short',
                                                                                  year: 'numeric',
                                                                              })
                                                                            : 'Recent'}
                                                                    </span>
                                                                    {/* Payment Status Badge */}
                                                                    <span
                                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                                            order.payment_status === 'PAID'
                                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                                : order.payment_status === 'PENDING'
                                                                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                                                                        }`}
                                                                    >
                                                                        <CreditCard className="w-3 h-3 shrink-0" />
                                                                        <span>{order.payment_status || 'PAID'}</span>
                                                                    </span>
                                                                </div>

                                                                {/* Status Action / Dropdown */}
                                                                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0">
                                                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider sm:hidden">Order Status:</span>
                                                                    <ModernStatusDropdown
                                                                        currentStatus={order.status}
                                                                        isLocked={isLocked}
                                                                        isUpdating={updatingId === order.id}
                                                                        onStatusChange={(newStatus) => handleStatusUpdate(order.id, newStatus)}
                                                                        lockReason="Delivered status is immutable. Modifying is locked unless the buyer initiates a return request."
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Customer Details & Delivery Info Grid */}
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mt-3 text-xs">
                                                                {/* Customer Contact Card */}
                                                                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60 min-w-0">
                                                                    <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1.5 text-indigo-700">
                                                                        <User className="w-3.5 h-3.5 shrink-0" /> Customer Contact
                                                                    </p>
                                                                    <p className="font-semibold text-gray-900 text-xs sm:text-sm break-words">
                                                                        {order.customer_name || 'Customer'}
                                                                    </p>
                                                                    {order.customer_email && (
                                                                        <p className="text-gray-600 mt-1 flex items-center gap-1.5 min-w-0">
                                                                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                                            <a
                                                                                href={`mailto:${order.customer_email}`}
                                                                                className="hover:underline text-indigo-600 truncate text-[11px]"
                                                                            >
                                                                                {order.customer_email}
                                                                            </a>
                                                                        </p>
                                                                    )}
                                                                    {order.customer_phone ? (
                                                                        <p className="text-gray-600 mt-1 flex items-center gap-1.5 font-mono text-[11px] min-w-0">
                                                                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                                            <a
                                                                                href={`tel:${order.customer_phone}`}
                                                                                className="hover:underline truncate"
                                                                            >
                                                                                {order.customer_phone}
                                                                            </a>
                                                                        </p>
                                                                    ) : (
                                                                        <p className="text-gray-400 mt-1 italic text-[11px]">Phone not provided</p>
                                                                    )}
                                                                </div>

                                                                {/* Delivery Address Card */}
                                                                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60 min-w-0 break-words">
                                                                    <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1.5 text-indigo-700">
                                                                        <MapPin className="w-3.5 h-3.5 shrink-0" /> Delivery Address
                                                                    </p>
                                                                    {renderAddressSnapshot(order.shipping_address_snapshot)}
                                                                </div>

                                                                {/* Order Item Line Summary */}
                                                                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60 min-w-0 flex flex-col justify-between">
                                                                    <div>
                                                                        <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1.5 text-indigo-700">
                                                                            <Package className="w-3.5 h-3.5 shrink-0" /> Ordered Units
                                                                        </p>
                                                                        <div className="space-y-1">
                                                                            <p className="text-gray-900 font-semibold text-xs sm:text-sm">
                                                                                {item.quantity} {item.quantity === 1 ? 'unit' : 'units'} × ₹{Number(item.unit_price).toFixed(2)}
                                                                            </p>
                                                                            <p className="text-gray-500 text-[11px]">
                                                                                Line Subtotal: <strong className="text-gray-900 font-bold">₹{Number(item.line_total).toFixed(2)}</strong>
                                                                            </p>
                                                                            <p className="text-gray-400 text-[10px]">
                                                                                Entire Order Total: ₹{Number(order.total_amount).toFixed(2)}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    {item.product_sku && (
                                                                        <div className="pt-1.5 border-t border-slate-200/70 mt-2 text-[10px] text-gray-500 font-mono truncate">
                                                                            SKU: {item.product_sku}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Return Alert Banner (if return requested) */}
                                                            {hasReturnRequest && (
                                                                <div className="mt-4 p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                                    <div className="flex items-start gap-2.5">
                                                                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                                                        <div>
                                                                            <p className="text-xs font-bold text-amber-900">
                                                                                Customer Initiated Return ({returnRequest?.reason || 'Return Requested'})
                                                                            </p>
                                                                            {returnRequest?.customer_notes && (
                                                                                <p className="text-xs text-amber-800 mt-0.5 italic">
                                                                                    "{returnRequest.customer_notes}"
                                                                                </p>
                                                                            )}
                                                                            <p className="text-[11px] text-amber-700 mt-0.5">
                                                                                Note: Delivered status lock has been unlocked for return processing.
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {returnRequest && returnRequest.status === 'REQUESTED' && (
                                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleReturnAction(returnRequest.id, 'approve')}
                                                                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                                                                            >
                                                                                Approve Return
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleReturnAction(returnRequest.id, 'reject')}
                                                                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                                                                            >
                                                                                Reject Return
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MerchantOrdersPage;

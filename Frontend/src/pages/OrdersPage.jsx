import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders } from '../features/orders/ordersSlice';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Truck, Package, Clock, XCircle, AlertTriangle, ArrowDownLeft, ShoppingCart } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { toast } from 'react-hot-toast';
import { addCartItem } from '../features/cart/cartSlice';
import { ordersApi } from '../features/orders/ordersApi';

const OrderTrackingTimeline = ({ status, historyEvents = [] }) => {
    const steps = [
        { id: 'PENDING', label: 'Order Placed', icon: Clock },
        { id: 'PACKAGING', label: 'Packaging', icon: Package },
        { id: 'TRANSPORTED', label: 'Transported', icon: Truck },
        { id: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
    ];
    
    if (status === 'CANCELLED') {
        const cancelEvent = historyEvents.find(e => e.status === 'CANCELLED');
        return (
            <div className="flex flex-col items-center justify-center py-6 px-6 border-b border-gray-200 bg-rose-50 text-rose-700">
                <div className="flex items-center gap-2 font-medium mb-1">
                    <XCircle className="h-6 w-6" />
                    Order Cancelled
                </div>
                {cancelEvent && <div className="text-sm text-rose-500">Cancelled on {new Date(cancelEvent.created_at).toLocaleString()}</div>}
            </div>
        );
    }

    const currentIndex = steps.findIndex(s => s.id === status);
    
    return (
        <div className="py-8 px-4 sm:px-6 lg:px-12 border-b border-gray-200 bg-white overflow-x-auto">
            <div className="relative min-w-[500px]">
                <div className="absolute top-4 left-0 w-full h-1 bg-gray-200 rounded">
                    <div 
                        style={{ width: `${Math.max(0, (currentIndex) / (steps.length - 1) * 100)}%` }} 
                        className="h-full bg-indigo-500 transition-all duration-500 rounded"
                    ></div>
                </div>
                
                <div className="flex justify-between relative w-full">
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        const isCompleted = index <= currentIndex;
                        const isCurrent = index === currentIndex;
                        
                        // Find matching event from history for timestamp
                        const event = historyEvents.find(e => e.status === step.id);
                        
                        return (
                            <div key={step.id} className={`flex flex-col items-center ${isCompleted ? 'text-indigo-600' : 'text-gray-400'} w-24 relative -ml-12 first:ml-0 last:mr-0 last:-mr-12 text-center`}>
                                <div className={`h-9 w-9 rounded-full flex items-center justify-center mb-3 z-10 transition-colors ${isCurrent ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md' : isCompleted ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border-2 border-gray-300 text-gray-300'}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <span className={`text-sm font-bold ${isCurrent ? 'text-indigo-700' : isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>
                                    {step.label}
                                </span>
                                {event && (
                                    <span className="text-xs text-gray-500 mt-1 font-medium whitespace-nowrap">
                                        {new Date(event.created_at).toLocaleDateString()}
                                    </span>
                                )}
                                {event && (
                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                        {new Date(event.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                )}
                                {event && event.notes && (
                                    <span className="text-xs text-indigo-500 mt-1 italic w-32 truncate" title={event.notes}>
                                        {event.notes}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const OrdersPage = () => {
    const [orders, setOrders] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const dispatch = useDispatch();

    const [returnModal, setReturnModal] = React.useState({ show: false, orderItem: null, order: null });
    const [returnForm, setReturnForm] = React.useState({ quantity: 1, reason: 'DEFECTIVE', customer_notes: '' });
    const navigate = useNavigate();

    const fetchOrderData = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/orders/orders/');
            const orderList = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            setOrders(orderList);
        } catch (err) {
            setError("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderData();
    }, []);

    const handleBuyAgain = (item) => {
        const product = {
            id: item.product_id,
            name: item.product_name,
            price: item.unit_price,
            stock_quantity: 100,
            primary_image: item.product_image
        };
        dispatch(addCartItem({ product, quantity: 1 }));
        toast.success(`Added ${item.product_name} to cart`);
    };

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm("Are you sure you want to cancel this order?")) return;
        try {
            await ordersApi.cancelOrder(orderId);
            toast.success("Order cancelled successfully");
            fetchOrderData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to cancel order");
        }
    };

    const submitReturn = async (e) => {
        e.preventDefault();
        try {
            await ordersApi.requestReturn({
                order_item_id: returnModal.orderItem.id,
                quantity: returnForm.quantity,
                reason: returnForm.reason,
                customer_notes: returnForm.customer_notes
            });
            toast.success("Return requested successfully");
            setReturnModal({ show: false, orderItem: null, order: null });
            fetchOrderData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to request return");
        }
    };

    if (loading && orders.length === 0) {
        return <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-16 text-center">Loading orders...</div>;
    }

    if (error) {
        return <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-16 text-center text-red-600">{error}</div>;
    }

    if (orders.length === 0) {
        return (
            <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-16 text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">Order History</h2>
                <p className="mt-4 text-lg text-gray-500">You haven't placed any orders yet.</p>
                <div className="mt-6">
                    <Link to="/" className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                        Start Shopping
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-12">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-8">Order History</h1>
            
            <div className="space-y-8">
                {orders.map((order) => (
                    <div key={order.id} className="bg-white border-t border-b border-gray-200 shadow-sm sm:rounded-lg sm:border">
                        <div className="px-4 py-6 sm:px-6 lg:p-8 flex items-center justify-between border-b border-gray-200 bg-gray-50 rounded-t-lg">
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 w-full">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Order Number</p>
                                    <p className="mt-1 text-sm text-gray-500">{order.order_number}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Date placed</p>
                                    <p className="mt-1 text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Total amount</p>
                                    <p className="mt-1 text-sm font-medium text-gray-900">₹{order.total_amount}</p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Status</p>
                                        <p className="mt-1 text-sm font-semibold text-indigo-600">{order.status}</p>
                                    </div>
                                    {(order.status === 'PENDING' || order.status === 'PACKAGING') && (
                                        <button 
                                            onClick={() => handleCancelOrder(order.id)}
                                            className="ml-4 px-3 py-1 bg-white border border-rose-300 text-rose-600 rounded hover:bg-rose-50 text-sm font-medium"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Order Tracking Timeline */}
                        <OrderTrackingTimeline status={order.status} historyEvents={order.history_events} />

                        <div className="px-4 py-6 sm:px-6 lg:p-8">
                            <ul className="divide-y divide-gray-200">
                                {order.items.map((item) => (
                                    <li key={item.id} className="py-6 flex">
                                        <div className="flex-shrink-0 w-20 h-20 bg-white border border-gray-200 rounded-lg overflow-hidden sm:w-24 sm:h-24 p-1 flex items-center justify-center">
                                            {(item.product_image || item.product_image_url) ? (
                                                <img src={item.product_image || item.product_image_url} alt={item.product_name} className="w-full h-full object-center object-contain" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Img</div>
                                            )}
                                        </div>

                                        <div className="ml-4 flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between sm:grid sm:grid-cols-2 sm:gap-x-6">
                                                    <div>
                                                        <h4 className="font-medium text-gray-900">
                                                            <Link to={`/product/${item.product_id}`}>{item.product_name}</Link>
                                                        </h4>
                                                        <p className="mt-1 text-sm text-gray-500">Qty {item.quantity}</p>
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-900 text-right sm:text-left mt-1 sm:mt-0">
                                                        ₹{item.line_total}
                                                    </p>
                                                    <div className="mt-4 flex gap-4">
                                                        {order.status === 'DELIVERED' && (
                                                            <button 
                                                                onClick={() => {
                                                                    setReturnForm({ quantity: 1, reason: 'DAMAGED', customer_notes: '' });
                                                                    setReturnModal({ show: true, orderItem: item, order: order });
                                                                }}
                                                                className="text-sm text-indigo-600 hover:text-indigo-900 font-medium flex items-center gap-1"
                                                            >
                                                                <ArrowDownLeft className="w-4 h-4" /> Return Item
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => handleBuyAgain(item)}
                                                            className="text-sm text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
                                                        >
                                                            <ShoppingCart className="w-4 h-4" /> Buy Again
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
            {/* Return Modal */}
            {returnModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">Return Item</h3>
                            <button onClick={() => setReturnModal({ show: false, orderItem: null, order: null })} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={submitReturn} className="p-4">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Item to Return</label>
                                <p className="text-sm text-gray-900 font-medium">{returnModal.orderItem?.product_name}</p>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={returnModal.orderItem?.quantity}
                                    value={returnForm.quantity}
                                    onChange={(e) => setReturnForm({ ...returnForm, quantity: e.target.value })}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                <select
                                    required
                                    value={returnForm.reason}
                                    onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="DAMAGED">Damaged in transit</option>
                                    <option value="DEFECTIVE">Defective / Malfunctioning</option>
                                    <option value="WRONG_ITEM">Received Wrong Item</option>
                                    <option value="NOT_AS_DESCRIBED">Item Not As Described</option>
                                    <option value="SIZE_ISSUE">Size or Fit Issue</option>
                                    <option value="CHANGED_MIND">Changed Mind / No Longer Needed</option>
                                    <option value="OTHER">Other Reason</option>
                                </select>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                                <textarea
                                    rows={3}
                                    value={returnForm.customer_notes}
                                    onChange={(e) => setReturnForm({ ...returnForm, customer_notes: e.target.value })}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Explain why you are returning this item..."
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setReturnModal({ show: false, orderItem: null, order: null })} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                                    Submit Return
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrdersPage;

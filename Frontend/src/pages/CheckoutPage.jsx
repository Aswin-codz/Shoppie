import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ordersApi } from '../features/orders/ordersApi';
import AddressSelector from '../components/checkout/AddressSelector';
import PaymentStep from '../components/checkout/PaymentStep';
import { clearCart, fetchCart } from '../features/cart/cartSlice';
import { toast } from 'react-hot-toast';

import { ShieldCheck, CreditCard, CheckCircle, Lock } from 'lucide-react';

// Cached Stripe promise singleton to avoid re-initializing Stripe.js on re-renders
let cachedStripePromise = null;
let cachedKey = null;

const getStripePromise = (key) => {
    if (!key || typeof key !== 'string' || !key.trim().startsWith('pk_')) return null;
    const trimmed = key.trim();
    if (cachedKey === trimmed && cachedStripePromise) {
        return cachedStripePromise;
    }
    cachedKey = trimmed;
    cachedStripePromise = loadStripe(trimmed);
    return cachedStripePromise;
};

const CheckoutPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { items: cartItems = [], status: cartStatus } = useSelector(state => state.cart);
    const { addresses } = useSelector(state => state.address);
    const [summary, setSummary] = useState(null);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [clientSecret, setClientSecret] = useState('');
    const [orderInfo, setOrderInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isConfirmingDemoPayment, setIsConfirmingDemoPayment] = useState(false);
    
    // Stripe publishable key & promise state (cached singleton)
    const [stripePromise, setStripePromise] = useState(() => 
        getStripePromise(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
    );

    useEffect(() => {
        // Fallback: fetch from backend only if not set in frontend env
        if (!stripePromise) {
            ordersApi.getStripeConfig()
                .then(res => {
                    const pk = res.data?.publishable_key;
                    if (pk && typeof pk === 'string' && pk.trim().startsWith('pk_')) {
                        setStripePromise(getStripePromise(pk));
                    }
                })
                .catch(() => {});
        }
    }, [stripePromise]);
    
    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState('');

    // Ensure cart is loaded if idle
    useEffect(() => {
        if (cartStatus === 'idle') {
            dispatch(fetchCart());
        }
    }, [cartStatus, dispatch]);

    // Fetch checkout summary or redirect if cart empty
    useEffect(() => {
        // Wait while cart status is still unconfirmed or loading
        if (cartStatus === 'idle' || cartStatus === 'loading') {
            return;
        }

        // Only redirect to /cart if cart load finished and items are genuinely empty
        if (cartStatus === 'succeeded' && (!cartItems || cartItems.length === 0)) {
            navigate('/cart', { replace: true });
            return;
        }

        let isSubscribed = true;
        const fetchSummary = async () => {
            try {
                setLoading(true);
                const res = await ordersApi.getCheckoutSummary({ coupon_code: appliedCoupon });
                if (isSubscribed) {
                    setSummary(res.data);
                    setError('');
                }
            } catch (err) {
                if (isSubscribed) {
                    setError(err.response?.data?.detail || 'Failed to load checkout summary. Please try again.');
                }
            } finally {
                if (isSubscribed) {
                    setLoading(false);
                }
            }
        };

        if (cartItems && cartItems.length > 0) {
            fetchSummary();
        }

        return () => {
            isSubscribed = false;
        };
    }, [cartItems, cartStatus, navigate, appliedCoupon]);

    const handleApplyCoupon = async (e) => {
        e.preventDefault();
        if (!couponCode) return;
        
        try {
            const res = await ordersApi.validateCoupon(couponCode);
            setAppliedCoupon(res.data.code);
            toast.success(`Coupon applied! ${res.data.discount_percentage}% off`);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Invalid coupon code");
            setAppliedCoupon('');
        }
    };
    
    const handleRemoveCoupon = () => {
        setAppliedCoupon('');
        setCouponCode('');
        toast.success('Coupon removed');
    };

    const handleProceedToPayment = async () => {
        if (!selectedAddressId) {
            setError("Please select a delivery address.");
            return;
        }
        
        const selectedAddress = addresses.find(a => a.id === selectedAddressId);
        if (!selectedAddress) {
            setError("Invalid address selected.");
            return;
        }

        setError('');
        setLoading(true);
        
        try {
            // Send address snapshot to backend to create pending order and payment intent
            const res = await ordersApi.createPaymentIntent({
                address_snapshot: selectedAddress,
                existing_order_id: orderInfo?.order_id,
                coupon_code: appliedCoupon
            });
            
            if (res.data.publishable_key && typeof res.data.publishable_key === 'string' && res.data.publishable_key.trim().startsWith('pk_')) {
                setStripePromise(getStripePromise(res.data.publishable_key));
            }

            setClientSecret(res.data.client_secret);
            setOrderInfo({
                order_id: res.data.order_id,
                order_number: res.data.order_number
            });
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to initialize payment.");
        } finally {
            setLoading(false);
        }
    };

    const [activePaymentMethod, setActivePaymentMethod] = useState('instant'); // 'instant' | 'stripe'

    const handleOneClickCheckout = async () => {
        if (!selectedAddressId) {
            setError("Please select a delivery address.");
            return;
        }
        
        const selectedAddress = addresses.find(a => a.id === selectedAddressId);
        if (!selectedAddress) {
            setError("Invalid address selected.");
            return;
        }

        setError('');
        setIsConfirmingDemoPayment(true);
        
        try {
            const res = await ordersApi.createPaymentIntent({
                address_snapshot: selectedAddress,
                existing_order_id: orderInfo?.order_id,
                coupon_code: appliedCoupon
            });
            
            await ordersApi.confirmPayment({
                order_id: res.data.order_id,
                payment_intent_id: res.data.client_secret || 'quick_checkout',
            });
            
            dispatch(clearCart());
            toast.success("Order placed and confirmed successfully!");
            navigate(`/checkout/success?order=${res.data.order_number}`);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to complete checkout.");
            setIsConfirmingDemoPayment(false);
        }
    };

    const handleDirectDemoPayment = async (e) => {
        if (e) e.preventDefault();
        setIsConfirmingDemoPayment(true);
        setError('');
        try {
            await ordersApi.confirmPayment({
                order_id: orderInfo.order_id,
                payment_intent_id: clientSecret || 'demo_paid',
            });
            dispatch(clearCart());
            toast.success("Payment completed successfully!");
            navigate(`/checkout/success?order=${orderInfo.order_number}`);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to complete payment. Please try again.");
            setIsConfirmingDemoPayment(false);
        }
    };

    const isRealStripe = Boolean(stripePromise && clientSecret && !clientSecret.startsWith('pi_demo_'));

    if ((loading || cartStatus === 'loading' || cartStatus === 'idle') && !summary) {
        return (
            <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-24 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-sm font-medium text-slate-500">Preparing secure checkout...</p>
            </div>
        );
    }

    if (error && !summary) {
        return (
            <div className="w-full max-w-md mx-auto px-6 py-24 text-center">
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                        !
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Checkout Notice</h2>
                    <p className="text-sm text-slate-600 mb-6">{error}</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                        <button
                            onClick={() => navigate('/cart')}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition"
                        >
                            Return to Cart
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-12 bg-slate-50/60 min-h-screen">
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-10 tracking-tight">Checkout</h1>
            
            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8 rounded-r-lg shadow-sm">
                    <div className="flex">
                        <div className="ml-3">
                            <p className="text-sm font-medium text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
                {/* Left column: Address and Payment */}
                <div className="lg:col-span-7 space-y-8">
                    
                    {/* Step 1: Address */}
                    <section className="bg-white p-6 sm:p-8 shadow-sm rounded-2xl border border-slate-200/80">
                        <AddressSelector 
                            selectedAddressId={selectedAddressId}
                            onSelectAddress={setSelectedAddressId}
                        />
                        
                        {!clientSecret && (
                            <div className="mt-8 border-t border-gray-200 pt-6 flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleProceedToPayment}
                                    disabled={loading || !selectedAddressId || isConfirmingDemoPayment}
                                    className="flex-1 bg-indigo-600 border border-transparent rounded-xl shadow-lg shadow-indigo-600/20 py-3.5 px-4 text-base font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                                >
                                    <CreditCard className="w-5 h-5" />
                                    {loading ? 'Processing...' : 'Continue to Payment Options'}
                                </button>
                                <button
                                    onClick={handleOneClickCheckout}
                                    disabled={loading || !selectedAddressId || isConfirmingDemoPayment}
                                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-600/20 py-3.5 px-4 text-base font-bold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                                >
                                    <Lock className="w-5 h-5" />
                                    {isConfirmingDemoPayment ? 'Placing Order...' : '⚡ Quick 1-Click Pay'}
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Step 2: Payment */}
                    {clientSecret && (
                        <section className="bg-white p-6 sm:p-8 shadow-sm rounded-2xl border border-slate-200/80" id="payment-section">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <CreditCard className="w-6 h-6 text-indigo-600" />
                                    Payment Method
                                </h3>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <ShieldCheck className="w-3.5 h-3.5" /> 256-bit Encrypted
                                </span>
                            </div>

                            {/* Payment Tabs */}
                            <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setActivePaymentMethod('instant')}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                                        activePaymentMethod === 'instant'
                                            ? 'bg-white text-indigo-700 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Lock className="w-4 h-4 text-emerald-600" />
                                    ⚡ Instant 1-Click Pay (Fast Dev)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActivePaymentMethod('stripe')}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                                        activePaymentMethod === 'stripe'
                                            ? 'bg-white text-indigo-700 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <CreditCard className="w-4 h-4 text-indigo-600" />
                                    💳 Card Payment (Stripe)
                                </button>
                            </div>

                            {activePaymentMethod === 'stripe' ? (
                                isRealStripe ? (
                                    <div className="space-y-6">
                                        <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-800 flex items-center justify-between">
                                            <span>💡 Stripe Test Card: <strong className="font-mono">4242 •••• •••• 4242</strong></span>
                                            <span>Exp: <strong>12/28</strong> | CVV: <strong>123</strong></span>
                                        </div>

                                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                                            <PaymentStep orderId={orderInfo?.order_id} orderNumber={orderInfo?.order_number} />
                                        </Elements>

                                        <div className="pt-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => setActivePaymentMethod('instant')}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2"
                                            >
                                                Prefer instant checkout? Switch to ⚡ 1-Click Pay
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3">
                                        <p className="text-sm text-slate-600">
                                            Stripe is in mock / offline mode for this session. Use the <strong>Instant 1-Click Pay</strong> option to test order placement without entering card digits.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setActivePaymentMethod('instant')}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
                                        >
                                            Switch to Instant 1-Click Pay
                                        </button>
                                    </div>
                                )
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-5 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-slate-50 rounded-xl border border-indigo-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-bold text-indigo-950">Instant Dev / Test Checkout</span>
                                            <span className="text-xs bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                                                Zero Friction
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                                            Test environment mode. Click below to securely confirm this order, decrement stock, and view the receipt immediately without typing card digits.
                                        </p>
                                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 font-mono">
                                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                                Mock Card: 4242 •••• 4242
                                            </div>
                                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                                Status: Authorized ✓
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleDirectDemoPayment}
                                        disabled={isConfirmingDemoPayment}
                                        className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-bold text-base hover:opacity-95 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                                    >
                                        <Lock className="w-5 h-5" />
                                        {isConfirmingDemoPayment 
                                            ? "Processing Payment..." 
                                            : `Pay ₹${Number(summary?.total_amount || 0).toFixed(2)} & Complete Order`}
                                    </button>

                                    <p className="text-center text-xs text-slate-400">
                                        Local testing active. All order records and stock deductions are tracked authoritatively in Postgres.
                                    </p>
                                </div>
                            )}
                        </section>
                    )}
                </div>

                {/* Right column: Order Summary */}
                <div className="lg:col-span-5 mt-10 lg:mt-0">
                    <section className="bg-white p-6 shadow-sm sm:rounded-lg border border-gray-200 sticky top-10">
                        <h2 className="text-lg font-medium text-gray-900 mb-6">Order summary</h2>
                        
                        {summary && (
                            <>
                                <ul className="divide-y divide-gray-200 border-t border-b border-gray-200 -mx-6 px-6 max-h-96 overflow-y-auto">
                                    {summary.items.map((item) => (
                                        <li key={item.cart_item_id} className="py-6 flex">
                                            {item.image && (
                                                <div className="flex-shrink-0 w-16 h-16 bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center p-1">
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-center object-contain" />
                                                </div>
                                            )}
                                            <div className="ml-4 flex-1 flex flex-col">
                                                <div>
                                                    <div className="flex justify-between text-base font-medium text-gray-900">
                                                        <h3 className="line-clamp-2">{item.name}</h3>
                                                        <p className="ml-4 whitespace-nowrap">₹{Number(item.line_total).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex-1 flex items-end justify-between text-sm">
                                                    <p className="text-gray-500">Qty {item.quantity}</p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <dl className="mt-6 space-y-4 text-sm text-gray-600">
                                    <div className="flex justify-between">
                                        <dt>Subtotal</dt>
                                        <dd className="text-gray-900">₹{Number(summary.subtotal).toFixed(2)}</dd>
                                    </div>
                                    {summary.discount_amount && Number(summary.discount_amount) > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <dt>Discount</dt>
                                            <dd>-₹{Number(summary.discount_amount).toFixed(2)}</dd>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <dt>Shipping</dt>
                                        <dd className="text-gray-900">₹{Number(summary.shipping_amount).toFixed(2)}</dd>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-200 pt-4 text-base font-medium text-gray-900">
                                        <dt>Total</dt>
                                        <dd>₹{Number(summary.total_amount).toFixed(2)}</dd>
                                    </div>
                                </dl>

                                {/* Coupon Section */}
                                <div className="mt-6 border-t border-gray-200 pt-6">
                                    <h3 className="text-sm font-medium text-gray-900 mb-3">Have a coupon code?</h3>
                                    {appliedCoupon ? (
                                        <div className="flex items-center justify-between bg-green-50 p-3 rounded-md border border-green-200">
                                            <div className="text-sm text-green-700 font-medium">
                                                Applied: {appliedCoupon}
                                            </div>
                                            <button 
                                                onClick={handleRemoveCoupon}
                                                className="text-sm text-red-600 hover:text-red-800 font-medium"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleApplyCoupon} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                placeholder="Enter code"
                                                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!couponCode}
                                                className="bg-gray-800 border border-transparent rounded-md shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50"
                                            >
                                                Apply
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;

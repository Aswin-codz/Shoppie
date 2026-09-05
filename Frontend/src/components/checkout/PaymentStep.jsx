import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { clearCart } from '../../features/cart/cartSlice';

import { ordersApi } from '../../features/orders/ordersApi';

const PaymentStep = ({ orderId, orderNumber }) => {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);
        
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/checkout/success?order=${orderNumber}`,
            },
            redirect: 'if_required'
        });

        if (error) {
            setMessage(error.message);
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            try {
                await ordersApi.confirmPayment({
                    order_id: orderId,
                    payment_intent_id: paymentIntent.id
                });
            } catch (err) {
                console.error("Payment confirmation sync error:", err);
            }
            dispatch(clearCart());
            navigate(`/checkout/success?order=${orderNumber}`);
        } else {
            setMessage("An unexpected error occurred.");
            setIsProcessing(false);
        }
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement id="payment-element" />
            
            {message && <div id="payment-message" className="text-red-500 text-sm">{message}</div>}
            
            <button
                disabled={isProcessing || !stripe || !elements}
                id="submit"
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out shadow-sm"
            >
                <span id="button-text">
                    {isProcessing ? "Processing..." : "Pay now"}
                </span>
            </button>
        </form>
    );
};

export default PaymentStep;

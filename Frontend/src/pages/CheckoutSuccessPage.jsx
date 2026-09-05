import React, { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const CheckoutSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const orderNumber = searchParams.get('order');

    useEffect(() => {
        // We could fetch the order details here to display them
    }, [orderNumber]);

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center h-screen flex flex-col justify-center items-center">
            <CheckCircle className="w-24 h-24 text-green-500 mb-6" />
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Order Successful!</h1>
            <p className="text-lg text-gray-600 mb-8">
                Thank you for your purchase. We're processing your order right away.
            </p>
            
            {orderNumber && (
                <div className="bg-gray-50 rounded-lg p-6 mb-8 w-full max-w-md mx-auto">
                    <p className="text-sm text-gray-500 uppercase tracking-wide">Order Number</p>
                    <p className="text-2xl font-mono font-bold text-gray-900 mt-1">{orderNumber}</p>
                </div>
            )}
            
            <div className="flex space-x-4">
                <Link to="/orders" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                    View Orders
                </Link>
                <Link to="/" className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Continue Shopping
                </Link>
            </div>
        </div>
    );
};

export default CheckoutSuccessPage;

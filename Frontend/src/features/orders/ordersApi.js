import axiosClient from '../../api/axiosClient';

export const ordersApi = {
    getCheckoutSummary: (data) => axiosClient.post('/orders/checkout/summary/', data || {}),
    validateCoupon: (code) => axiosClient.post('/orders/coupons/validate/', { code }),
    createPaymentIntent: (data) => axiosClient.post('/orders/checkout/payment-intent/', data),
    getOrders: () => axiosClient.get('/orders/orders/'),
    getOrderById: (id) => axiosClient.get(`/orders/orders/${id}/`),
    getMerchantOrders: () => axiosClient.get('/orders/orders/merchant/'),
    getMerchantAnalytics: () => axiosClient.get('/orders/orders/merchant/analytics/'),
    updateMerchantOrderStatus: (id, status) => axiosClient.patch(`/orders/orders/merchant/${id}/status/`, { status }),
    confirmPayment: (data) => axiosClient.post('/orders/orders/confirm_payment/', data),
    getStripeConfig: () => axiosClient.get('/orders/checkout/payment-intent/'),
    cancelOrder: (id) => axiosClient.post(`/orders/orders/${id}/cancel/`),
    requestReturn: (data) => axiosClient.post('/orders/returns/', data),
};

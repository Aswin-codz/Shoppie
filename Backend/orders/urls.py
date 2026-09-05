from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CartViewSet, CartItemViewSet, CartMergeView, WishlistViewSet,
    CheckoutSummaryView, PaymentIntentView, OrderViewSet, MerchantOrderViewSet,
    CouponValidateView, ReturnRequestViewSet, MerchantReturnViewSet, SupportIssueViewSet
)
from .webhooks import stripe_webhook
router = DefaultRouter()
router.register(r'cart/items', CartItemViewSet, basename='cart-item')
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'wishlist', WishlistViewSet, basename='wishlist')
router.register(r'merchant', MerchantOrderViewSet, basename='merchant-orders-short')
router.register(r'orders/merchant', MerchantOrderViewSet, basename='merchant-orders')
router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'returns/merchant', MerchantReturnViewSet, basename='merchant-returns')
router.register(r'returns', ReturnRequestViewSet, basename='returns')
router.register(r'support-issues', SupportIssueViewSet, basename='support-issues')

urlpatterns = [
    path('cart/merge/', CartMergeView.as_view(), name='cart-merge'),
    path('checkout/summary/', CheckoutSummaryView.as_view(), name='checkout-summary'),
    path('checkout/payment-intent/', PaymentIntentView.as_view(), name='payment-intent'),
    path('coupons/validate/', CouponValidateView.as_view(), name='coupon-validate'),
    path('webhooks/stripe/', stripe_webhook, name='stripe-webhook'),
    path('', include(router.urls)),
]

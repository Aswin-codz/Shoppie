from django.urls import path, include
from rest_framework.routers import DefaultRouter
from orders.views import ReturnRequestViewSet, OrderViewSet

direct_router = DefaultRouter()
direct_router.register(r'returns', ReturnRequestViewSet, basename='direct-returns')
direct_router.register(r'orders', OrderViewSet, basename='direct-orders')

urlpatterns = [
    path('health/', include('common.urls')),
    path('auth/', include('accounts.urls')),
    path('accounts/', include('accounts.urls')),
    path('catalog/', include('catalog.urls')),
    path('orders/', include('orders.urls')),
    path('', include(direct_router.urls)),
]


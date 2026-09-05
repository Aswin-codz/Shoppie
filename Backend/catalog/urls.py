from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, TagViewSet, ProductViewSet, MerchantProductViewSet, MerchantProductImageViewSet, ReviewViewSet, ProductReportViewSet, RecentlyViewedViewSet, StockAlertSubscriptionViewSet

router = DefaultRouter()
router.register(r'recently-viewed', RecentlyViewedViewSet, basename='recently-viewed')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'products', ProductViewSet, basename='product')

merchant_router = DefaultRouter()
merchant_router.register(r'products', MerchantProductViewSet, basename='merchant-product')

urlpatterns = [
    path('', include(router.urls)),
    path('products/<slug:product_slug>/stock-alert/', StockAlertSubscriptionViewSet.as_view({'post': 'create', 'delete': 'destroy'})),
    path('products/<slug:product_slug>/report/', ProductReportViewSet.as_view({'post': 'create'})),
    path('products/<slug:product_slug>/reviews/', ReviewViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('products/<slug:product_slug>/reviews/<int:pk>/', ReviewViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),
    path('products/<slug:product_slug>/reviews/<int:pk>/report/', ReviewViewSet.as_view({'post': 'report'})),
    path('merchant/', include(merchant_router.urls)),
    path('merchant/products/<int:product_pk>/images/', MerchantProductImageViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('merchant/products/<int:product_pk>/images/reorder/', MerchantProductImageViewSet.as_view({'patch': 'reorder'})),
    path('merchant/products/<int:product_pk>/images/<int:pk>/', MerchantProductImageViewSet.as_view({'delete': 'destroy'})),
    path('merchant/products/<int:product_pk>/images/<int:pk>/set-primary/', MerchantProductImageViewSet.as_view({'post': 'set_primary'})),
]

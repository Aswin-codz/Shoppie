from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView

from .views import RegisterView, MeView, LogoutView, AddressViewSet, NotificationViewSet, CustomTokenObtainPairView, CustomTokenRefreshView, NotificationPreferenceView
from .serializers import CustomTokenRefreshSerializer
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'addresses', AddressViewSet, basename='address')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("token/", CustomTokenObtainPairView.as_view(), name="auth-token"),
    path("token/refresh/", CustomTokenRefreshView.as_view(serializer_class=CustomTokenRefreshSerializer), name="auth-token-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("notification-preferences/", NotificationPreferenceView.as_view(), name="notification-preferences"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
]

urlpatterns += router.urls

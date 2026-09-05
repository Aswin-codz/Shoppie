from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import RegisterSerializer, UserSerializer, AddressSerializer, NotificationSerializer, NotificationPreferenceSerializer
from rest_framework import viewsets
from rest_framework.decorators import action
from django.db import transaction
from rest_framework.throttling import ScopedRateThrottle
from .models import Address, NotificationPreference


class CustomTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

class CustomTokenRefreshView(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

class RegisterView(APIView):
    """Public endpoint for user/merchant registration."""

    permission_classes = []
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'register'

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens for immediate login after registration
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    """Returns or updates the authenticated user's profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        user = request.user
        if 'phone_number' in request.data:
            user.phone_number = request.data['phone_number'].strip()
        if 'first_name' in request.data:
            user.first_name = request.data['first_name'].strip()
        if 'last_name' in request.data:
            user.last_name = request.data['last_name'].strip()
        if 'profile_image' in request.FILES:
            user.profile_image = request.FILES['profile_image']
        user.save()
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    """
    Blacklists the provided refresh token.
    The access token will expire naturally.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            # Token is already blacklisted or invalid — treat as success
            pass

        return Response(
            {"detail": "Successfully logged out."},
            status=status.HTTP_200_OK,
        )


class AddressViewSet(viewsets.ModelViewSet):
    """
    CRUD for User Addresses.
    Enforces user isolation.
    """
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        with transaction.atomic():
            # If this is the user's first address, or they marked it as default
            is_default = serializer.validated_data.get('is_default', False)
            if is_default or not self.get_queryset().exists():
                self.get_queryset().update(is_default=False)
                serializer.save(user=self.request.user, is_default=True)
            else:
                serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        with transaction.atomic():
            is_default = serializer.validated_data.get('is_default', False)
            if is_default:
                self.get_queryset().exclude(pk=serializer.instance.pk).update(is_default=False)
            serializer.save()

    def perform_destroy(self, instance):
        with transaction.atomic():
            was_default = instance.is_default
            instance.delete()
            # If they deleted their default address, make the most recently created address the new default
            if was_default:
                latest_address = self.get_queryset().order_by('-created_at').first()
                if latest_address:
                    latest_address.is_default = True
                    latest_address.save()

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Returns user notifications.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    pagination_class = None
    
    def get_queryset(self):
        return self.request.user.notifications.all().order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())[:50]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
        
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.request.user.notifications.filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(status=status.HTTP_204_NO_CONTENT)
        
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.request.user.notifications.filter(is_read=False).update(is_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)

class NotificationPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return Response(NotificationPreferenceSerializer(pref).data)

    def put(self, request):
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

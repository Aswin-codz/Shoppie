from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken
from rest_framework_simplejwt.exceptions import TokenError

User = get_user_model()


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Extends SimpleJWT TokenRefreshSerializer to verify that the user account
    is still active (and approved) in the database before issuing new tokens.

    The user check runs BEFORE super().validate() because rotation +
    blacklisting in super() consumes the original refresh token.
    """

    def validate(self, attrs):
        # Decode the refresh token BEFORE super() consumes/blacklists it
        try:
            token = RefreshToken(attrs["refresh"])
            user_id = token.payload.get("user_id")
        except TokenError:
            raise serializers.ValidationError(
                {"detail": "Token is invalid or expired."}
            )

        # Verify user state in the database
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {"detail": "User account does not exist."}
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"detail": "User account is disabled."}
            )

        if user.role == User.Role.MERCHANT and not user.is_approved:
            raise serializers.ValidationError(
                {"detail": "Merchant account is pending approval."}
            )

        # Now proceed with the standard refresh (rotation + blacklisting)
        return super().validate(attrs)


class RegisterSerializer(serializers.Serializer):
    """Handles user registration with validation."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    user_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    username = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    phone_number = serializers.CharField(max_length=25, required=False, allow_blank=True, default="")
    mobile_number = serializers.CharField(max_length=25, required=False, allow_blank=True, default="")
    role = serializers.ChoiceField(
        choices=[User.Role.USER, User.Role.MERCHANT],
        default=User.Role.USER,
    )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )
        return value.lower()

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        
        # Handle single username/user_name input if first_name is empty
        full_name = attrs.get("user_name") or attrs.get("username") or ""
        if full_name and not attrs.get("first_name"):
            parts = full_name.strip().split()
            attrs["first_name"] = parts[0] if parts else ""
            if len(parts) > 1 and not attrs.get("last_name"):
                attrs["last_name"] = " ".join(parts[1:])
        
        if not attrs.get("first_name"):
            # Fallback to part of email before @ if name is still missing
            attrs["first_name"] = attrs["email"].split("@")[0]

        # Consolidate mobile number / phone number
        phone = attrs.get("phone_number") or attrs.get("mobile_number") or ""
        attrs["phone_number"] = phone.strip()

        # Run Django's password validators
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        validated_data.pop("user_name", None)
        validated_data.pop("username", None)
        validated_data.pop("mobile_number", None)
        password = validated_data.pop("password")
        user = User.objects.create_user(
            password=password,
            **validated_data,
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """Safe representation of a user."""
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone_number", "role", "is_approved", "date_joined", "profile_image_url"]
        read_only_fields = ["id", "date_joined", "profile_image_url"]

    def get_profile_image_url(self, obj):
        if obj.profile_image:
            return obj.profile_image.url
        return None


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = User.addresses.field.model
        fields = [
            'id', 'full_name', 'phone', 'address_line_1', 'address_line_2',
            'city', 'state', 'postal_code', 'country', 'is_default', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        # Basic validation, ensuring required fields are not just whitespace
        required_fields = ['full_name', 'phone', 'address_line_1', 'city', 'state', 'postal_code', 'country']
        for field in required_fields:
            if field in attrs and not str(attrs[field]).strip():
                raise serializers.ValidationError({field: "This field may not be blank."})
        return attrs

from .models import Notification, NotificationPreference

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'message', 'is_read', 'related_object_id', 'created_at']
        read_only_fields = fields

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'order_updates', 'price_drops', 'stock_alerts', 
            'wishlist_updates', 'cart_reminders', 'recommendations', 'marketing'
        ]

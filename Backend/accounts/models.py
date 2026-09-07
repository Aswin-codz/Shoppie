from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

from .managers import CustomUserManager


from cloudinary.models import CloudinaryField


class User(AbstractUser):
    """
    Custom User model for Nexura.
    Uses email as the primary authentication identifier.
    Supports USER and MERCHANT roles.
    """

    class Role(models.TextChoices):
        USER = "USER", "User"
        MERCHANT = "MERCHANT", "Merchant"

    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=25, blank=True, null=True)
    profile_image = CloudinaryField('image', blank=True, null=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.USER,
    )
    # Future-proofing: merchants can be gated behind approval
    is_approved = models.BooleanField(default=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = CustomUserManager()

    def __str__(self):
        return self.email


class Address(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='addresses'
    )
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='India')
    
    is_default = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "addresses"
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.full_name} - {self.address_line_1}, {self.city}"

class Notification(models.Model):
    class NotificationType(models.TextChoices):
        ORDER_UPDATE = 'ORDER_UPDATE', 'Order Update'
        PAYMENT_UPDATE = 'PAYMENT_UPDATE', 'Payment Update'
        RETURN_UPDATE = 'RETURN_UPDATE', 'Return Update'
        REFUND_UPDATE = 'REFUND_UPDATE', 'Refund Update'
        PRICE_DROP = 'PRICE_DROP', 'Price Drop'
        BACK_IN_STOCK = 'BACK_IN_STOCK', 'Back In Stock'
        WISHLIST_UPDATE = 'WISHLIST_UPDATE', 'Wishlist Update'
        CART_REMINDER = 'CART_REMINDER', 'Cart Reminder'
        RECOMMENDATION = 'RECOMMENDATION', 'Recommendation'
        SYSTEM = 'SYSTEM', 'System'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    type = models.CharField(max_length=20, choices=NotificationType.choices, default=NotificationType.SYSTEM)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_object_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.email} - {self.title}"

class NotificationPreference(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_preferences')
    order_updates = models.BooleanField(default=True)
    price_drops = models.BooleanField(default=True)
    stock_alerts = models.BooleanField(default=True)
    wishlist_updates = models.BooleanField(default=True)
    cart_reminders = models.BooleanField(default=True)
    recommendations = models.BooleanField(default=True)
    marketing = models.BooleanField(default=False)

    def __str__(self):
        return f"Preferences for {self.user.email}"

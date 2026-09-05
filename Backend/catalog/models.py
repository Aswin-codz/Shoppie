from django.db import models
from django.db.models import Q
from django.conf import settings
from django.utils.text import slugify
from cloudinary.models import CloudinaryField
from django.utils import timezone


class Category(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='children'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Category.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class Tag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.name = self.name.lower()
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Tag.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class Product(models.Model):
    merchant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='products'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='products'
    )
    tags = models.ManyToManyField(Tag, related_name='products', blank=True)

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    
    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    stock_quantity = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    sku = models.CharField(max_length=100, unique=True, db_index=True)
    
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['category', '-created_at']),
            models.Index(fields=['category', 'price']),
            models.Index(fields=['-rating']),
            models.Index(fields=['merchant', '-created_at']),
            models.Index(fields=['-created_at']),
        ]
        constraints = [
            models.CheckConstraint(check=Q(stock_quantity__gte=0), name='stock_quantity_non_negative'),
            models.CheckConstraint(check=Q(price__gte=0), name='price_non_negative'),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
            
        if not self.sku:
            import uuid
            prefix = ''.join(c for c in (self.name or '')[:4].upper() if c.isalnum()) or 'PROD'
            self.sku = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"

        super().save(*args, **kwargs)


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = CloudinaryField('image', blank=True, null=True)
    alt_text = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_primary = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order']

    def __str__(self):
        return f"Image for {self.product.name}"

    @property
    def image_url(self):
        if self.image:
            return self.image.url
        return ''

class ProductAnalytics(models.Model):
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='analytics'
    )
    views_count = models.PositiveIntegerField(default=0)
    add_to_cart_count = models.PositiveIntegerField(default=0)
    checkout_started_count = models.PositiveIntegerField(default=0)
    purchased_count = models.PositiveIntegerField(default=0)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Analytics for {self.product.name}"

class MerchantAnalytics(models.Model):
    merchant = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='merchant_analytics'
    )
    total_views = models.PositiveIntegerField(default=0)
    total_add_to_cart = models.PositiveIntegerField(default=0)
    total_checkout_started = models.PositiveIntegerField(default=0)
    total_purchased_count = models.PositiveIntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Trust & Reputation metrics
    average_product_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    fulfillment_score = models.DecimalField(max_digits=5, decimal_places=2, default=100.00) # Percentage

    last_aggregated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Analytics for Merchant {self.merchant.id}"

class Review(models.Model):
    class ModerationStatus(models.TextChoices):
        PUBLISHED = 'PUBLISHED', 'Published'
        HIDDEN = 'HIDDEN', 'Hidden'
        FLAGGED = 'FLAGGED', 'Flagged'

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    rating = models.PositiveSmallIntegerField(
        choices=[(i, i) for i in range(1, 6)]
    )
    title = models.CharField(max_length=255, blank=True)
    comment = models.TextField(blank=True)
    is_verified_purchase = models.BooleanField(default=False)
    order_item = models.ForeignKey(
        'orders.OrderItem', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='reviews'
    )
    moderation_status = models.CharField(
        max_length=20, 
        choices=ModerationStatus.choices, 
        default=ModerationStatus.PUBLISHED
    )
    merchant_response = models.TextField(blank=True)
    merchant_response_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['order_item'], 
                condition=models.Q(order_item__isnull=False),
                name='unique_review_per_order_item'
            )
        ]

    def __str__(self):
        return f"Review by {self.user.username} on {self.product.name}"


class ReviewImage(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='images')
    image = CloudinaryField('image', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for Review {self.review.id}"

    @property
    def image_url(self):
        if self.image:
            return self.image.url
        return ''


class ReviewHelpfulVote(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='helpful_votes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='helpful_votes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['review', 'user'], name='unique_helpful_vote_per_user')
        ]

    def __str__(self):
        return f"Vote by {self.user.username} on Review {self.review.id}"

class ReviewReport(models.Model):
    class Reason(models.TextChoices):
        SPAM = 'SPAM', 'Spam'
        ABUSIVE = 'ABUSIVE', 'Abusive'
        FAKE = 'FAKE', 'Fake'
        OFF_TOPIC = 'OFF_TOPIC', 'Off Topic'
        OTHER = 'OTHER', 'Other'

    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='reports')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='review_reports')
    reason = models.CharField(max_length=20, choices=Reason.choices)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['review', 'user'], name='unique_report_per_user_review')
        ]

    def __str__(self):
        return f"Report on {self.review.id} by {self.user.username}"


class ProductReport(models.Model):
    class Reason(models.TextChoices):
        COUNTERFEIT = 'COUNTERFEIT', 'Counterfeit'
        MISLEADING = 'MISLEADING', 'Misleading'
        PROHIBITED = 'PROHIBITED', 'Prohibited'
        INAPPROPRIATE = 'INAPPROPRIATE', 'Inappropriate'
        WRONG_INFORMATION = 'WRONG_INFORMATION', 'Wrong Information'
        OTHER = 'OTHER', 'Other'

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reports')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='product_reports')
    reason = models.CharField(max_length=50, choices=Reason.choices)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['product', 'user'], name='unique_report_per_user_product')
        ]

    def __str__(self):
        return f"Report on {self.product.name} by {self.user.username}"


class InventoryReservation(models.Model):
    """
    Temporarily holds inventory during the checkout process.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reservations')
    quantity = models.PositiveIntegerField()
    expires_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    # The payment intent id or order id this reservation belongs to
    reference_id = models.CharField(max_length=255, db_index=True)
    
    def is_expired(self):
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"Reserved {self.quantity} of {self.product.name}"

class RecentlyViewed(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recently_viewed')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    viewed_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-viewed_at']
        unique_together = ('user', 'product')

    def __str__(self):
        return f"{self.user.email} viewed {self.product.name}"

class SearchQueryAnalytics(models.Model):
    query = models.CharField(max_length=255)
    result_count = models.PositiveIntegerField(default=0)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Search: '{self.query}' ({self.result_count} results)"

class ProductPriceHistory(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='price_history')
    old_price = models.DecimalField(max_digits=10, decimal_places=2)
    new_price = models.DecimalField(max_digits=10, decimal_places=2)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f"{self.product.name} price changed from {self.old_price} to {self.new_price}"

class StockAlertSubscription(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stock_alerts')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_alert_subscriptions')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'product'], condition=Q(is_active=True), name='unique_active_stock_alert')
        ]

    def __str__(self):
        return f"{self.user.email} alert for {self.product.name}"

class InventoryHistory(models.Model):
    class Reason(models.TextChoices):
        SALE = 'SALE', 'Sale'
        RESTOCK = 'RESTOCK', 'Restock'
        RETURN = 'RETURN', 'Return'
        MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT', 'Manual Adjustment'
        RESERVATION = 'RESERVATION', 'Reservation'
        RESERVATION_RELEASE = 'RESERVATION_RELEASE', 'Reservation Release'

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='inventory_history')
    previous_quantity = models.PositiveIntegerField()
    new_quantity = models.PositiveIntegerField()
    change_amount = models.IntegerField()
    reason = models.CharField(max_length=50, choices=Reason.choices)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.product.name} changed by {self.change_amount} ({self.reason})"

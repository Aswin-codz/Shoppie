from django.db import models
from django.conf import settings
from catalog.models import Product
from cloudinary.models import CloudinaryField

class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart')
    abandoned_reminder_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for {self.user.username}"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['cart', 'product'], name='unique_cart_product')
        ]

    def __str__(self):
        return f"{self.quantity}x {self.product.name} in cart {self.cart.id}"


class Wishlist(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlist')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wishlist for {self.user.username}"


class WishlistItem(models.Model):
    wishlist = models.ForeignKey(Wishlist, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    price_at_addition = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    last_notified_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['wishlist', 'product'], name='unique_wishlist_product')
        ]

    def __str__(self):
        return f"{self.product.name} in wishlist {self.wishlist.id}"


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PACKAGING = 'PACKAGING', 'Packaging'
        TRANSPORTED = 'TRANSPORTED', 'Transported'
        DELIVERED = 'DELIVERED', 'Delivered'
        CANCELLED = 'CANCELLED', 'Cancelled'
        RETURNED = 'RETURNED', 'Returned'

    class PaymentStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        PAID = 'PAID', 'Paid'
        FAILED = 'FAILED', 'Failed'
        REFUNDED = 'REFUNDED', 'Refunded'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    order_number = models.CharField(max_length=50, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    coupon = models.ForeignKey('Coupon', on_delete=models.SET_NULL, null=True, blank=True)
    shipping_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    
    shipping_address_snapshot = models.JSONField()
    billing_address_snapshot = models.JSONField(null=True, blank=True)
    
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, related_name='order_items')
    
    # Snapshots
    product_name = models.CharField(max_length=255)
    product_sku = models.CharField(max_length=100)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    line_total = models.DecimalField(max_digits=10, decimal_places=2)
    product_image = CloudinaryField('image', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.quantity}x {self.product_name} in Order {self.order.order_number}"


class StripeWebhookEvent(models.Model):
    event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=255)
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.event_id

class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2) # 0 to 100
    is_active = models.BooleanField(default=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    times_used = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.code

class OrderEventHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='history_events')
    status = models.CharField(max_length=20, choices=Order.Status.choices)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.order.order_number} -> {self.status} at {self.created_at}"


class ReturnRequest(models.Model):
    class Status(models.TextChoices):
        REQUESTED = 'REQUESTED', 'Requested'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
        APPROVED = 'APPROVED', 'Approved'
        ITEM_RECEIVED = 'ITEM_RECEIVED', 'Item Received'
        REFUND_PROCESSING = 'REFUND_PROCESSING', 'Refund Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        REJECTED = 'REJECTED', 'Rejected'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class Reason(models.TextChoices):
        DAMAGED = 'DAMAGED', 'Damaged'
        DEFECTIVE = 'DEFECTIVE', 'Defective'
        WRONG_ITEM = 'WRONG_ITEM', 'Wrong Item'
        NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED', 'Not As Described'
        SIZE_ISSUE = 'SIZE_ISSUE', 'Size Issue'
        CHANGED_MIND = 'CHANGED_MIND', 'Changed Mind'
        OTHER = 'OTHER', 'Other'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='return_requests')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='return_requests')
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name='return_requests')
    
    quantity = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)
    reason = models.CharField(max_length=20, choices=Reason.choices)
    customer_notes = models.TextField(blank=True)
    evidence_image = CloudinaryField('image', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Return {self.id} for {self.order.order_number}"


class Refund(models.Model):
    class Status(models.TextChoices):
        NOT_REQUESTED = 'NOT_REQUESTED', 'Not Requested'
        REQUESTED = 'REQUESTED', 'Requested'
        PROCESSING = 'PROCESSING', 'Processing'
        SUCCEEDED = 'SUCCEEDED', 'Succeeded'
        FAILED = 'FAILED', 'Failed'

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='refunds')
    return_request = models.OneToOneField(ReturnRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name='refund')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)
    stripe_refund_id = models.CharField(max_length=255, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Refund {self.id} for {self.order.order_number}"


class SupportIssue(models.Model):
    class Category(models.TextChoices):
        ORDER = 'ORDER', 'Order'
        RETURN = 'RETURN', 'Return'
        REFUND = 'REFUND', 'Refund'
        PRODUCT = 'PRODUCT', 'Product'
        MERCHANT = 'MERCHANT', 'Merchant'
        OTHER = 'OTHER', 'Other'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        IN_REVIEW = 'IN_REVIEW', 'In Review'
        RESOLVED = 'RESOLVED', 'Resolved'
        CLOSED = 'CLOSED', 'Closed'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='support_issues')
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='support_issues')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='support_issues')
    
    category = models.CharField(max_length=20, choices=Category.choices)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Issue {self.id} by {self.user.username}"

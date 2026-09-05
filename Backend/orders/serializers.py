from rest_framework import serializers
from .models import Cart, CartItem, Wishlist, WishlistItem, Order, OrderItem, ReturnRequest, Refund, SupportIssue
from catalog.serializers import ProductListSerializer

class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'quantity', 'line_total', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_line_total(self, obj):
        return str(obj.product.price * obj.quantity)

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    total_quantity = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'subtotal', 'item_count', 'total_quantity', 'updated_at']

    def get_subtotal(self, obj):
        return str(sum(item.product.price * item.quantity for item in obj.items.all()))

    def get_item_count(self, obj):
        return obj.items.count()

    def get_total_quantity(self, obj):
        return sum(item.quantity for item in obj.items.all())

class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = ['id', 'product', 'created_at']

class CartMergeItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

class CartMergeSerializer(serializers.Serializer):
    items = CartMergeItemSerializer(many=True)

class OrderItemSerializer(serializers.ModelSerializer):
    product_image_url = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product_id', 'product_name', 'product_sku', 'unit_price', 'quantity', 'line_total', 'product_image', 'product_image_url']

    def get_product_image_url(self, obj):
        return self.get_product_image(obj)

    def get_product_image(self, obj):
        if obj.product_image:
            try:
                return obj.product_image.url if hasattr(obj.product_image, 'url') else str(obj.product_image)
            except Exception:
                pass
        if obj.product:
            img = obj.product.images.filter(is_primary=True).first() or obj.product.images.first()
            if img and img.image:
                try:
                    return img.image.url if hasattr(img.image, 'url') else str(img.image)
                except Exception:
                    pass
        return None

class OrderEventHistorySerializer(serializers.ModelSerializer):
    class Meta:
        from .models import OrderEventHistory
        model = OrderEventHistory
        fields = ['status', 'notes', 'created_at']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    history_events = OrderEventHistorySerializer(many=True, read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    has_return = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'payment_status',
            'subtotal', 'shipping_amount', 'tax_amount', 'total_amount', 'currency',
            'shipping_address_snapshot', 'billing_address_snapshot',
            'customer_name', 'customer_email', 'customer_phone', 'has_return',
            'created_at', 'updated_at', 'items', 'history_events'
        ]
        read_only_fields = fields

    def get_customer_name(self, obj):
        if obj.shipping_address_snapshot and isinstance(obj.shipping_address_snapshot, dict):
            name = obj.shipping_address_snapshot.get('full_name')
            if name:
                return name
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return 'Customer'

    def get_customer_email(self, obj):
        return obj.user.email if obj.user else ''

    def get_customer_phone(self, obj):
        if obj.shipping_address_snapshot and isinstance(obj.shipping_address_snapshot, dict):
            phone = obj.shipping_address_snapshot.get('phone') or obj.shipping_address_snapshot.get('phone_number')
            if phone:
                return phone
        if obj.user and getattr(obj.user, 'phone_number', None):
            return obj.user.phone_number
        return ''

    def get_has_return(self, obj):
        return getattr(obj, 'return_requests', None).exists() if hasattr(obj, 'return_requests') else False


class CheckoutSummaryItemSerializer(serializers.Serializer):
    cart_item_id = serializers.IntegerField()
    product_id = serializers.IntegerField()
    name = serializers.CharField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.IntegerField()
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = serializers.IntegerField()
    is_active = serializers.BooleanField()
    image = serializers.CharField()

class CheckoutSummarySerializer(serializers.Serializer):
    items = CheckoutSummaryItemSerializer(many=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    shipping_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField()


class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = ['id', 'order', 'return_request', 'amount', 'status', 'stripe_refund_id', 'created_at', 'updated_at']
        read_only_fields = fields

class ReturnRequestSerializer(serializers.ModelSerializer):
    refund = RefundSerializer(read_only=True)
    product_name = serializers.CharField(source='order_item.product_name', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    evidence_image_url = serializers.SerializerMethodField()
    order_item_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = ReturnRequest
        fields = [
            'id', 'user', 'order', 'order_item', 'order_item_id', 'order_number', 'product_name',
            'quantity', 'status', 'reason', 'customer_notes', 'evidence_image', 'evidence_image_url',
            'refund', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'order', 'order_item', 'status', 'refund', 'created_at', 'updated_at', 'order_number', 'product_name']
        extra_kwargs = {
            'evidence_image': {'write_only': True, 'required': False}
        }

    def get_evidence_image_url(self, obj):
        if obj.evidence_image:
            return obj.evidence_image.url
        return None

class SupportIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportIssue
        fields = [
            'id', 'user', 'order', 'product', 'category', 'description',
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'status', 'created_at', 'updated_at']

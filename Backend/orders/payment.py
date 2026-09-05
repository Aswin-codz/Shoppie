import stripe
import logging
from django.conf import settings
from decimal import Decimal

logger = logging.getLogger(__name__)
from django.db import transaction
from .models import Order, OrderItem, Coupon
from catalog.models import Product, InventoryReservation
import uuid
import time
from datetime import timedelta
from django.utils import timezone
from django.db.models import F

stripe.api_key = settings.STRIPE_SECRET_KEY

@transaction.atomic
def create_or_update_payment_intent(user, cart_totals, address_snapshot, existing_order_id=None):
    """
    Creates a pending Order and a Stripe PaymentIntent.
    Stripe expects amounts in the smallest currency unit (e.g. paise for INR).
    """
    amount_in_smallest_unit = int(cart_totals['total_amount'] * Decimal('100'))
    
    # If updating an existing order, release old reservations
    if existing_order_id:
        try:
            old_order = Order.objects.select_for_update().get(id=existing_order_id, user=user, payment_status=Order.PaymentStatus.PENDING)
            old_reservations = InventoryReservation.objects.filter(reference_id=old_order.order_number)
            for r in old_reservations:
                # Return stock safely
                Product.objects.filter(id=r.product_id).update(stock_quantity=F('stock_quantity') + r.quantity)
            old_reservations.delete()
        except Order.DoesNotExist:
            pass

    # 0. Validate stock before proceeding
    product_ids = [item['product_id'] for item in cart_totals['items']]
    products = Product.objects.select_for_update().in_bulk(product_ids)
    for item in cart_totals['items']:
        product = products.get(item['product_id'])
        if not product or not product.is_active:
            raise ValueError(f"Product {item['name']} is currently unavailable.")
        if product.stock_quantity < item['quantity']:
            raise ValueError(f"Insufficient stock for {product.name}. Only {product.stock_quantity} remaining.")
            
    # 1. Create or update the pending Order first
    order = None
    if existing_order_id:
        try:
            order = Order.objects.select_for_update().get(id=existing_order_id, user=user, payment_status=Order.PaymentStatus.PENDING)
            # Update order totals and items
            order.subtotal = cart_totals['subtotal']
            order.discount_amount = cart_totals.get('discount_amount', Decimal('0.00'))
            
            coupon_code = cart_totals.get('coupon_code')
            if coupon_code:
                try:
                    order.coupon = Coupon.objects.get(code=coupon_code)
                except Coupon.DoesNotExist:
                    order.coupon = None
            else:
                order.coupon = None
                
            order.shipping_amount = cart_totals['shipping_amount']
            order.tax_amount = cart_totals['tax_amount']
            order.total_amount = cart_totals['total_amount']
            order.currency = cart_totals['currency']
            order.shipping_address_snapshot = address_snapshot
            order.save()
            
            # Recreate items (simplest way to ensure accuracy)
            order.items.all().delete()
            for item in cart_totals['items']:
                OrderItem.objects.create(
                    order=order,
                    product_id=item['product_id'],
                    product_name=item['name'],
                    product_sku=item.get('sku', ''),
                    unit_price=item['unit_price'],
                    quantity=item['quantity'],
                    line_total=item['line_total'],
                    product_image=item.get('image', '')
                )
        except Order.DoesNotExist:
            order = None

    if not order:
        coupon_obj = None
        coupon_code = cart_totals.get('coupon_code')
        if coupon_code:
            try:
                coupon_obj = Coupon.objects.get(code=coupon_code)
            except Coupon.DoesNotExist:
                pass
                
        order_number = f"SHP-{time.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        order = Order.objects.create(
            user=user,
            order_number=order_number,
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            subtotal=cart_totals['subtotal'],
            discount_amount=cart_totals.get('discount_amount', Decimal('0.00')),
            coupon=coupon_obj,
            shipping_amount=cart_totals['shipping_amount'],
            tax_amount=cart_totals['tax_amount'],
            total_amount=cart_totals['total_amount'],
            currency=cart_totals['currency'],
            shipping_address_snapshot=address_snapshot,
        )
        for item in cart_totals['items']:
            OrderItem.objects.create(
                order=order,
                product_id=item['product_id'],
                product_name=item['name'],
                product_sku=item.get('sku', ''),
                unit_price=item['unit_price'],
                quantity=item['quantity'],
                line_total=item['line_total'],
                product_image=item.get('image', '')
            )
            
    # Deduct stock and create reservations
    for item in cart_totals['items']:
        product = products.get(item['product_id'])
        product.stock_quantity -= item['quantity']
        product.save(update_fields=['stock_quantity'])
        
        InventoryReservation.objects.create(
            product=product,
            quantity=item['quantity'],
            expires_at=timezone.now() + timedelta(minutes=15),
            reference_id=order.order_number
        )

    # 2. Sync with Stripe
    if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.strip() == '':
        mock_intent_id = f"pi_demo_{order.order_number}"
        mock_client_secret = f"{mock_intent_id}_secret_{uuid.uuid4().hex[:12]}"
        order.stripe_payment_intent_id = mock_intent_id
        order.save(update_fields=['stripe_payment_intent_id'])
        
        class MockIntent:
            def __init__(self, id, client_secret):
                self.id = id
                self.client_secret = client_secret
            def __getitem__(self, item):
                return getattr(self, item)
                
        return MockIntent(mock_intent_id, mock_client_secret), order

    stripe.api_key = settings.STRIPE_SECRET_KEY
    if order.stripe_payment_intent_id and not order.stripe_payment_intent_id.startswith('pi_demo_'):
        try:
            intent = stripe.PaymentIntent.retrieve(order.stripe_payment_intent_id)
            if intent.status not in ['succeeded', 'processing', 'canceled']:
                intent = stripe.PaymentIntent.modify(
                    order.stripe_payment_intent_id,
                    amount=amount_in_smallest_unit,
                    metadata={'order_number': order.order_number, 'order_id': order.id}
                )
                return intent, order
        except stripe.error.StripeError:
            pass # Fallback to creating a new one

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_in_smallest_unit,
            currency=cart_totals['currency'].lower(),
            metadata={'order_number': order.order_number, 'order_id': order.id},
            automatic_payment_methods={"enabled": True},
        )
        order.stripe_payment_intent_id = intent['id']
        order.save(update_fields=['stripe_payment_intent_id'])
        return intent, order
    except Exception as e:
        logger.warning(f"Stripe PaymentIntent creation failed ({e}). Falling back to demo mock intent.")
        mock_intent_id = f"pi_demo_{order.order_number}"
        mock_client_secret = f"{mock_intent_id}_secret_{uuid.uuid4().hex[:12]}"
        order.stripe_payment_intent_id = mock_intent_id
        order.save(update_fields=['stripe_payment_intent_id'])
        class MockIntent:
            def __init__(self, id, client_secret):
                self.id = id
                self.client_secret = client_secret
            def __getitem__(self, item):
                return getattr(self, item)
        return MockIntent(mock_intent_id, mock_client_secret), order

@transaction.atomic
def finalize_order_from_payment(order_id, amount_received, currency):
    """
    Called when webhook confirms payment success.
    Decrements stock, clears cart, marks order as paid.
    """
    try:
        # Lock the order to prevent race conditions
        order = Order.objects.select_for_update().get(id=order_id)
    except Order.DoesNotExist:
        raise ValueError(f"Order {order_id} not found")
        
    if order.payment_status == Order.PaymentStatus.PAID:
        return order # Idempotent
        
    expected_amount = int(order.total_amount * Decimal('100'))
    if amount_received != expected_amount:
        raise ValueError(f"Amount mismatch for Order {order_id}. Expected {expected_amount}, got {amount_received}")
        
    reservations = InventoryReservation.objects.filter(reference_id=order.order_number)
    if reservations.exists():
        reservations.delete()
    else:
        # The reservations expired and stock was returned, but payment succeeded anyway!
        # We must re-deduct the stock (may result in negative stock indicating oversell).
        items = order.items.select_related('product').all()
        product_ids = [item.product_id for item in items if item.product_id]
        products = Product.objects.select_for_update().filter(id__in=product_ids)
        product_map = {p.id: p for p in products}
        
        for item in items:
            if not item.product_id:
                continue
            p = product_map.get(item.product_id)
            if p:
                p.stock_quantity -= item.quantity
                p.save(update_fields=['stock_quantity'])
        
    # Update coupon usage if applicable
    if order.coupon:
        # Lock coupon to prevent race condition
        try:
            c = Coupon.objects.select_for_update().get(id=order.coupon.id)
            c.times_used += 1
            c.save()
        except Coupon.DoesNotExist:
            pass
        
    # Update order
    order.payment_status = Order.PaymentStatus.PAID
    order.save()
    
    # Update Product Analytics
    from catalog.models import ProductAnalytics
    items = order.items.all()
    for item in items:
        if item.product_id:
            try:
                analytics, _ = ProductAnalytics.objects.get_or_create(product_id=item.product_id)
                ProductAnalytics.objects.filter(id=analytics.id).update(
                    purchased_count=F('purchased_count') + item.quantity,
                    revenue=F('revenue') + item.line_total
                )
            except Exception:
                pass
    
    # Clear user's cart
    from .models import Cart
    try:
        cart = Cart.objects.get(user=order.user)
        cart.items.all().delete()
    except Cart.DoesNotExist:
        pass
        
    return order

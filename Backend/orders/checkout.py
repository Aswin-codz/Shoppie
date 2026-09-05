from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from catalog.models import Product
from .models import Cart, CartItem, Coupon

def calculate_checkout_totals(cart, coupon_code=None):
    """
    Authoritatively calculate totals from the cart.
    """
    items = cart.items.select_related('product').all()
    if not items:
        return None
        
    subtotal = Decimal('0.00')
    line_items = []
    
    for item in items:
        product = item.product
        line_total = product.price * item.quantity
        subtotal += line_total
        
        line_items.append({
            'cart_item_id': item.id,
            'product_id': product.id,
            'name': product.name,
            'unit_price': product.price,
            'quantity': item.quantity,
            'line_total': line_total,
            'stock_quantity': product.stock_quantity,
            'is_active': product.is_active,
            'image': getattr(product.images.filter(is_primary=True).first() or product.images.first(), 'image_url', '') if product.images.exists() else '',
        })
        
    shipping_amount = Decimal('0.00')
    tax_amount = Decimal('0.00')
    
    discount_amount = Decimal('0.00')
    
    if coupon_code:
        try:
            coupon = Coupon.objects.get(code=coupon_code, is_active=True)
            if coupon.valid_until and coupon.valid_until < timezone.now():
                pass
            elif coupon.usage_limit and coupon.times_used >= coupon.usage_limit:
                pass
            else:
                discount_amount = (subtotal * coupon.discount_percentage) / Decimal('100.00')
        except Coupon.DoesNotExist:
            pass

    total_amount = subtotal - discount_amount + shipping_amount + tax_amount
    
    return {
        'items': line_items,
        'subtotal': subtotal,
        'discount_amount': discount_amount,
        'coupon_code': coupon_code if discount_amount > 0 else None,
        'shipping_amount': shipping_amount,
        'tax_amount': tax_amount,
        'total_amount': max(Decimal('0.00'), total_amount),
        'currency': 'INR'
    }

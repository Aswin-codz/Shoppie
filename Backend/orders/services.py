from django.db import transaction
from django.core.exceptions import ValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
from .models import Cart, CartItem

MAX_CART_QUANTITY = 99

def get_or_create_cart(user):
    cart, created = Cart.objects.get_or_create(user=user)
    return cart

def add_item_to_cart(user, product, quantity=1):
    if quantity <= 0:
        raise DRFValidationError("Quantity must be a positive integer.")
    if quantity > MAX_CART_QUANTITY:
        raise DRFValidationError(f"Cannot add more than {MAX_CART_QUANTITY} items.")
    
    # Merchant cannot purchase own product
    if product.merchant_id and product.merchant_id == user.id:
        raise DRFValidationError("Merchants cannot purchase their own products.")

    # Inventory validation
    if not product.is_active:
        raise DRFValidationError("Product is currently unavailable.")
    
    cart = get_or_create_cart(user)
    
    with transaction.atomic():
        # Lock the cart item if it exists
        cart_item = CartItem.objects.select_for_update().filter(cart=cart, product=product).first()
        
        if cart_item:
            new_quantity = cart_item.quantity + quantity
            if new_quantity > MAX_CART_QUANTITY:
                new_quantity = MAX_CART_QUANTITY
            
            if new_quantity > product.stock_quantity:
                raise DRFValidationError(f"Only {product.stock_quantity} available in stock.")
                
            cart_item.quantity = new_quantity
            cart_item.save()
        else:
            if quantity > product.stock_quantity:
                raise DRFValidationError(f"Only {product.stock_quantity} available in stock.")
            cart_item = CartItem.objects.create(cart=cart, product=product, quantity=quantity)
            
    return cart_item

def update_item_quantity(user, cart_item_id, quantity):
    if quantity <= 0:
        raise DRFValidationError("Quantity must be a positive integer.")
    if quantity > MAX_CART_QUANTITY:
        raise DRFValidationError(f"Cannot exceed {MAX_CART_QUANTITY} items.")

    cart = get_or_create_cart(user)
    
    with transaction.atomic():
        try:
            cart_item = CartItem.objects.select_for_update().get(id=cart_item_id, cart=cart)
        except CartItem.DoesNotExist:
            raise DRFValidationError("Cart item not found.")
            
        if quantity > cart_item.product.stock_quantity:
            raise DRFValidationError(f"Only {cart_item.product.stock_quantity} available in stock.")
            
        cart_item.quantity = quantity
        cart_item.save()
        
    return cart_item

def remove_item_from_cart(user, cart_item_id):
    cart = get_or_create_cart(user)
    try:
        cart_item = CartItem.objects.get(id=cart_item_id, cart=cart)
        cart_item.delete()
    except CartItem.DoesNotExist:
        pass

def clear_cart(user):
    cart = get_or_create_cart(user)
    cart.items.all().delete()

def merge_guest_cart(user, guest_items):
    """
    guest_items: [{"product_id": 1, "quantity": 2}, ...]
    Returns a dict with merge summary.
    """
    from catalog.models import Product

    cart = get_or_create_cart(user)
    merged_items = []
    removed_items = []
    
    # Security: limit number of merged items to prevent abuse
    if len(guest_items) > 50:
        guest_items = guest_items[:50]
    
    with transaction.atomic():
        for item in guest_items:
            product_id = item.get('product_id')
            quantity = item.get('quantity', 1)
            
            try:
                quantity = int(quantity)
                if quantity <= 0:
                    continue
            except (ValueError, TypeError):
                continue
                
            try:
                product = Product.objects.get(id=product_id, is_active=True)
            except Product.DoesNotExist:
                removed_items.append({"product_id": product_id, "reason": "unavailable"})
                continue
                
            # Skip if user is merchant of this product
            if product.merchant_id and product.merchant_id == user.id:
                removed_items.append({"product_id": product_id, "reason": "own_product"})
                continue
                
            # Merge logic
            cart_item = CartItem.objects.select_for_update().filter(cart=cart, product=product).first()
            if cart_item:
                new_quantity = cart_item.quantity + quantity
                if new_quantity > MAX_CART_QUANTITY:
                    new_quantity = MAX_CART_QUANTITY
                if new_quantity > product.stock_quantity:
                    new_quantity = product.stock_quantity
                
                cart_item.quantity = new_quantity
                cart_item.save()
                merged_items.append({"product_id": product.id, "quantity": new_quantity})
            else:
                new_quantity = quantity
                if new_quantity > MAX_CART_QUANTITY:
                    new_quantity = MAX_CART_QUANTITY
                if new_quantity > product.stock_quantity:
                    new_quantity = product.stock_quantity
                
                if new_quantity > 0:
                    CartItem.objects.create(cart=cart, product=product, quantity=new_quantity)
                    merged_items.append({"product_id": product.id, "quantity": new_quantity})
                else:
                    removed_items.append({"product_id": product.id, "reason": "out_of_stock"})
                    
        # Ensure total cart items don't exceed a hard limit
        if cart.items.count() > 50:
            excess_items = cart.items.order_by('-id')[50:]
            for excess in excess_items:
                excess.delete()
                    
    return {
        "merged_items": merged_items,
        "removed_items": removed_items
    }

def process_refund(return_request_id):
    from .models import ReturnRequest, Refund
    import stripe
    from django.conf import settings
    
    stripe.api_key = settings.STRIPE_SECRET_KEY
    
    try:
        with transaction.atomic():
            return_req = ReturnRequest.objects.select_for_update().get(id=return_request_id)
            
            if return_req.status != ReturnRequest.Status.APPROVED:
                return
                
            return_req.status = ReturnRequest.Status.REFUND_PROCESSING
            return_req.save(update_fields=['status'])
            
            # Create refund record if not exists
            refund, created = Refund.objects.get_or_create(
                return_request=return_req,
                order=return_req.order,
                defaults={
                    'amount': return_req.order_item.unit_price * return_req.quantity,
                    'status': Refund.Status.PROCESSING
                }
            )
            
            if not created and refund.status == Refund.Status.SUCCEEDED:
                return # Already refunded
                
            payment_intent_id = return_req.order.stripe_payment_intent_id
            
            if payment_intent_id:
                # Issue refund via Stripe
                try:
                    # refund amount is in cents
                    refund_amount_cents = int(refund.amount * 100)
                    stripe_refund = stripe.Refund.create(
                        payment_intent=payment_intent_id,
                        amount=refund_amount_cents,
                        metadata={'return_request_id': return_req.id}
                    )
                    refund.stripe_refund_id = stripe_refund.id
                    refund.status = Refund.Status.SUCCEEDED
                    refund.save()
                    
                    # Update return request
                    return_req.status = ReturnRequest.Status.COMPLETED
                    return_req.save(update_fields=['status'])
                    
                    # Restore inventory
                    product = return_req.order_item.product
                    if product:
                        from django.db.models import F
                        Product.objects.filter(id=product.id).update(stock_quantity=F('stock_quantity') + return_req.quantity)
                        
                except stripe.error.StripeError as e:
                    refund.status = Refund.Status.FAILED
                    refund.save()
                    return_req.status = ReturnRequest.Status.APPROVED # Keep approved so it can be retried
                    return_req.save(update_fields=['status'])
            
    except ReturnRequest.DoesNotExist:
        pass

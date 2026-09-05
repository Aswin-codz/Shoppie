import logging
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import F
from django.core.mail import send_mail
from django.conf import settings
from catalog.models import Product, InventoryReservation
from orders.models import Cart, WishlistItem
from accounts.models import Notification, NotificationPreference

logger = logging.getLogger(__name__)

def cleanup_expired_reservations():
    """
    Finds all expired InventoryReservations, restores the stock to the product,
    and deletes the reservation.
    """
    now = timezone.now()
    expired_reservations = InventoryReservation.objects.filter(expires_at__lte=now)
    
    count = 0
    # Process in a transaction to ensure atomic updates
    try:
        with transaction.atomic():
            expired_reservations = InventoryReservation.objects.select_for_update(skip_locked=True).filter(expires_at__lte=now)
            for reservation in expired_reservations:
                # Restore stock
                Product.objects.filter(id=reservation.product_id).update(stock_quantity=F('stock_quantity') + reservation.quantity)
                reservation.delete()
                count += 1
            
        if count > 0:
            logger.info(f"Cleaned up {count} expired inventory reservations.")
    except Exception as e:
        logger.error(f"Error in cleanup_expired_reservations: {str(e)}")
        raise e
        
    return count

def detect_abandoned_carts():
    """
    Finds carts that have not been updated in the last 24 hours but have items.
    In a real system, this might trigger an email via a notification service.
    """
    now = timezone.now()
    abandoned_threshold = now - timedelta(hours=24)
    
    abandoned_carts = Cart.objects.filter(
        updated_at__lte=abandoned_threshold,
        items__isnull=False,
        abandoned_reminder_sent=False
    ).distinct()
    
    count = 0
    with transaction.atomic():
        for cart in abandoned_carts:
            try:
                pref = cart.user.notification_preferences
                if not pref.cart_reminders:
                    cart.abandoned_reminder_sent = True
                    cart.save(update_fields=['abandoned_reminder_sent'])
                    continue
            except NotificationPreference.DoesNotExist:
                pass
                
            Notification.objects.create(
                user=cart.user,
                type=Notification.NotificationType.CART_REMINDER,
                title="You left something behind!",
                message="You have items in your cart waiting for you. Complete your purchase before they sell out!",
                related_object_id=str(cart.id)
            )
            
            # Send Email
            try:
                send_mail(
                    subject="You left something behind in your Shoppie cart!",
                    message="You have items in your cart waiting for you. Complete your purchase before they sell out!\n\nVisit Shoppie to checkout.",
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@shoppie.com'),
                    recipient_list=[cart.user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.error(f"Failed to send abandoned cart email to {cart.user.email}: {e}")

            cart.abandoned_reminder_sent = True
            cart.save(update_fields=['abandoned_reminder_sent'])
            count += 1
            
    if count > 0:
        logger.info(f"Detected and notified {count} abandoned carts via DB and Email.")
    
    return count

def check_wishlist_price_drops():
    """
    Checks if products in users' wishlists have dropped in price.
    If so, creates a notification for the user.
    """
    items = WishlistItem.objects.select_related('product', 'wishlist__user').all()
    count = 0
    
    with transaction.atomic():
        for item in items:
            current_price = item.product.price
            reference_price = item.last_notified_price or item.price_at_addition
            
            # If we don't have a reference price, set it and continue
            if reference_price is None:
                item.price_at_addition = current_price
                item.save(update_fields=['price_at_addition'])
                continue
                
            # If price dropped by at least 1%
            if current_price < reference_price * Decimal('0.99'):
                try:
                    pref = item.wishlist.user.notification_preferences
                    if not pref.price_drops:
                        item.last_notified_price = current_price
                        item.save(update_fields=['last_notified_price'])
                        continue
                except NotificationPreference.DoesNotExist:
                    pass

                # Notify user
                Notification.objects.create(
                    user=item.wishlist.user,
                    type=Notification.NotificationType.PRICE_DROP,
                    title="Price Drop Alert!",
                    message=f"Good news! The price of {item.product.name} in your wishlist has dropped to ${current_price}.",
                    related_object_id=str(item.product.id)
                )

                try:
                    send_mail(
                        subject=f"Price Drop Alert: {item.product.name}",
                        message=f"Good news! The price of {item.product.name} has dropped from ${reference_price} to ${current_price}.\n\nGrab it now at Shoppie!",
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@shoppie.com'),
                        recipient_list=[item.wishlist.user.email],
                        fail_silently=True,
                    )
                except Exception as e:
                    logger.error(f"Failed to send price drop email to {item.wishlist.user.email}: {e}")
                
                item.last_notified_price = current_price
                item.save(update_fields=['last_notified_price'])
                count += 1
                
    if count > 0:
        logger.info(f"Sent {count} price drop notifications.")
    return count

def send_order_confirmation_email(order_id):
    """
    Sends an order confirmation email asynchronously.
    """
    from orders.models import Order
    try:
        order = Order.objects.select_related('user').get(id=order_id)
        send_mail(
            subject=f"Shoppie: Order Confirmation {order.order_number}",
            message=f"Hi {order.user.first_name},\n\nThank you for your order! Your order number is {order.order_number}.\n\nTotal amount: ${order.total_amount}\n\nWe'll notify you once it ships.",
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@shoppie.com'),
            recipient_list=[order.user.email],
            fail_silently=True,
        )
        logger.info(f"Sent order confirmation email for {order.order_number}.")
    except Order.DoesNotExist:
        logger.error(f"Order {order_id} not found for confirmation email.")
    except Exception as e:
        logger.error(f"Failed to send order confirmation email for Order {order_id}: {e}")


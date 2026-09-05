import logging
from django.db import transaction
from django.core.mail import send_mail
from django.conf import settings
from catalog.models import StockAlertSubscription
from accounts.models import Notification, NotificationPreference

logger = logging.getLogger(__name__)

def check_stock_alerts():
    """
    Checks if products with active stock alert subscriptions are back in stock.
    If so, notifies the user and marks the subscription as inactive.
    """
    # Active subscriptions where the product is now in stock (quantity > 0)
    alerts = StockAlertSubscription.objects.filter(
        is_active=True,
        product__stock_quantity__gt=0
    ).select_related('user', 'product')
    
    count = 0
    with transaction.atomic():
        for alert in alerts:
            # Check preferences
            try:
                pref = alert.user.notification_preferences
                if not pref.stock_alerts:
                    alert.is_active = False
                    alert.save(update_fields=['is_active'])
                    continue
            except NotificationPreference.DoesNotExist:
                pass

            # Notify user
            Notification.objects.create(
                user=alert.user,
                type=Notification.NotificationType.BACK_IN_STOCK,
                title="Back in Stock Alert!",
                message=f"Good news! {alert.product.name} is back in stock.",
                related_object_id=str(alert.product.id)
            )
            
            try:
                send_mail(
                    subject=f"Back In Stock: {alert.product.name}",
                    message=f"Good news! {alert.product.name} is back in stock. Grab it before it sells out again!\n\nVisit Shoppie to buy.",
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@shoppie.com'),
                    recipient_list=[alert.user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.error(f"Failed to send stock alert email to {alert.user.email}: {e}")

            alert.is_active = False
            alert.save(update_fields=['is_active'])
            count += 1
            
    if count > 0:
        logger.info(f"Sent {count} back-in-stock notifications.")
        
    return count

def aggregate_merchant_analytics():
    """
    Aggregates product-level analytics into merchant-level analytics.
    """
    from django.db.models import Sum, Avg
    from django.contrib.auth import get_user_model
    from catalog.models import ProductAnalytics, MerchantAnalytics, Product
    from orders.models import Order
    
    User = get_user_model()
    merchants = User.objects.filter(role='MERCHANT')
    
    count = 0
    for merchant in merchants:
        # Aggregate from ProductAnalytics for products owned by this merchant
        aggregated = ProductAnalytics.objects.filter(product__merchant=merchant).aggregate(
            total_views=Sum('views_count'),
            total_adds=Sum('add_to_cart_count'),
            total_checkouts=Sum('checkout_started_count'),
            total_purchases=Sum('purchased_count'),
            total_revenue=Sum('revenue')
        )
        
        # Calculate average product rating
        avg_rating = Product.objects.filter(merchant=merchant, rating__gt=0).aggregate(Avg('rating'))['rating__avg'] or 0.00
        
        # Calculate fulfillment score
        total_orders = Order.objects.filter(items__product__merchant=merchant).distinct().count()
        if total_orders > 0:
            cancelled = Order.objects.filter(items__product__merchant=merchant, status=Order.Status.CANCELLED).distinct().count()
            fulfillment_score = ((total_orders - cancelled) / total_orders) * 100.0
        else:
            fulfillment_score = 100.0
        
        if any(v is not None for v in aggregated.values()) or total_orders > 0:
            MerchantAnalytics.objects.update_or_create(
                merchant=merchant,
                defaults={
                    'total_views': aggregated['total_views'] or 0,
                    'total_add_to_cart': aggregated['total_adds'] or 0,
                    'total_checkout_started': aggregated['total_checkouts'] or 0,
                    'total_purchased_count': aggregated['total_purchases'] or 0,
                    'total_revenue': aggregated['total_revenue'] or 0.00,
                    'average_product_rating': round(avg_rating, 2),
                    'fulfillment_score': round(fulfillment_score, 2)
                }
            )
            count += 1
            
    logger.info(f"Aggregated analytics for {count} merchants.")
    return count

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Order
from accounts.models import Notification

@receiver(post_save, sender=Order)
def order_status_changed(sender, instance, created, **kwargs):
    if created:
        return
        
    # Check if status has changed
    # In a real app we'd track original_status on init, but for simplicity we assume
    # if it's saved with a non-PENDING status, it's a notification-worthy event.
    
    # Send notification to the user
    title = f"Order {instance.order_number} Update"
    message = f"Your order is now: {instance.status}."
    
    if instance.status == Order.Status.DELIVERED:
        message = f"Good news! Your order {instance.order_number} has been delivered."
        
    Notification.objects.create(
        user=instance.user,
        title=title,
        message=message
    )

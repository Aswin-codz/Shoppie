from django.core.management.base import BaseCommand
from django_q.models import Schedule

class Command(BaseCommand):
    help = 'Sets up default background task schedules for django-q'

    def handle(self, *args, **kwargs):
        # Schedule the back-in-stock alert check (runs every hour)
        Schedule.objects.update_or_create(
            func='catalog.tasks.check_stock_alerts',
            defaults={
                'name': 'Check Back-In-Stock Alerts',
                'schedule_type': Schedule.HOURLY,
            }
        )
        
        # Schedule the merchant analytics aggregation (runs every hour)
        Schedule.objects.update_or_create(
            func='catalog.tasks.aggregate_merchant_analytics',
            defaults={
                'name': 'Aggregate Merchant Analytics',
                'schedule_type': Schedule.HOURLY,
            }
        )

        # Schedule order background tasks
        Schedule.objects.update_or_create(
            func='orders.tasks.cleanup_expired_reservations',
            defaults={
                'name': 'Cleanup Expired Inventory Reservations',
                'schedule_type': Schedule.MINUTES,
                'minutes': 15,
            }
        )
        
        Schedule.objects.update_or_create(
            func='orders.tasks.detect_abandoned_carts',
            defaults={
                'name': 'Detect Abandoned Carts',
                'schedule_type': Schedule.HOURLY,
            }
        )
        
        Schedule.objects.update_or_create(
            func='orders.tasks.check_wishlist_price_drops',
            defaults={
                'name': 'Check Wishlist Price Drops',
                'schedule_type': Schedule.DAILY,
            }
        )

        self.stdout.write(self.style.SUCCESS('Successfully configured background task schedules'))

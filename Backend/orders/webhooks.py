import stripe
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.db import transaction
from .models import StripeWebhookEvent
from .payment import finalize_order_from_payment
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    if not sig_header:
        return HttpResponse("Missing signature", status=400)

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        return HttpResponse(status=400)

    # Idempotency check with row-level locking
    try:
        with transaction.atomic():
            webhook_event, created = StripeWebhookEvent.objects.select_for_update().get_or_create(
                event_id=event['id'],
                defaults={'event_type': event['type']}
            )
            
            if webhook_event.processed:
                # Already processed, return 200 so Stripe doesn't retry
                return HttpResponse(status=200)

            if event['type'] == 'payment_intent.succeeded':
                payment_intent = event['data']['object']
                order_id = payment_intent.get('metadata', {}).get('order_id')
                
                if order_id:
                    finalize_order_from_payment(
                        order_id=order_id,
                        amount_received=payment_intent['amount_received'],
                        currency=payment_intent['currency'],
                    )
                    webhook_event.processed = True
                    webhook_event.save(update_fields=['processed'])
                    
                    # Trigger async email
                    from django_q.tasks import async_task
                    async_task('orders.tasks.send_order_confirmation_email', order_id)
            
            elif event['type'] == 'payment_intent.payment_failed':
                payment_intent = event['data']['object']
                logger.info(f"Payment failed for PI {payment_intent['id']}")
                webhook_event.processed = True
                webhook_event.save(update_fields=['processed'])
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return HttpResponse(status=400)

    return HttpResponse(status=200)

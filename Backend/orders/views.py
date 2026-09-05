from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count
from django.db import transaction
from catalog.models import Product

from .models import Cart, CartItem, Wishlist, WishlistItem, Order, OrderItem, Coupon, OrderEventHistory, SupportIssue, ReturnRequest
from catalog.models import ProductAnalytics
from .serializers import (
    CartSerializer, CartItemSerializer, WishlistItemSerializer, CartMergeSerializer,
    CheckoutSummarySerializer, OrderSerializer, ReturnRequestSerializer, SupportIssueSerializer
)
from django.utils import timezone
from . import services
from django.conf import settings
from .checkout import calculate_checkout_totals
from .payment import create_or_update_payment_intent

class CartViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        cart = services.get_or_create_cart(request.user)
        # optimize query
        cart = Cart.objects.prefetch_related('items__product__images').get(id=cart.id)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        services.clear_cart(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """
        Returns cart upselling recommendations.
        """
        from catalog.services.recommendation import get_cart_recommendations
        from catalog.serializers import ProductListSerializer
        
        cart = services.get_or_create_cart(request.user)
        recommendations = get_cart_recommendations(cart)
        serializer = ProductListSerializer(recommendations, many=True)
        return Response(serializer.data)

class CartItemViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def create(self, request):
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))
        
        product = get_object_or_404(Product, id=product_id)
        
        cart_item = services.add_item_to_cart(request.user, product, quantity)
        cart = services.get_or_create_cart(request.user)
        cart = Cart.objects.prefetch_related('items__product__images').get(id=cart.id)
        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        quantity = int(request.data.get('quantity'))
        
        services.update_item_quantity(request.user, pk, quantity)
        cart = services.get_or_create_cart(request.user)
        cart = Cart.objects.prefetch_related('items__product__images').get(id=cart.id)
        return Response(CartSerializer(cart).data)

    def destroy(self, request, pk=None):
        services.remove_item_from_cart(request.user, pk)
        cart = services.get_or_create_cart(request.user)
        cart = Cart.objects.prefetch_related('items__product__images').get(id=cart.id)
        return Response(CartSerializer(cart).data)

class CartMergeView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CartMergeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        result = services.merge_guest_cart(request.user, serializer.validated_data['items'])
        
        cart = services.get_or_create_cart(request.user)
        cart = Cart.objects.prefetch_related('items__product__images').get(id=cart.id)
        
        response_data = {
            "cart": CartSerializer(cart).data,
            "merge_summary": result
        }
        return Response(response_data)

class WishlistViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
        items = wishlist.items.select_related('product').prefetch_related('product__images').all()
        
        # We can annotate the response manually or use serializer. Let's do it in the view for intelligence
        data = []
        for item in items:
            product = item.product
            intelligence = {}
            if item.price_at_addition and product.price < item.price_at_addition:
                intelligence['price_dropped'] = True
                intelligence['drop_amount'] = item.price_at_addition - product.price
            if product.stock_quantity > 0 and item.price_at_addition is not None:
                # Basic back in stock logic could be comparing previous stock, 
                # but if it was added when out of stock and now is in stock, it's back in stock.
                # Assuming if added when stock=0, price_at_addition might be set. We don't have historical stock snapshot.
                # Just expose stock status.
                intelligence['in_stock'] = True
            elif product.stock_quantity == 0:
                intelligence['in_stock'] = False
                
            serialized_item = WishlistItemSerializer(item).data
            serialized_item['intelligence'] = intelligence
            data.append(serialized_item)
            
        return Response(data)

    @action(detail=False, methods=['post'])
    def toggle(self, request):
        product_id = request.data.get('product_id')
        product = get_object_or_404(Product, id=product_id)
        
        wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
        item = WishlistItem.objects.filter(wishlist=wishlist, product=product).first()
        
        if item:
            item.delete()
            added = False
        else:
            WishlistItem.objects.create(
                wishlist=wishlist, 
                product=product,
                price_at_addition=product.price
            )
            added = True
            
        return Response({"added": added}, status=status.HTTP_200_OK)

    def destroy(self, request, pk=None):
        wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
        item = get_object_or_404(WishlistItem, id=pk, wishlist=wishlist)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class CheckoutSummaryView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cart = services.get_or_create_cart(request.user)
        coupon_code = request.data.get('coupon_code')
        totals = calculate_checkout_totals(cart, coupon_code)
        if not totals:
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = CheckoutSummarySerializer(totals)
        return Response(serializer.data)


class PaymentIntentView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'checkout'

    def get(self, request):
        return Response({
            "publishable_key": getattr(settings, 'STRIPE_PUBLISHABLE_KEY', '')
        })

    def post(self, request):
        cart = services.get_or_create_cart(request.user)
        coupon_code = request.data.get('coupon_code')
        totals = calculate_checkout_totals(cart, coupon_code)
        if not totals:
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
            
        address_snapshot = request.data.get('address_snapshot')
        if not address_snapshot:
            return Response({"detail": "Delivery address is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        existing_order_id = request.data.get('existing_order_id')
            
        try:
            intent, order = create_or_update_payment_intent(
                user=request.user, 
                cart_totals=totals,
                address_snapshot=address_snapshot,
                existing_order_id=existing_order_id
            )
            return Response({
                "client_secret": intent.client_secret,
                "order_id": order.id,
                "order_number": order.order_number,
                "publishable_key": getattr(settings, 'STRIPE_PUBLISHABLE_KEY', '')
            })
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items')

    def get_object(self):
        # We can look up by order_number instead of pk if we want
        queryset = self.get_queryset()
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        # Support looking up by either id or order_number
        if 'pk' in self.kwargs:
            try:
                pk = int(self.kwargs['pk'])
                obj = get_object_or_404(queryset, pk=pk)
            except ValueError:
                obj = get_object_or_404(queryset, order_number=self.kwargs['pk'])
        else:
            obj = get_object_or_404(queryset, **filter_kwargs)

        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        
        if order.status not in [Order.Status.PENDING, Order.Status.PACKAGING]:
            return Response({"detail": "Order cannot be cancelled at this stage."}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            order.status = Order.Status.CANCELLED
            order.save(update_fields=['status'])
            
            OrderEventHistory.objects.create(
                order=order,
                status=Order.Status.CANCELLED,
                notes="Cancelled by customer."
            )
            
            from django.db.models import F
            for item in order.items.all():
                if item.product_id:
                    Product.objects.filter(id=item.product_id).update(
                        stock_quantity=F('stock_quantity') + item.quantity
                    )
            
            # Since Stripe payment might be PENDING or PAID, we might need a refund mechanism
            # (Refund processing handled by background job or merchant dashboard in a real app)
            
        return Response({"detail": "Order cancelled successfully."})

    @action(detail=False, methods=['post'])
    def confirm_payment(self, request):
        order_number = request.data.get('order_number')
        order_id = request.data.get('order_id')
        order = None
        if order_number:
            order = Order.objects.filter(order_number=order_number, user=request.user).first()
        elif order_id:
            order = Order.objects.filter(id=order_id, user=request.user).first()
            
        if not order:
            return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
            
        from decimal import Decimal
        from .payment import finalize_order_from_payment
        try:
            order = finalize_order_from_payment(
                order_id=order.id, 
                amount_received=int(order.total_amount * Decimal('100')), 
                currency='inr'
            )
            return Response({"detail": "Payment confirmed successfully.", "order_number": order.order_number})
        except Exception:
            with transaction.atomic():
                order.payment_status = Order.PaymentStatus.PAID
                order.status = Order.Status.CONFIRMED
                order.save(update_fields=['payment_status', 'status'])
                cart = Cart.objects.filter(user=request.user).first()
                if cart:
                    cart.items.all().delete()
                OrderEventHistory.objects.create(
                    order=order,
                    status=Order.Status.CONFIRMED,
                    notes="Payment confirmed via instant checkout."
                )
            return Response({"detail": "Payment confirmed successfully.", "order_number": order.order_number})


class MerchantOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Returns orders that contain products owned by the authenticated merchant.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        if self.request.user.role != 'MERCHANT':
            return Order.objects.none()
            
        # Find orders that have items belonging to this merchant
        return Order.objects.filter(
            items__product__merchant=self.request.user
        ).distinct().prefetch_related('items')

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        if self.request.user.role != 'MERCHANT':
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        order = self.get_object()
        new_status = request.data.get('status')
        
        valid_statuses = [s[0] for s in Order.Status.choices]
        if new_status not in valid_statuses:
            return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Immutability rule: Delivered orders cannot be changed unless a return request exists
        if order.status == Order.Status.DELIVERED and new_status != Order.Status.DELIVERED:
            has_return = ReturnRequest.objects.filter(order=order).exists()
            if not has_return:
                return Response(
                    {"detail": "Delivered orders are immutable and cannot be changed unless the customer initiates a return."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Basic status flow logic with history tracking
        notes = request.data.get('notes', '')
        
        with transaction.atomic():
            order.status = new_status
            order.save(update_fields=['status'])
            OrderEventHistory.objects.create(
                order=order,
                status=new_status,
                notes=notes
            )
            
        return Response(OrderSerializer(order).data)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        if self.request.user.role != 'MERCHANT':
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        orders = self.get_queryset()
        
        # Calculate basic metrics using DB aggregation
        revenue_data = orders.filter(payment_status=Order.PaymentStatus.PAID).aggregate(total_revenue=Sum('total_amount'))
        total_revenue = revenue_data.get('total_revenue') or 0
        
        total_orders = orders.count()
        total_products = Product.objects.filter(merchant=self.request.user).count()
        
        # Units sold (total quantity from paid orders)
        units_data = OrderItem.objects.filter(
            order__in=orders.filter(payment_status=Order.PaymentStatus.PAID),
            product__merchant=self.request.user
        ).aggregate(total_units=Sum('quantity'))
        units_sold = units_data.get('total_units') or 0

        # Returned Products & Orders accounting
        return_requests = ReturnRequest.objects.filter(order_item__product__merchant=self.request.user)
        total_returned_requests = return_requests.count()
        returned_units_data = return_requests.filter(
            status__in=[ReturnRequest.Status.REQUESTED, ReturnRequest.Status.UNDER_REVIEW, ReturnRequest.Status.APPROVED, ReturnRequest.Status.COMPLETED]
        ).aggregate(total_returned_units=Sum('quantity'))
        returned_units = returned_units_data.get('total_returned_units') or 0

        # Returned revenue / refunded amount
        returned_orders_revenue = orders.filter(status=Order.Status.RETURNED).aggregate(rev=Sum('total_amount'))['rev'] or 0
        from orders.models import Refund
        refunds_data = Refund.objects.filter(
            order__items__product__merchant=self.request.user,
            status=Refund.Status.SUCCEEDED
        ).distinct().aggregate(total_refunded=Sum('amount'))
        refunded_amount = refunds_data.get('total_refunded') or 0

        total_returned_deduction = max(float(returned_orders_revenue), float(refunded_amount))
        if total_returned_deduction == 0 and returned_units > 0:
            for rr in return_requests.select_related('order_item'):
                if rr.order_item and rr.order_item.unit_price:
                    total_returned_deduction += float(rr.order_item.unit_price) * rr.quantity

        net_revenue = max(0.0, float(total_revenue) - float(total_returned_deduction))
        
        # Count by status
        status_counts = orders.values('status').annotate(count=Count('status'))
        status_dict = {item['status']: item['count'] for item in status_counts}
        
        pending_orders = status_dict.get('PENDING', 0)
        delivered_orders = status_dict.get('DELIVERED', 0)
        
        # Product Analytics Funnel (Use MerchantAnalytics background task data)
        from catalog.models import MerchantAnalytics
        merchant_analytics = MerchantAnalytics.objects.filter(merchant=self.request.user).first()
        
        if merchant_analytics:
            views = merchant_analytics.total_views
            adds = merchant_analytics.total_add_to_cart
            checkouts = merchant_analytics.total_checkout_started
        else:
            views = 0
            adds = 0
            checkouts = 0
            
        purchases = units_sold
        
        # Rates
        add_to_cart_rate = (adds / views * 100) if views > 0 else 0
        checkout_conversion = (purchases / checkouts * 100) if checkouts > 0 else 0
        overall_conversion_rate = (purchases / views * 100) if views > 0 else 0
        
        # Insights generation
        insights = []
        if overall_conversion_rate < 2 and views > 1000:
            insights.append("Your overall conversion rate is below 2%. Consider reviewing pricing or product descriptions.")
        if add_to_cart_rate > 10 and checkout_conversion < 20:
            insights.append("Many users add products to cart but do not checkout. Consider offering a discount code.")
        if pending_orders > 10:
            insights.append(f"You have {pending_orders} pending orders to fulfill.")
        if returned_units > 0:
            insights.append(f"You have {returned_units} returned item(s) from {total_returned_requests} return request(s).")
            
        return Response({
            "total_revenue": total_revenue,
            "net_revenue": net_revenue,
            "returned_revenue": total_returned_deduction,
            "total_orders": total_orders,
            "units_sold": units_sold,
            "returned_units": returned_units,
            "returned_requests_count": total_returned_requests,
            "total_products": total_products,
            "pending_orders": pending_orders,
            "delivered_orders": delivered_orders,
            "average_order_value": net_revenue / total_orders if total_orders > 0 else 0,
            "conversion_rate": overall_conversion_rate,
            "add_to_cart_rate": add_to_cart_rate,
            "checkout_conversion": checkout_conversion,
            "insights": insights,
            "funnel": {
                "views": views,
                "add_to_cart": adds,
                "checkout_started": checkouts,
                "purchases": purchases
            }
        })

    @action(detail=False, methods=['get'])
    def csv_export(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            token = request.query_params.get('token')
            if token:
                from rest_framework_simplejwt.tokens import AccessToken
                try:
                    access = AccessToken(token)
                    from accounts.models import User
                    user = User.objects.get(id=access['user_id'])
                except Exception:
                    return Response({"detail": "Authentication failed."}, status=status.HTTP_401_UNAUTHORIZED)
            else:
                return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)

        if user.role != 'MERCHANT':
            return Response({"detail": "Only merchants can export orders."}, status=status.HTTP_403_FORBIDDEN)
            
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="merchant_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Order Number', 'Date', 'Status', 'Total Amount', 'Items'])
        
        orders = Order.objects.filter(
            items__product__merchant=user,
            payment_status=Order.PaymentStatus.PAID
        ).distinct().prefetch_related('items')
        
        for order in orders:
            items_str = ", ".join([f"{item.quantity}x {item.product_name}" for item in order.items.all() if item.product and item.product.merchant == user])
            writer.writerow([
                order.order_number,
                order.created_at.strftime('%Y-%m-%d %H:%M'),
                order.status,
                order.total_amount,
                items_str
            ])
            
        return response

class CouponValidateView(views.APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'checkout'

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({"detail": "Coupon code required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            coupon = Coupon.objects.get(code=code, is_active=True)
            if coupon.valid_until and coupon.valid_until < timezone.now():
                return Response({"detail": "This coupon has expired."}, status=status.HTTP_400_BAD_REQUEST)
            if coupon.usage_limit and coupon.times_used >= coupon.usage_limit:
                return Response({"detail": "This coupon has reached its usage limit."}, status=status.HTTP_400_BAD_REQUEST)
                
            return Response({
                "code": coupon.code,
                "discount_percentage": coupon.discount_percentage
            })
        except Coupon.DoesNotExist:
            return Response({"detail": "Invalid coupon code."}, status=status.HTTP_400_BAD_REQUEST)


class ReturnRequestViewSet(viewsets.ModelViewSet):
    """
    API for customers to request returns and track status.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ReturnRequestSerializer
    
    def get_queryset(self):
        return ReturnRequest.objects.filter(user=self.request.user).select_related('order', 'order_item', 'refund')

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        order_item_id = self.request.data.get('order_item_id') or serializer.validated_data.get('order_item_id')
        if not order_item_id:
            raise ValidationError({"detail": "order_item_id is required."})

        order_item = get_object_or_404(OrderItem, id=order_item_id, order__user=self.request.user)
        order = order_item.order
        
        if order.status != Order.Status.DELIVERED:
            raise ValidationError({"detail": "You can only return items from delivered orders."})
            
        # check time window (e.g. 15 days)
        if (timezone.now() - order.updated_at).days > getattr(settings, 'RETURN_WINDOW_DAYS', 15):
            raise ValidationError({"detail": "Return window has expired."})
            
        quantity = int(self.request.data.get('quantity', 1))
        if quantity > order_item.quantity:
            raise ValidationError({"detail": "Cannot return more than purchased quantity."})
            
        with transaction.atomic():
            serializer.save(user=self.request.user, order=order, order_item=order_item, quantity=quantity)


class MerchantReturnViewSet(viewsets.ModelViewSet):
    """
    API for merchants to manage returns.
    """
    from accounts.permissions import IsMerchant
    permission_classes = [IsAuthenticated, IsMerchant]
    serializer_class = ReturnRequestSerializer
    
    def get_queryset(self):
        # Merchants can only see returns for products they own
        return ReturnRequest.objects.filter(order_item__product__merchant=self.request.user).select_related('order', 'order_item', 'refund')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        return_req = self.get_object()
        if return_req.status != ReturnRequest.Status.REQUESTED:
            return Response({"detail": "Only REQUESTED returns can be approved."}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            return_req.status = ReturnRequest.Status.APPROVED
            return_req.save(update_fields=['status'])
            # Initiate background refund processing
            from django_q.tasks import async_task
            async_task('orders.services.process_refund', return_req.id)
            
        return Response({"detail": "Return approved."})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        return_req = self.get_object()
        if return_req.status != ReturnRequest.Status.REQUESTED:
            return Response({"detail": "Only REQUESTED returns can be rejected."}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            return_req.status = ReturnRequest.Status.REJECTED
            return_req.save(update_fields=['status'])
            
        return Response({"detail": "Return rejected."})


class SupportIssueViewSet(viewsets.ModelViewSet):
    """
    API for customers to raise support issues.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SupportIssueSerializer
    
    def get_queryset(self):
        user = self.request.user
        from django.db.models import Q
        if getattr(user, 'role', '') == 'MERCHANT':
            return SupportIssue.objects.filter(
                Q(user=user) | Q(product__merchant=user) | Q(order__items__product__merchant=user)
            ).distinct().order_by('-created_at')
        return SupportIssue.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        
        # Rate limit: max 5 issues per hour
        from django.utils import timezone
        import datetime
        recent_issues = SupportIssue.objects.filter(user=user, created_at__gte=timezone.now() - datetime.timedelta(hours=1)).count()
        if recent_issues >= 5:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "You have submitted too many support issues recently."})

        order_id = self.request.data.get('order_id')
        product_id = self.request.data.get('product_id')
        
        order = get_object_or_404(Order, id=order_id, user=self.request.user) if order_id else None
        product = get_object_or_404(Product, id=product_id) if product_id else None
        
        serializer.save(user=self.request.user, order=order, product=product)

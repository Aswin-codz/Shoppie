from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from django.db.models import Prefetch, Q, Count, F
from django.db import transaction, connection
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.core.cache import cache
from django.contrib.postgres.search import TrigramSimilarity

from .utils import upload_to_cloudinary, delete_from_cloudinary

from accounts.permissions import IsMerchant
from .models import Category, Tag, Product, ProductImage, Review, ProductAnalytics
from .serializers import (
    CategorySerializer, 
    TagSerializer, 
    ProductListSerializer, 
    ProductDetailSerializer,
    ProductCreateUpdateSerializer,
    ProductImageSerializer,
    ReviewSerializer,
    RecentlyViewedSerializer
)
from .permissions import IsMerchantOwnerOrReadOnly
from orders.models import Order, OrderItem
from .models import RecentlyViewed, StockAlertSubscription


class CategoryViewSet(viewsets.ModelViewSet):
    """
    Public API for viewing categories, Merchant API for creating them.
    """
    queryset = Category.objects.filter(is_active=True, parent__isnull=True).prefetch_related('children')
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'

    @method_decorator(cache_page(60 * 15))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @method_decorator(cache_page(60 * 15))
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    def perform_create(self, serializer):
        instance = serializer.save()
        try:
            from django.core.cache import cache
            cache.clear()
        except Exception:
            pass
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        try:
            from django.core.cache import cache
            cache.clear()
        except Exception:
            pass
        return instance

    def perform_destroy(self, instance):
        instance.delete()
        try:
            from django.core.cache import cache
            cache.clear()
        except Exception:
            pass

class TagViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public API for viewing tags.
    """
    queryset = Tag.objects.all().order_by('name')
    serializer_class = TagSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr='lte')
    category = django_filters.CharFilter(field_name='category__slug')
    tags = django_filters.CharFilter(method='filter_by_tags')

    class Meta:
        model = Product
        fields = ['category', 'is_featured']

    def filter_by_tags(self, queryset, name, value):
        tags = value.split(',')
        return queryset.filter(tags__slug__in=tags).distinct()


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public API for viewing products.
    """
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = ProductFilter
    # Search is handled manually in get_queryset for Trigram support
    ordering_fields = ['price', 'created_at', 'rating']
    ordering = ['-created_at']
    lookup_field = 'slug'

    def get_queryset(self):
        # Base queryset only includes active products
        qs = Product.objects.filter(is_active=True, category__is_active=True)
        
        # Search handling (robust multi-field substring + Trigram fallback on Postgres)
        search_query = self.request.query_params.get('search', '').strip()
        if search_query:
            if connection.vendor == 'postgresql':
                from django.db.models.functions import Coalesce
                from django.db.models import Value, FloatField
                qs = qs.annotate(
                    similarity=Coalesce(TrigramSimilarity('name', search_query), Value(0.0), output_field=FloatField()) + 
                               Coalesce(TrigramSimilarity('description', search_query) * 0.5, Value(0.0), output_field=FloatField())
                ).filter(
                    Q(name__icontains=search_query) |
                    Q(description__icontains=search_query) |
                    Q(tags__name__icontains=search_query) |
                    Q(similarity__gt=0.1)
                ).order_by('-similarity').distinct()
            else:
                qs = qs.filter(
                    Q(name__icontains=search_query) | 
                    Q(description__icontains=search_query) | 
                    Q(tags__name__icontains=search_query)
                ).distinct()
        
        # Optimize queries based on action
        if self.action == 'list':
            qs = qs.select_related('category').prefetch_related(
                Prefetch('images', queryset=ProductImage.objects.filter(is_primary=True))
            )
        elif self.action == 'retrieve':
            qs = qs.select_related('category', 'merchant').prefetch_related('tags', 'images')
            
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Zero-result fallback
        if not queryset.exists() and request.query_params.get('search'):
            search_query = request.query_params.get('search', '').strip()
            # Try to find a did_you_mean suggestion
            suggestion = None
            if connection.vendor == 'postgresql':
                similar_products = Product.objects.filter(is_active=True).annotate(
                    similarity=TrigramSimilarity('name', search_query)
                ).filter(similarity__gt=0.05).order_by('-similarity')
                if similar_products.exists():
                    suggestion = similar_products.first().name
                    
            from catalog.services.recommendation import get_trending_products
            fallback_products = get_trending_products(limit=8)
            
            return Response({
                "count": 0,
                "next": None,
                "previous": None,
                "results": [],
                "did_you_mean": suggestion,
                "fallback": ProductListSerializer(fallback_products, many=True).data
            })

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def related(self, request, slug=None):
        """
        Returns up to 4 related products using Recommendation Engine V2.
        """
        from catalog.services.recommendation import get_related_products
        product = self.get_object()
        related_qs = get_related_products(product, user=request.user if request.user.is_authenticated else None)
        serializer = ProductListSerializer(related_qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def personalized_feed(self, request):
        """
        Returns a personalized feed of products based on recent views.
        """
        from catalog.services.recommendation import get_personalized_feed
        feed = get_personalized_feed(request.user if request.user.is_authenticated else None)
        # We manually serialize here because get_personalized_feed returns a list, not a queryset
        serializer = ProductListSerializer(feed, many=True)
        return Response(serializer.data)
        
    @action(detail=True, methods=['get'])
    def frequently_bought_together(self, request, slug=None):
        """
        Returns frequently bought together products.
        """
        from catalog.services.recommendation import get_frequently_bought_together
        product = self.get_object()
        fbt = get_frequently_bought_together(product)
        serializer = ProductListSerializer(fbt, many=True)
        return Response(serializer.data)
        
    @action(detail=False, methods=['get'])
    def search_suggestions(self, request):
        """
        Returns search suggestions.
        """
        from catalog.models import SearchQueryAnalytics
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response([])
            
        # Basic autocomplete logic
        qs = Product.objects.filter(is_active=True, category__is_active=True)
        if connection.vendor == 'postgresql':
            qs = qs.annotate(
                similarity=TrigramSimilarity('name', query)
            ).filter(similarity__gt=0.1).order_by('-similarity')
        else:
            qs = qs.filter(name__icontains=query).order_by('name')
            
        suggestions = list(qs.values('id', 'name', 'slug')[:5])
        
        # Track search anonymously
        if len(query) > 2:
            SearchQueryAnalytics.objects.create(
                query=query, 
                result_count=qs.count(),
                user=request.user if request.user.is_authenticated else None
            )
            
        return Response([{"id": s["id"], "query": s["name"], "slug": s["slug"], "score": 1} for s in suggestions])

    @action(detail=False, methods=['get'])
    def search_history(self, request):
        """
        Returns search history for the authenticated user.
        """
        if not request.user.is_authenticated:
            return Response([])
        from catalog.models import SearchQueryAnalytics
        history = SearchQueryAnalytics.objects.filter(user=request.user).values_list('query', flat=True).distinct()[:5]
        return Response([{"query": q, "score": 1} for q in history])

    @action(detail=False, methods=['get'])
    def popular_searches(self, request):
        """
        Returns trending / popular search terms.
        """
        from catalog.models import SearchQueryAnalytics
        popular = SearchQueryAnalytics.objects.filter(result_count__gt=0).values('query').annotate(
            total_searches=Count('id')
        ).order_by('-total_searches')[:5]
        return Response([{"query": p['query'], "score": p['total_searches']} for p in popular])

    @action(detail=True, methods=['post'])
    def track_event(self, request, slug=None):
        """
        Track an analytics event for a product (view, add_to_cart, checkout).
        """
        product = self.get_object()
        event_type = request.data.get('event_type')
        
        if event_type not in ['view', 'add_to_cart', 'checkout_started']:
            return Response({"detail": "Invalid event_type."}, status=status.HTTP_400_BAD_REQUEST)
            
        analytics, _ = ProductAnalytics.objects.get_or_create(product=product)
        
        if event_type == 'view':
            ProductAnalytics.objects.filter(id=analytics.id).update(views_count=F('views_count') + 1)
            if request.user.is_authenticated:
                from catalog.models import RecentlyViewed
                RecentlyViewed.objects.update_or_create(
                    user=request.user,
                    product=product,
                    defaults={}
                )
        elif event_type == 'add_to_cart':
            ProductAnalytics.objects.filter(id=analytics.id).update(add_to_cart_count=F('add_to_cart_count') + 1)
        elif event_type == 'checkout_started':
            ProductAnalytics.objects.filter(id=analytics.id).update(checkout_started_count=F('checkout_started_count') + 1)
            
        return Response({"status": "tracked"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def suggestions(self, request):
        """
        Returns autocomplete suggestions for product search.
        """
        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 2:
            return Response([])
            
        if connection.vendor == 'postgresql':
            qs = Product.objects.filter(is_active=True).annotate(
                similarity=TrigramSimilarity('name', query)
            ).filter(similarity__gt=0.1).order_by('-similarity')[:5]
        else:
            qs = Product.objects.filter(is_active=True, name__icontains=query).order_by('name')[:5]
            
        suggestions = [{"name": p.name, "slug": p.slug} for p in qs]
        return Response(suggestions)

    @action(detail=False, methods=['get'])
    def homepage(self, request):
        """
        Returns dynamic categorized product lists for the homepage.
        """
        from catalog.services.recommendation import get_personalized_feed, get_trending_products
        
        # We can cache the generic components manually
        generic_cache_key = 'homepage_generic_sections_v1'
        generic_data = cache.get(generic_cache_key)
        
        if not generic_data:
            base_qs = Product.objects.filter(is_active=True, category__is_active=True).select_related('category').prefetch_related(
                Prefetch('images', queryset=ProductImage.objects.filter(is_primary=True))
            )
            featured = base_qs.order_by('-rating', '-stock_quantity')[:8]
            new_arrivals = base_qs.order_by('-created_at')[:8]
            top_rated = base_qs.order_by('-rating')[:8]
            
            generic_data = {
                'featured': ProductListSerializer(featured, many=True).data,
                'new_arrivals': ProductListSerializer(new_arrivals, many=True).data,
                'top_rated': ProductListSerializer(top_rated, many=True).data,
                'trending': ProductListSerializer(get_trending_products(8), many=True).data,
            }
            cache.set(generic_cache_key, generic_data, 60 * 15)
            
        data = generic_data.copy()
        
        # Personalized Sections
        if request.user.is_authenticated:
            # 1. Recently Viewed
            recent_views_qs = RecentlyViewed.objects.filter(user=request.user).select_related('product__category').prefetch_related(
                Prefetch('product__images', queryset=ProductImage.objects.filter(is_primary=True))
            )[:8]
            recently_viewed = [rv.product for rv in recent_views_qs]
            
            # 2. Recommended For You (Advanced Engine)
            recommended = get_personalized_feed(request.user, limit=8)
            
            data['recently_viewed'] = ProductListSerializer(recently_viewed, many=True).data
            data['recommended_for_you'] = ProductListSerializer(recommended, many=True).data
            
            if recommended:
                data['explanation'] = "Based on your recent activity and wishlist"
                
        else:
            # For guests, they might have recently viewed in local storage, which frontend handles.
            # We can just provide popular items.
            pass

        return Response(data)


class MerchantProductViewSet(viewsets.ModelViewSet):
    """
    Merchant API for managing their own products.
    """
    permission_classes = [permissions.IsAuthenticated, IsMerchant, IsMerchantOwnerOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'sku']
    ordering_fields = ['created_at', 'price', 'stock_quantity']
    ordering = ['-created_at']

    def get_queryset(self):
        # Return all products (including inactive) belonging to this merchant
        return Product.objects.filter(merchant=self.request.user).select_related('category').prefetch_related('tags', 'images')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateUpdateSerializer
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer

    def perform_create(self, serializer):
        # Automatically set the merchant to the current authenticated user
        serializer.save(merchant=self.request.user)
        cache.clear()
        
    def perform_update(self, serializer):
        serializer.save()
        cache.clear()

    def destroy(self, request, *args, **kwargs):
        """
        Soft delete the product instead of physically deleting it.
        """
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        cache.clear()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """
        Returns analytics for all products owned by the merchant.
        """
        qs = self.get_queryset().select_related('analytics')
        data = []
        for product in qs:
            analytics = getattr(product, 'analytics', None)
            
            # Funnel metrics
            views = analytics.views_count if analytics else 0
            adds = analytics.add_to_cart_count if analytics else 0
            checkouts = analytics.checkout_started_count if analytics else 0
            purchases = analytics.purchased_count if analytics else 0
            revenue = analytics.revenue if analytics else 0.00
            
            # Conversions
            view_to_add = (adds / views * 100) if views > 0 else 0
            add_to_checkout = (checkouts / adds * 100) if adds > 0 else 0
            checkout_to_purchase = (purchases / checkouts * 100) if checkouts > 0 else 0
            conversion_rate = (purchases / views * 100) if views > 0 else 0
            
            # Inventory logic
            stock = product.stock_quantity
            threshold = getattr(product, 'low_stock_threshold', 10)
            status_badge = "NORMAL"
            if stock == 0:
                status_badge = "OUT_OF_STOCK"
            elif stock <= threshold and conversion_rate > 5:
                status_badge = "LOW_STOCK_HIGH_DEMAND"
            elif stock <= threshold:
                status_badge = "LOW_STOCK"
            elif views > 100 and purchases == 0:
                status_badge = "SLOW_MOVING"
            elif conversion_rate > 10:
                status_badge = "FAST_SELLING"

            data.append({
                "id": product.id,
                "name": product.name,
                "stock": stock,
                "status": status_badge,
                "funnel": {
                    "views": views,
                    "adds": adds,
                    "checkouts": checkouts,
                    "purchases": purchases,
                    "revenue": revenue
                },
                "rates": {
                    "view_to_add": round(view_to_add, 1),
                    "add_to_checkout": round(add_to_checkout, 1),
                    "checkout_to_purchase": round(checkout_to_purchase, 1),
                    "conversion_rate": round(conversion_rate, 1)
                }
            })
            
        return Response(data)


class MerchantProductImageViewSet(viewsets.ModelViewSet):
    """
    Merchant API for managing product images.
    """
    serializer_class = ProductImageSerializer
    permission_classes = [permissions.IsAuthenticated, IsMerchant]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_product(self):
        product_id = self.kwargs.get('product_pk')
        product = get_object_or_404(Product, pk=product_id)
        if product.merchant != self.request.user:
            self.permission_denied(self.request, message="You do not own this product.")
        return product

    def get_queryset(self):
        product = self.get_product()
        return ProductImage.objects.filter(product=product).order_by('sort_order', 'id')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = ProductImageSerializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        product = self.get_product()
        
        # Check image limit
        if product.images.count() >= 8:
            return Response({"detail": "Maximum of 8 images allowed per product."}, status=status.HTTP_400_BAD_REQUEST)
            
        if 'image' not in request.FILES:
            return Response({"detail": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        data = request.data.copy()
        if 'alt_text' not in data:
            data['alt_text'] = f'{product.name} product image'
            
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            is_primary = not product.images.filter(is_primary=True).exists()
            last_image = product.images.order_by('-sort_order').first()
            sort_order = last_image.sort_order + 1 if last_image else 0
            
            serializer.save(
                product=product,
                sort_order=sort_order,
                is_primary=is_primary
            )
            
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        image = self.get_object()
        product = image.product
        
        with transaction.atomic():
            was_primary = image.is_primary
            image.delete()
            
            # Reassign primary if needed
            if was_primary:
                next_primary = product.images.order_by('sort_order', 'id').first()
                if next_primary:
                    next_primary.is_primary = True
                    next_primary.save()
                    
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['patch'])
    def reorder(self, request, *args, **kwargs):
        product = self.get_product()
        image_ids = request.data.get('image_ids', [])
        
        if not isinstance(image_ids, list):
            return Response({"detail": "image_ids must be a list."}, status=status.HTTP_400_BAD_REQUEST)
            
        existing_images = list(product.images.all())
        existing_ids = {img.id for img in existing_images}
        
        if len(set(image_ids)) != len(image_ids):
            return Response({"detail": "Duplicate IDs provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not all(img_id in existing_ids for img_id in image_ids):
            return Response({"detail": "Invalid image IDs provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        if len(image_ids) != len(existing_ids):
            return Response({"detail": "Must provide all existing image IDs for reordering."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Update safely
        with transaction.atomic():
            image_map = {img.id: img for img in existing_images}
            images_to_update = []
            for index, img_id in enumerate(image_ids):
                img = image_map[img_id]
                img.sort_order = index
                images_to_update.append(img)
            
            ProductImage.objects.bulk_update(images_to_update, ['sort_order'])
        
        cache.clear()
        serializer = ProductImageSerializer(product.images.order_by('sort_order', 'id'), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='set-primary')
    def set_primary(self, request, *args, **kwargs):
        image = self.get_object()
        product = image.product
        
        with transaction.atomic():
            product.images.filter(is_primary=True).update(is_primary=False)
            image.is_primary = True
            image.save()
            
        cache.clear()
        serializer = ProductImageSerializer(image)
        return Response(serializer.data)


class ReviewViewSet(viewsets.ModelViewSet):
    """
    Public API for viewing reviews, and authenticated API for creating them.
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        product_slug = self.kwargs.get('product_slug')
        qs = Review.objects.none()
        if product_slug:
            qs = Review.objects.filter(product__slug=product_slug).select_related('user')
            
        # If user is authenticated, they can see PUBLISHED reviews + their own reviews
        if self.request.user.is_authenticated:
            qs = qs.filter(Q(moderation_status=Review.ModerationStatus.PUBLISHED) | Q(user=self.request.user))
        else:
            qs = qs.filter(moderation_status=Review.ModerationStatus.PUBLISHED)
            
        return qs

    def perform_create(self, serializer):
        product_slug = self.kwargs.get('product_slug')
        product = get_object_or_404(Product, slug=product_slug)
        user = self.request.user

        # Rate limiting: max 5 reviews per hour
        from django.utils import timezone
        import datetime
        recent_reviews_count = Review.objects.filter(user=user, created_at__gte=timezone.now() - datetime.timedelta(hours=1)).count()
        if recent_reviews_count >= 5:
            raise ValidationError({"detail": "You have submitted too many reviews recently. Please try again later."})

        # Check if user purchased AND order was delivered, finding an unreviewed order item
        order_item = OrderItem.objects.filter(
            order__user=user,
            order__payment_status=Order.PaymentStatus.PAID,
            order__status=Order.Status.DELIVERED,
            product=product
        ).exclude(
            id__in=Review.objects.filter(user=user, product=product, order_item__isnull=False).values('order_item_id')
        ).order_by('-created_at').first()

        if not order_item:
            raise ValidationError({"detail": "You can only review products you have purchased and received, and you cannot review the same purchase twice."})

        with transaction.atomic():
            review = serializer.save(user=user, product=product, is_verified_purchase=True, order_item=order_item)
            
            images_data = self.request.data.get('images', [])
            if isinstance(images_data, list):
                from catalog.models import ReviewImage
                for img_url in images_data:
                    ReviewImage.objects.create(review=review, image=img_url)
            
            # Update product rating
            from django.db.models import Avg
            avg_rating = product.reviews.aggregate(Avg('rating'))['rating__avg'] or 0.00
            product.rating = round(avg_rating, 2)
            product.save(update_fields=['rating'])
        cache.clear()

    def perform_update(self, serializer):
        if self.get_object().user != self.request.user:
            self.permission_denied(self.request, message="You do not own this review.")
        with transaction.atomic():
            serializer.save()
            product = self.get_object().product
            from django.db.models import Avg
            avg_rating = product.reviews.aggregate(Avg('rating'))['rating__avg'] or 0.00
            product.rating = round(avg_rating, 2)
            product.save(update_fields=['rating'])
        cache.clear()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            self.permission_denied(self.request, message="You do not own this review.")
        product = instance.product
        with transaction.atomic():
            instance.delete()
            avg_rating = product.reviews.filter(moderation_status=Review.ModerationStatus.PUBLISHED).aggregate(Avg('rating'))['rating__avg'] or 0.00
            product.rating = round(avg_rating, 2)
            product.save(update_fields=['rating'])
        cache.clear()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def vote_helpful(self, request, *args, **kwargs):
        review = self.get_object()
        user = request.user

        if review.user == user:
            return Response({"detail": "You cannot vote on your own review."}, status=status.HTTP_400_BAD_REQUEST)

        from catalog.models import ReviewHelpfulVote
        vote, created = ReviewHelpfulVote.objects.get_or_create(review=review, user=user)
        
        if not created:
            # Toggle vote off if it already exists
            vote.delete()
            return Response({"detail": "Helpful vote removed.", "helpful_count": review.helpful_votes.count()})
            
        return Response({"detail": "Review marked as helpful.", "helpful_count": review.helpful_votes.count()})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reply(self, request, *args, **kwargs):
        review = self.get_object()
        user = request.user
        
        # Only the merchant of the product can reply
        if review.product.merchant != user:
            return Response({"detail": "Only the merchant of this product can reply to reviews."}, status=status.HTTP_403_FORBIDDEN)
            
        merchant_response = request.data.get('merchant_response', '').strip()
        if not merchant_response:
            return Response({"detail": "Response text is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.utils import timezone
        review.merchant_response = merchant_response
        review.merchant_response_at = timezone.now()
        review.save(update_fields=['merchant_response', 'merchant_response_at'])
        
        return Response(ReviewSerializer(review, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def report(self, request, *args, **kwargs):
        review = self.get_object()
        user = request.user
        
        # Rate limit for reports (max 5 per hour)
        from django.utils import timezone
        import datetime
        from catalog.models import ReviewReport
        
        recent_reports = ReviewReport.objects.filter(user=user, created_at__gte=timezone.now() - datetime.timedelta(hours=1)).count()
        if recent_reports >= 5:
            return Response({"detail": "You have submitted too many reports recently."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
        reason = request.data.get('reason')
        notes = request.data.get('notes', '')

        if not reason:
            return Response({"detail": "Reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        if ReviewReport.objects.filter(review=review, user=user).exists():
            return Response({"detail": "You have already reported this review."}, status=status.HTTP_400_BAD_REQUEST)

        ReviewReport.objects.create(review=review, user=user, reason=reason, notes=notes)
        
        # Simple moderation rule: if a review gets 3 reports, hide it
        if ReviewReport.objects.filter(review=review).count() >= 3:
            review.moderation_status = Review.ModerationStatus.FLAGGED
            review.save(update_fields=['moderation_status'])

        return Response({"detail": "Report submitted successfully."}, status=status.HTTP_201_CREATED)


class ProductReportViewSet(viewsets.ViewSet):
    """
    API for reporting products.
    """
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, product_slug=None):
        product = get_object_or_404(Product, slug=product_slug)
        user = request.user
        reason = request.data.get('reason')
        notes = request.data.get('notes', '')

        if not reason:
            return Response({"detail": "Reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        from catalog.models import ProductReport
        if ProductReport.objects.filter(product=product, user=user).exists():
            return Response({"detail": "You have already reported this product."}, status=status.HTTP_400_BAD_REQUEST)

        ProductReport.objects.create(product=product, user=user, reason=reason, notes=notes)
        return Response({"detail": "Report submitted successfully."}, status=status.HTTP_201_CREATED)

class RecentlyViewedViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = RecentlyViewedSerializer

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return RecentlyViewed.objects.none()
        return RecentlyViewed.objects.filter(user=self.request.user).select_related('product', 'product__category').prefetch_related(
            Prefetch('product__images', queryset=ProductImage.objects.filter(is_primary=True))
        )[:20]

class StockAlertSubscriptionViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, product_slug=None):
        product = get_object_or_404(Product, slug=product_slug)
        sub, created = StockAlertSubscription.objects.get_or_create(
            user=request.user, product=product,
            defaults={'is_active': True}
        )
        if not created and not sub.is_active:
            sub.is_active = True
            sub.save()
        return Response({"detail": "Subscribed to stock alerts."}, status=status.HTTP_201_CREATED)
        
    def destroy(self, request, product_slug=None):
        product = get_object_or_404(Product, slug=product_slug)
        StockAlertSubscription.objects.filter(user=request.user, product=product).update(is_active=False)
        return Response(status=status.HTTP_204_NO_CONTENT)

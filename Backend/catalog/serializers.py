from rest_framework import serializers
from .models import (
    Category, Tag, Product, ProductImage, 
    Review, ReviewImage, ReviewReport, ProductReport, 
    RecentlyViewed, StockAlertSubscription, MerchantAnalytics
)
from accounts.serializers import UserSerializer


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'parent', 'children', 'is_active']
        
    def get_children(self, obj):
        # Prevent infinite recursion if the hierarchy gets too deep, but for now simple children list
        children = obj.children.filter(is_active=True)
        return CategorySerializer(children, many=True).data if children else []


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    optimized_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url', 'optimized_url', 'alt_text', 'sort_order', 'is_primary']
        extra_kwargs = {
            'image': {'write_only': True}
        }

    def get_image_url(self, obj):
        if obj.image:
            return obj.image.url
        return None

    def get_optimized_url(self, obj):
        if obj.image:
            url = obj.image.url
            if '/upload/' in url:
                return url.replace('/upload/', '/upload/f_auto,q_auto,w_800/')
            return url
        return None


class ProductListSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    primary_image = serializers.SerializerMethodField()
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'price', 'compare_at_price', 
            'category', 'category_slug', 'primary_image', 
            'rating', 'stock_quantity', 'is_active', 'is_featured', 'merchant_id', 'created_at'
        ]

    def get_primary_image(self, obj):
        images = list(obj.images.all())
        if not images:
            return None
            
        primary = next((img for img in images if img.is_primary), None)
        target = primary or images[0]
        if target:
            url = getattr(target, 'image_url', None)
            if not url and getattr(target, 'image', None):
                try:
                    url = target.image.url
                except Exception:
                    url = None
            if url:
                if '/upload/' in str(url):
                    return str(url).replace('/upload/', '/upload/f_auto,q_auto,w_800/')
                return str(url)
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    merchant_name = serializers.CharField(source='merchant.get_full_name', read_only=True)
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    merchant_reputation = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'price', 'compare_at_price', 
            'stock_quantity', 'sku', 'rating', 'review_count', 'is_active', 'is_featured', 
            'merchant_id', 'merchant_name', 'merchant_reputation', 'category', 'tags', 'images', 'created_at', 'updated_at'
        ]

    def get_merchant_reputation(self, obj):
        if hasattr(obj.merchant, 'merchant_analytics'):
            analytics = obj.merchant.merchant_analytics
            return {
                'rating': analytics.average_product_rating,
                'fulfillment': analytics.fulfillment_score
            }
        return {'rating': 0, 'fulfillment': 100}

    def get_review_count(self, obj):
        from catalog.models import Review
        return obj.reviews.filter(moderation_status=Review.ModerationStatus.PUBLISHED).count()


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(max_length=100, required=False, allow_blank=True)
    tags = serializers.ListField(
        child=serializers.CharField(max_length=100),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'compare_at_price',
            'stock_quantity', 'sku', 'category', 'tags', 'is_active'
        ]
        
    def validate(self, attrs):
        price = attrs.get('price')
        compare_at_price = attrs.get('compare_at_price')
        
        if price is not None and price < 0:
            raise serializers.ValidationError({"price": "Price cannot be negative."})
            
        if compare_at_price is not None:
            if compare_at_price < 0:
                raise serializers.ValidationError({"compare_at_price": "Compare at price cannot be negative."})
                
            # If price is also being updated, check against new price. 
            # Otherwise check against existing instance price.
            current_price = price if price is not None else (self.instance.price if self.instance else None)
            
            if current_price is not None and compare_at_price < current_price:
                raise serializers.ValidationError({"compare_at_price": "Compare at price must be greater than or equal to price."})
                
        return attrs

    def create(self, validated_data):
        tags_data = validated_data.pop('tags', [])
        if not validated_data.get('sku'):
            validated_data.pop('sku', None)
        
        # The merchant is automatically assigned in the view from request.user
        product = super().create(validated_data)
        
        # Handle tags
        for tag_name in tags_data:
            tag, _ = Tag.objects.get_or_create(name=tag_name.lower())
            product.tags.add(tag)
            
        return product

    def update(self, instance, validated_data):
        tags_data = validated_data.pop('tags', None)
        old_price = instance.price
        
        product = super().update(instance, validated_data)
        
        # Track price history
        if 'price' in validated_data and product.price != old_price:
            from catalog.models import ProductPriceHistory
            ProductPriceHistory.objects.create(
                product=product,
                old_price=old_price,
                new_price=product.price
            )
        
        # Handle tags if provided
        if tags_data is not None:
            product.tags.clear()
            for tag_name in tags_data:
                tag, _ = Tag.objects.get_or_create(name=tag_name.lower())
                product.tags.add(tag)
                
        return product


class ReviewImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ReviewImage
        fields = ['id', 'image', 'image_url']
        extra_kwargs = {
            'image': {'write_only': True}
        }

    def get_image_url(self, obj):
        if obj.image:
            return obj.image.url
        return None


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    images = ReviewImageSerializer(many=True, read_only=True)
    helpful_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Review
        fields = [
            'id', 'product', 'user', 'user_name', 'rating', 'title', 'comment', 
            'is_verified_purchase', 'order_item', 'moderation_status', 
            'merchant_response', 'merchant_response_at', 'images', 'helpful_count', 'created_at'
        ]
        read_only_fields = ['user', 'is_verified_purchase', 'moderation_status', 'merchant_response', 'merchant_response_at', 'order_item']

    def get_user_name(self, obj):
        if obj.user.first_name and obj.user.last_name:
            return f"{obj.user.first_name} {obj.user.last_name[0]}."
        elif obj.user.first_name:
            return obj.user.first_name
        return "Anonymous"

    def get_helpful_count(self, obj):
        return obj.helpful_votes.count()

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

class ReviewReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewReport
        fields = ['id', 'review', 'user', 'reason', 'notes', 'created_at']
        read_only_fields = ['user']

class ProductReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductReport
        fields = ['id', 'product', 'user', 'reason', 'notes', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class RecentlyViewedSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    
    class Meta:
        model = RecentlyViewed
        fields = ['id', 'product', 'viewed_at']
        read_only_fields = ['id', 'viewed_at']

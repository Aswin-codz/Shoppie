from django.db.models import Count, F, Q, Sum, Prefetch
from django.core.cache import cache
from catalog.models import Product, ProductImage, RecentlyViewed
from orders.models import OrderItem, Order

def get_base_qs():
    return Product.objects.filter(is_active=True, category__is_active=True).select_related('category').prefetch_related(
        Prefetch('images', queryset=ProductImage.objects.filter(is_primary=True))
    )

def get_trending_products(limit=8):
    """
    Returns trending products based on views and purchases.
    Uses global caching for 15 minutes to avoid frequent DB hits.
    """
    cache_key = 'trending_products_v2'
    trending = cache.get(cache_key)
    
    if trending is None:
        qs = get_base_qs()
        # Trending score: simple sum of recent views and purchases from ProductAnalytics
        # Since we added purchased_count and views_count to ProductAnalytics
        qs = qs.annotate(
            trending_score=F('analytics__views_count') + (F('analytics__purchased_count') * 5)
        ).order_by('-trending_score')[:limit]
        
        trending = list(qs)
        cache.set(cache_key, trending, timeout=900)
        
    return trending

def get_personalized_feed(user, limit=12):
    """
    Returns a personalized feed for the user based on their recently viewed items, wishlist, and past orders.
    Uses a weighted scoring model:
    - category_match: +3
    - tag_match: +1
    - rating: +rating
    - recently_viewed penalty: -5 (don't show exact same viewed items strongly, but show related)
    - in wishlist: +5
    """
    if not user or not user.is_authenticated:
        return get_trending_products(limit)
        
    recent_views = list(RecentlyViewed.objects.filter(user=user).select_related('product__category').prefetch_related('product__tags')[:20])
    wishlist_items = list(user.wishlist.items.all()) if hasattr(user, 'wishlist') else []
    past_orders = OrderItem.objects.filter(order__user=user, order__payment_status=Order.PaymentStatus.PAID).select_related('product')
    
    if not recent_views and not wishlist_items and not past_orders.exists():
        return get_trending_products(limit)
        
    categories = set()
    tags = set()
    viewed_product_ids = set([v.product_id for v in recent_views])
    wishlisted_product_ids = set([w.product_id for w in wishlist_items])
    past_product_ids = set([o.product_id for o in past_orders if o.product_id])
    
    for view in recent_views:
        categories.add(view.product.category_id)
        for tag in view.product.tags.all():
            tags.add(tag.id)
            
    for item in wishlist_items:
        categories.add(item.product.category_id)
        for tag in item.product.tags.all():
            tags.add(tag.id)
            
    # Base query
    qs = get_base_qs()
    
    # Annotate score
    # We will use Django DB functions to build the score
    qs = qs.annotate(
        cat_score=Count('category', filter=Q(category_id__in=categories)) * 3,
        tag_score=Count('tags', filter=Q(tags__in=tags)),
        wishlist_score=Count('id', filter=Q(id__in=wishlisted_product_ids)) * 5,
        rating_score=F('rating') * 1,  # Assuming rating is 0-5
        # Penalize already viewed or purchased items if we want fresh discovery
        penalty=Count('id', filter=Q(id__in=viewed_product_ids) | Q(id__in=past_product_ids)) * 5
    ).annotate(
        match_score=F('cat_score') + F('tag_score') + F('wishlist_score') + F('rating_score') - F('penalty')
    ).filter(match_score__gt=0).order_by('-match_score', '-created_at')[:limit * 2] # Fetch more for diversity filtering
    
    raw_results = list(qs)
    
    # Apply Diversity Rules
    # max 3 from same category, max 3 from same merchant
    results = []
    cat_counts = {}
    merchant_counts = {}
    
    for p in raw_results:
        c_count = cat_counts.get(p.category_id, 0)
        m_count = merchant_counts.get(p.merchant_id, 0)
        
        if c_count < 3 and m_count < 3:
            results.append(p)
            cat_counts[p.category_id] = c_count + 1
            merchant_counts[p.merchant_id] = m_count + 1
            
        if len(results) >= limit:
            break
            
    # Pad with trending if we don't have enough personalized results
    if len(results) < limit:
        trending = get_trending_products(limit)
        result_ids = {p.id for p in results}
        for t in trending:
            if len(results) >= limit:
                break
            if t.id not in result_ids:
                results.append(t)
                result_ids.add(t.id)
                
    return results

def get_related_products(product, user=None, limit=4):
    """
    Returns related products based on category and tags.
    """
    tags = product.tags.all()
    qs = get_base_qs().exclude(id=product.id)
    
    if tags.exists():
        qs = qs.filter(
            Q(tags__in=tags) | Q(category=product.category)
        ).annotate(
            tag_match_count=Count('tags', filter=Q(tags__in=tags))
        ).order_by('-tag_match_count', '-rating')
    else:
        qs = qs.filter(category=product.category).order_by('-rating')
        
    return list(qs[:limit])

def get_frequently_bought_together(product, limit=4):
    """
    Returns products that were frequently bought in the same order as the given product.
    """
    # Find orders that contain this product
    orders_with_product = OrderItem.objects.filter(product=product).values('order')
    
    if not orders_with_product.exists():
        return []
        
    # Find other products in those orders
    frequently_bought = OrderItem.objects.filter(
        order__in=orders_with_product,
        order__payment_status=Order.PaymentStatus.PAID
    ).exclude(
        product=product
    ).values('product').annotate(
        times_bought=Count('order', distinct=True)
    ).filter(times_bought__gte=1).order_by('-times_bought')[:limit]
    
    if not frequently_bought:
        return []
        
    product_ids = [item['product'] for item in frequently_bought]
    
    # Fetch the actual product objects
    qs = get_base_qs().filter(id__in=product_ids)
    
    # Sort them back by times_bought (since DB fetch loses ordering)
    products_by_id = {p.id: p for p in qs}
    sorted_products = []
    for item in frequently_bought:
        p = products_by_id.get(item['product'])
        if p:
            sorted_products.append(p)
            
    return sorted_products

def get_cart_recommendations(cart, limit=4):
    """
    Returns recommendations based on items currently in the cart.
    Aggregates frequently bought together across all cart items.
    """
    cart_items = cart.items.select_related('product').all()
    if not cart_items.exists():
        return get_trending_products(limit)
        
    cart_product_ids = [item.product_id for item in cart_items]
    
    # Find orders that contain any of the cart products
    orders_with_cart_products = OrderItem.objects.filter(product_id__in=cart_product_ids).values('order')
    
    if not orders_with_cart_products.exists():
        return get_trending_products(limit)
        
    # Find other products in those orders, excluding products already in the cart
    recommended = OrderItem.objects.filter(
        order__in=orders_with_cart_products,
        order__payment_status=Order.PaymentStatus.PAID
    ).exclude(
        product_id__in=cart_product_ids
    ).values('product').annotate(
        times_bought=Count('order', distinct=True)
    ).filter(times_bought__gte=1).order_by('-times_bought')[:limit]
    
    if not recommended:
        return get_trending_products(limit)
        
    product_ids = [item['product'] for item in recommended]
    qs = get_base_qs().filter(id__in=product_ids)
    
    products_by_id = {p.id: p for p in qs}
    sorted_products = []
    for item in recommended:
        p = products_by_id.get(item['product'])
        if p:
            sorted_products.append(p)
            
    # Pad with trending if needed
    if len(sorted_products) < limit:
        trending = get_trending_products(limit)
        for t in trending:
            if len(sorted_products) >= limit:
                break
            if t.id not in cart_product_ids and t.id not in product_ids:
                sorted_products.append(t)
                
    return sorted_products

import os
import django
from django.utils.text import slugify

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from catalog.models import Category

default_categories = [
    {"name": "Electronics & Gadgets", "description": "Smartphones, laptops, accessories, and tech gadgets."},
    {"name": "Smart TVs & Appliances", "description": "Televisions, audio systems, and home electronics."},
    {"name": "Mobile Phones & Tablets", "description": "Smartphones, tablets, cases, and chargers."},
    {"name": "Computers & Laptops", "description": "Laptops, desktops, monitors, and components."},
    {"name": "Audio & Headphones", "description": "Wireless earbuds, headphones, and Bluetooth speakers."},
    {"name": "Cameras & Photography", "description": "DSLR, action cameras, lenses, and tripods."},
    {"name": "Fashion & Apparel", "description": "Trending clothing, apparel, and fashion wear."},
    {"name": "Men's Fashion", "description": "Men's shirts, trousers, jackets, and accessories."},
    {"name": "Women's Fashion", "description": "Dresses, tops, traditional wear, and accessories."},
    {"name": "Footwear & Shoes", "description": "Sneakers, formal shoes, sports shoes, and sandals."},
    {"name": "Watches & Wearables", "description": "Smartwatches, fitness bands, and luxury watches."},
    {"name": "Home & Kitchen", "description": "Kitchenware, cookware, home decor, and appliances."},
    {"name": "Furniture & Living", "description": "Beds, sofas, tables, and home furnishings."},
    {"name": "Beauty & Personal Care", "description": "Skincare, hair care, perfumes, and cosmetics."},
    {"name": "Health & Wellness", "description": "Vitamins, fitness supplements, and personal health."},
    {"name": "Sports & Outdoors", "description": "Gym equipment, outdoor gear, camping, and sportswear."},
    {"name": "Toys & Games", "description": "Action figures, educational toys, and board games."},
    {"name": "Books & Stationery", "description": "Bestsellers, textbooks, notebooks, and office supplies."},
    {"name": "Automotive & Accessories", "description": "Car electronics, bike accessories, and maintenance tools."},
    {"name": "Grocery & Gourmet", "description": "Snacks, beverages, organic foods, and staples."},
]

created_count = 0
for cat_data in default_categories:
    name = cat_data["name"]
    slug = slugify(name)
    if not Category.objects.filter(name__iexact=name).exists() and not Category.objects.filter(slug=slug).exists():
        Category.objects.create(
            name=name,
            slug=slug,
            description=cat_data["description"],
            is_active=True
        )
        created_count += 1

print(f"Successfully seeded {created_count} default categories.")

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from catalog.models import Category

default_categories = [
    {"name": "Electronics", "description": "Gadgets, devices, and accessories."},
    {"name": "Fashion", "description": "Clothing, shoes, and apparel."},
    {"name": "Home & Kitchen", "description": "Home decor, appliances, and furniture."},
    {"name": "Beauty & Personal Care", "description": "Cosmetics, skincare, and grooming."},
    {"name": "Sports & Outdoors", "description": "Sporting goods, outdoor gear, and fitness."},
    {"name": "Toys & Games", "description": "Toys for kids of all ages and board games."},
]

created_count = 0
for cat_data in default_categories:
    cat, created = Category.objects.get_or_create(
        name=cat_data["name"],
        defaults={"description": cat_data["description"]}
    )
    if created:
        created_count += 1

print(f"Successfully seeded {created_count} default categories.")

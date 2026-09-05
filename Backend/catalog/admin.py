from django.contrib import admin
from .models import Category, Tag, Product, ProductImage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'parent', 'is_active', 'created_at')
    list_filter = ('is_active', 'parent')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('name',)


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('name',)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'merchant', 'category', 'price', 'stock_quantity', 'is_active', 'is_featured', 'created_at')
    list_filter = ('is_active', 'is_featured', 'category')
    search_fields = ('name', 'sku', 'merchant__email')
    prepopulated_fields = {'slug': ('name',)}
    autocomplete_fields = ('merchant', 'category', 'tags')
    inlines = [ProductImageInline]
    ordering = ('-created_at',)

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import Category, Tag, Product, ProductImage

User = get_user_model()


class CatalogModelTests(TestCase):
    def setUp(self):
        self.merchant = User.objects.create_user(
            email="merchant@test.com",
            password="password123",
            role=User.Role.MERCHANT,
            is_approved=True
        )
        self.category = Category.objects.create(name="Electronics")

    def test_category_slug_generation(self):
        cat1 = Category.objects.create(name="Smart Phones")
        self.assertEqual(cat1.slug, "smart-phones")
        
        # Test collision resolution
        cat2 = Category.objects.create(name="Smart Phones")
        self.assertEqual(cat2.slug, "smart-phones-1")

    def test_tag_normalization(self):
        tag1 = Tag.objects.create(name="Gaming")
        self.assertEqual(tag1.name, "gaming")
        self.assertEqual(tag1.slug, "gaming")

    def test_product_slug_generation(self):
        prod = Product.objects.create(
            merchant=self.merchant,
            category=self.category,
            name="Test Product 123",
            price=10.00,
            sku="TEST-123"
        )
        self.assertEqual(prod.slug, "test-product-123")


class CatalogAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="user@test.com", password="password123", role=User.Role.USER
        )
        self.merchant = User.objects.create_user(
            email="merchant@test.com", password="password123", role=User.Role.MERCHANT, is_approved=True
        )
        self.other_merchant = User.objects.create_user(
            email="other@test.com", password="password123", role=User.Role.MERCHANT, is_approved=True
        )
        self.category = Category.objects.create(name="Electronics")
        self.product = Product.objects.create(
            merchant=self.merchant,
            category=self.category,
            name="Merchant Product",
            price=100.00,
            sku="MERCH-001"
        )
        self.product_url = reverse('product-list')
        self.merchant_product_url = reverse('merchant-product-list')

    def test_public_can_view_products(self):
        response = self.client.get(self.product_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_user_cannot_create_product(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.merchant_product_url, {
            "name": "User Product",
            "category": self.category.id,
            "price": "50.00",
            "sku": "USER-001"
        }, format='json')
        # Users should be denied
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_merchant_can_create_product(self):
        self.client.force_authenticate(user=self.merchant)
        response = self.client.post(self.merchant_product_url, {
            "name": "New Merchant Product",
            "category": self.category.id,
            "price": "75.00",
            "sku": "NEW-001",
            "tags": ["New", "Gadget"]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 2)
        # Verify merchant was auto-assigned
        prod = Product.objects.get(sku="NEW-001")
        self.assertEqual(prod.merchant, self.merchant)
        self.assertEqual(prod.tags.count(), 2)

    def test_merchant_cannot_edit_other_product(self):
        self.client.force_authenticate(user=self.other_merchant)
        url = reverse('merchant-product-detail', kwargs={'pk': self.product.id})
        response = self.client.patch(url, {"price": "10.00"}, format='json')
        # Should be 404 Not Found since get_queryset scopes to request.user
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_merchant_can_edit_own_product(self):
        self.client.force_authenticate(user=self.merchant)
        url = reverse('merchant-product-detail', kwargs={'pk': self.product.id})
        response = self.client.patch(url, {"price": "150.00"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, 150.00)

    def test_soft_delete_product(self):
        self.client.force_authenticate(user=self.merchant)
        url = reverse('merchant-product-detail', kwargs={'pk': self.product.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.product.refresh_from_db()
        self.assertFalse(self.product.is_active)
        # Should not appear in public listing
        public_response = self.client.get(self.product_url)
        self.assertEqual(len(public_response.data['results']), 0)

    def test_validation_negative_price(self):
        self.client.force_authenticate(user=self.merchant)
        response = self.client.post(self.merchant_product_url, {
            "name": "Bad Price Product",
            "category": self.category.id,
            "price": "-10.00",
            "sku": "BAD-001"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("price", response.data.get('details', response.data))

    def test_validation_compare_at_price(self):
        self.client.force_authenticate(user=self.merchant)
        response = self.client.post(self.merchant_product_url, {
            "name": "Bad Compare Price",
            "category": self.category.id,
            "price": "100.00",
            "compare_at_price": "50.00", # Less than price
            "sku": "BAD-002"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("compare_at_price", response.data.get('details', response.data))

class CatalogTasksTests(TestCase):
    def setUp(self):
        self.merchant = User.objects.create_user(
            email="merchant2@test.com",
            password="password123",
            role=User.Role.MERCHANT,
            is_approved=True
        )
        self.category = Category.objects.create(name="Toys")
        self.product = Product.objects.create(
            merchant=self.merchant,
            category=self.category,
            name="Test Toy",
            price=10.00,
            sku="TOY-001"
        )

    def test_aggregate_merchant_analytics(self):
        from catalog.models import ProductAnalytics, MerchantAnalytics
        from catalog.tasks import aggregate_merchant_analytics
        
        ProductAnalytics.objects.update_or_create(
            product=self.product,
            defaults={
                'views_count': 100,
                'add_to_cart_count': 50,
                'checkout_started_count': 20,
                'purchased_count': 10,
                'revenue': 100.00
            }
        )
        
        count = aggregate_merchant_analytics()
        self.assertGreaterEqual(count, 1)
        
        merchant_analytics = MerchantAnalytics.objects.get(merchant=self.merchant)
        self.assertEqual(merchant_analytics.total_views, 100)
        self.assertEqual(merchant_analytics.total_add_to_cart, 50)
        self.assertEqual(merchant_analytics.total_purchased_count, 10)
        self.assertEqual(merchant_analytics.total_revenue, 100.00)


class CatalogImageAPITests(APITestCase):
    def setUp(self):
        self.merchant = User.objects.create_user(
            email="merchant@test.com", password="password123", role=User.Role.MERCHANT, is_approved=True
        )
        self.other_merchant = User.objects.create_user(
            email="other@test.com", password="password123", role=User.Role.MERCHANT, is_approved=True
        )
        self.category = Category.objects.create(name="Electronics")
        self.product = Product.objects.create(
            merchant=self.merchant,
            category=self.category,
            name="Merchant Product",
            price=100.00,
            sku="MERCH-001"
        )
        self.image_url = f'/api/v1/catalog/merchant/products/{self.product.id}/images/'

    @patch('catalog.views.upload_to_cloudinary')
    def test_upload_image_success(self, mock_upload):
        mock_upload.return_value = {
            'public_id': 'test_public_id_123',
            'secure_url': 'https://res.cloudinary.com/test.jpg'
        }
        
        self.client.force_authenticate(user=self.merchant)
        image = SimpleUploadedFile("test.jpg", b"file_content", content_type="image/jpeg")
        response = self.client.post(self.image_url, {'image': image, 'alt_text': 'Test Image'}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, f"Response: {response.data}")
        self.assertEqual(ProductImage.objects.count(), 1)
        
        img_obj = ProductImage.objects.first()
        self.assertEqual(img_obj.cloudinary_public_id, 'test_public_id_123')
        self.assertTrue(img_obj.is_primary)

    def test_upload_image_unauthorized_merchant(self):
        self.client.force_authenticate(user=self.other_merchant)
        image = SimpleUploadedFile("test.jpg", b"file_content", content_type="image/jpeg")
        response = self.client.post(self.image_url, {'image': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    @patch('catalog.views.delete_from_cloudinary')
    def test_delete_image(self, mock_delete):
        self.client.force_authenticate(user=self.merchant)
        image_obj = ProductImage.objects.create(
            product=self.product,
            cloudinary_public_id='test_id',
            image_url='https://test.com',
            is_primary=True
        )
        delete_url = f'/api/v1/catalog/merchant/products/{self.product.id}/images/{image_obj.id}/'
        
        response = self.client.delete(delete_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ProductImage.objects.count(), 0)
        mock_delete.assert_called_once_with('test_id')


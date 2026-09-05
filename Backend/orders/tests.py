from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from catalog.models import Category, Product
from .models import Cart, CartItem, Wishlist, WishlistItem

User = get_user_model()

class OrdersAPITestCase(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='user1', email='user1@example.com', password='password123')
        self.user2 = User.objects.create_user(username='user2', email='user2@example.com', password='password123')
        
        self.client1 = APIClient()
        self.client1.force_authenticate(user=self.user1)
        
        self.client2 = APIClient()
        self.client2.force_authenticate(user=self.user2)
        
        self.category = Category.objects.create(name='Electronics', slug='electronics')
        self.product1 = Product.objects.create(
            merchant=self.user1,
            category=self.category,
            name='Laptop',
            slug='laptop',
            sku='LAPTOP-001',
            description='A good laptop',
            price='1000.00',
            stock_quantity=10,
            is_active=True
        )
        self.product2 = Product.objects.create(
            merchant=self.user1,
            category=self.category,
            name='Mouse',
            slug='mouse',
            sku='MOUSE-001',
            description='A good mouse',
            price='50.00',
            stock_quantity=5,
            is_active=True
        )
        self.product_inactive = Product.objects.create(
            merchant=self.user1,
            category=self.category,
            name='Old Phone',
            slug='old-phone',
            sku='PHONE-OLD',
            description='Not available',
            price='100.00',
            stock_quantity=0,
            is_active=False
        )

    def test_add_to_cart(self):
        url = reverse('cart-item-list')
        response = self.client1.post(url, {'product_id': self.product1.id, 'quantity': 2}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        cart = Cart.objects.get(user=self.user1)
        self.assertEqual(cart.items.count(), 1)
        self.assertEqual(cart.items.first().quantity, 2)
        self.assertEqual(cart.items.first().product, self.product1)

    def test_add_duplicate_to_cart_merges_quantity(self):
        url = reverse('cart-item-list')
        self.client1.post(url, {'product_id': self.product1.id, 'quantity': 2}, format='json')
        response = self.client1.post(url, {'product_id': self.product1.id, 'quantity': 3}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cart = Cart.objects.get(user=self.user1)
        self.assertEqual(cart.items.count(), 1)
        self.assertEqual(cart.items.first().quantity, 5)



    def test_add_out_of_stock_fails(self):
        url = reverse('cart-item-list')
        response = self.client1.post(url, {'product_id': self.product2.id, 'quantity': 10}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_add_inactive_product_fails(self):
        url = reverse('cart-item-list')
        response = self.client1.post(url, {'product_id': self.product_inactive.id, 'quantity': 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_quantity(self):
        url = reverse('cart-item-list')
        self.client1.post(url, {'product_id': self.product1.id, 'quantity': 2}, format='json')
        
        cart_item = CartItem.objects.get(cart__user=self.user1)
        update_url = reverse('cart-item-detail', kwargs={'pk': cart_item.id})
        
        response = self.client1.patch(update_url, {'quantity': 4}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        cart_item.refresh_from_db()
        self.assertEqual(cart_item.quantity, 4)

    def test_idor_update_cart_item(self):
        # User 1 adds item
        url = reverse('cart-item-list')
        self.client1.post(url, {'product_id': self.product1.id, 'quantity': 2}, format='json')
        cart_item = CartItem.objects.get(cart__user=self.user1)
        
        # User 2 tries to update User 1's item
        update_url = reverse('cart-item-detail', kwargs={'pk': cart_item.id})
        response = self.client2.patch(update_url, {'quantity': 1}, format='json')
        
        # Should fail (cart item not found in User 2's cart)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        cart_item.refresh_from_db()
        self.assertEqual(cart_item.quantity, 2)

    def test_clear_cart(self):
        url = reverse('cart-item-list')
        self.client1.post(url, {'product_id': self.product1.id, 'quantity': 1}, format='json')
        self.client1.post(url, {'product_id': self.product2.id, 'quantity': 2}, format='json')
        
        clear_url = reverse('cart-clear')
        response = self.client1.delete(clear_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        cart = Cart.objects.get(user=self.user1)
        self.assertEqual(cart.items.count(), 0)

    def test_wishlist_toggle(self):
        url = reverse('wishlist-toggle')
        
        # Add
        response = self.client1.post(url, {'product_id': self.product1.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['added'])
        self.assertEqual(WishlistItem.objects.filter(wishlist__user=self.user1).count(), 1)
        
        # Remove
        response = self.client1.post(url, {'product_id': self.product1.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['added'])
        self.assertEqual(WishlistItem.objects.filter(wishlist__user=self.user1).count(), 0)

    def test_merge_guest_cart(self):
        # User 1 already has product 1
        url = reverse('cart-item-list')
        self.client1.post(url, {'product_id': self.product1.id, 'quantity': 2}, format='json')
        
        # Merge guest cart which has product 1 and product 2
        merge_url = reverse('cart-merge')
        guest_items = [
            {'product_id': self.product1.id, 'quantity': 3}, # Should merge to 5
            {'product_id': self.product2.id, 'quantity': 1}, # Should add
            {'product_id': self.product_inactive.id, 'quantity': 1} # Should remove
        ]
        
        response = self.client1.post(merge_url, {'items': guest_items}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        cart = Cart.objects.get(user=self.user1)
        self.assertEqual(cart.items.count(), 2)
        
        item1 = cart.items.get(product=self.product1)
        self.assertEqual(item1.quantity, 5)
        
        item2 = cart.items.get(product=self.product2)
        self.assertEqual(item2.quantity, 1)
        
        self.assertEqual(len(response.data['merge_summary']['removed_items']), 1)

class OrdersTasksTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='taskuser', email='taskuser@example.com', password='password123')
        from orders.models import Order
        self.order = Order.objects.create(
            user=self.user,
            order_number='ORD-12345',
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PAID,
            total_amount='100.00',
            subtotal='100.00',
            shipping_address_snapshot={}
        )

    @patch('orders.tasks.send_mail')
    def test_send_order_confirmation_email(self, mock_send_mail):
        from orders.tasks import send_order_confirmation_email
        send_order_confirmation_email(self.order.id)
        
        mock_send_mail.assert_called_once()
        args, kwargs = mock_send_mail.call_args
        self.assertIn('ORD-12345', kwargs['subject'] or args[0])
        
    @patch('orders.tasks.send_mail')
    def test_detect_abandoned_carts(self, mock_send_mail):
        from orders.tasks import detect_abandoned_carts
        from datetime import timedelta
        from django.utils import timezone
        
        # Create abandoned cart
        from catalog.models import Category, Product
        category = Category.objects.create(name='Test', slug='test')
        product = Product.objects.create(merchant=self.user, category=category, name='P', slug='p', sku='P1', price='10', stock_quantity=10)
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, product=product, quantity=1)
        
        # Manually backdate the cart's updated_at
        Cart.objects.filter(id=cart.id).update(updated_at=timezone.now() - timedelta(hours=25))
        
        count = detect_abandoned_carts()
        self.assertEqual(count, 1)
        
        cart.refresh_from_db()
        self.assertTrue(cart.abandoned_reminder_sent)
        mock_send_mail.assert_called_once()

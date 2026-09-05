import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCart, clearCart } from '../features/cart/cartSlice';
import CartItem from '../components/cart/CartItem';
import ProductGrid from '../components/catalog/ProductGrid';
import { getCartRecommendations } from '../features/cart/cartApi';
import { ShoppingBag, Trash2, Sparkles } from 'lucide-react';

export default function CartPage() {
  const dispatch = useDispatch();
  const { items, subtotal, status, itemCount } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    if (isAuthenticated && status === 'idle') {
      dispatch(fetchCart());
    }
  }, [isAuthenticated, status, dispatch]);

  useEffect(() => {
    if (items.length > 0) {
      getCartRecommendations().then(data => {
        setRecommendations(data);
      }).catch(err => console.error("Cart recommendations error:", err));
    } else {
      setRecommendations([]);
    }
  }, [items.length]);

  const handleClearCart = () => {
    if (window.confirm("Are you sure you want to clear your cart?")) {
      dispatch(clearCart());
    }
  };

  if (status === 'loading' && items.length === 0) {
    return (
      <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-16 flex justify-center">
        <p className="text-lg text-slate-500">Loading cart...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-24 text-center">
        <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-slate-100 mb-6">
          <ShoppingBag className="h-12 w-12 text-slate-400" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-4">Your cart is empty</h2>
        <p className="text-lg text-slate-500 mb-8 max-w-md mx-auto">
          Looks like you haven't added anything to your cart yet.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-12 bg-white">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-8">Shopping Cart</h1>
        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">
          <section aria-labelledby="cart-heading" className="lg:col-span-7">
            <h2 id="cart-heading" className="sr-only">
              Items in your shopping cart
            </h2>

            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-500">{itemCount} items</span>
              <button
                onClick={handleClearCart}
                className="flex items-center text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-1" /> Clear Cart
              </button>
            </div>

            <ul role="list" className="divide-y divide-slate-200 border-b border-slate-200">
              {items.map((item) => (
                <CartItem key={item.product.id} item={item} />
              ))}
            </ul>
          </section>

          {/* Order summary */}
          <section
            aria-labelledby="summary-heading"
            className="mt-12 rounded-2xl bg-slate-50/80 border border-slate-200/80 p-6 sm:p-8 lg:col-span-5 lg:mt-0 shadow-sm"
          >
            <h2 id="summary-heading" className="text-xl font-bold text-slate-900">
              Order summary
            </h2>

            <dl className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-600">Subtotal</dt>
                <dd className="text-sm font-bold text-slate-900">₹{subtotal}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <dt className="flex items-center text-sm text-slate-600">
                  <span>Shipping estimate</span>
                </dt>
                <dd className="text-sm font-medium text-emerald-600">Free over ₹499</dd>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <dt className="flex text-sm text-slate-600">
                  <span>Tax estimate</span>
                </dt>
                <dd className="text-sm font-medium text-slate-900">Included</dd>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <dt className="text-lg font-bold text-slate-900">Order total</dt>
                <dd className="text-xl font-black text-slate-900">₹{subtotal}</dd>
              </div>
            </dl>

            <div className="mt-6">
              <Link
                to="/checkout"
                className="w-full flex justify-center items-center rounded-md border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-50"
              >
                Checkout
              </Link>
            </div>
          </section>
        </div>
        
        {/* Cart Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="mt-24 pt-16 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">You Might Also Like</h2>
            </div>
            <ProductGrid products={recommendations} isLoading={false} />
          </div>
        )}
      </div>
    </div>
  );
}

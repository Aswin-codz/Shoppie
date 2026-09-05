import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentUser, setAccessToken } from './features/auth/authSlice';
import { initializeGuestCart, fetchCart } from './features/cart/cartSlice';
import { fetchWishlist } from './features/wishlist/wishlistSlice';
import { performTokenRefresh } from './api/axiosClient';
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const MerchantOrdersPage = lazy(() => import('./pages/MerchantOrdersPage'));
const MerchantSupportPage = lazy(() => import('./pages/MerchantSupportPage'));
const MerchantAddProductPage = lazy(() => import('./pages/MerchantAddProductPage'));
const MerchantProductsPage = lazy(() => import('./pages/MerchantProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AddAddressPage = lazy(() => import('./pages/AddAddressPage'));
import ProtectedRoute from './components/auth/ProtectedRoute';
import StorefrontLayout from './components/layout/StorefrontLayout';

function App() {
    const dispatch = useDispatch();
    const { isAuthenticated, isLoading } = useSelector((state) => state.auth);

    // Bootstrap: attempt to restore session from refresh token on mount
    useEffect(() => {
        const bootstrap = async () => {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                // No stored session — mark loading as complete
                dispatch(setAccessToken(null));
                dispatch({ type: 'auth/fetchCurrentUser/rejected' });
                dispatch(initializeGuestCart());
                return;
            }
            try {
                // Use performTokenRefresh to prevent race conditions with concurrent interceptors
                await performTokenRefresh();
                await dispatch(fetchCurrentUser());
                dispatch(fetchCart());
                dispatch(fetchWishlist());
            } catch {
                localStorage.removeItem('refreshToken');
                dispatch({ type: 'auth/fetchCurrentUser/rejected' });
                dispatch(initializeGuestCart());
            }
        };
        bootstrap();
    }, [dispatch]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            </div>
        }>
            <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />
            
            {/* Public Storefront Routes */}
            <Route element={<StorefrontLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/products/:slug" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccessPage /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                <Route path="/account/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
                <Route path="/address/add" element={<ProtectedRoute><AddAddressPage /></ProtectedRoute>} />
                <Route path="/merchant/orders" element={<ProtectedRoute requiredRole="MERCHANT"><MerchantOrdersPage /></ProtectedRoute>} />
                <Route path="/merchant/support" element={<ProtectedRoute requiredRole="MERCHANT"><MerchantSupportPage /></ProtectedRoute>} />
                <Route path="/merchant/products" element={<ProtectedRoute requiredRole="MERCHANT"><MerchantProductsPage /></ProtectedRoute>} />
                <Route path="/merchant/products/new" element={<ProtectedRoute requiredRole="MERCHANT"><MerchantAddProductPage /></ProtectedRoute>} />
                <Route path="/account/preferences" element={<Navigate to="/profile" replace />} />
                <Route path="/merchant/products/:slug/edit" element={<ProtectedRoute requiredRole="MERCHANT"><MerchantAddProductPage /></ProtectedRoute>} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
    );
}

export default App;

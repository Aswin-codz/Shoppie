import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import catalogReducer from '../features/catalog/catalogSlice';
import cartReducer from '../features/cart/cartSlice';
import wishlistReducer from '../features/wishlist/wishlistSlice';
import addressReducer from '../features/address/addressSlice';
import ordersReducer from '../features/orders/ordersSlice';
import notificationReducer from '../features/notifications/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    catalog: catalogReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    address: addressReducer,
    orders: ordersReducer,
    notifications: notificationReducer,
  },
});

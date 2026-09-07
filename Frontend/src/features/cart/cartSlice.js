import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as cartApi from './cartApi';

const GUEST_CART_KEY = 'shopzy_guest_cart';

// Helper to get guest cart from local storage
const getGuestCart = () => {
  try {
    const data = localStorage.getItem(GUEST_CART_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveGuestCart = (items) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

const clearGuestCart = () => {
  localStorage.removeItem(GUEST_CART_KEY);
};

// Thunks
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      return await cartApi.getCart();
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const clearCart = createAsyncThunk(
  'cart/clearCart',
  async (_, { rejectWithValue, getState }) => {
    const { auth } = getState();
    if (!auth.isAuthenticated) {
      clearGuestCart();
      return null; // Signals empty cart
    }
    try {
      await cartApi.clearCart();
      return null;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const addCartItem = createAsyncThunk(
  'cart/addCartItem',
  async ({ product, quantity }, { rejectWithValue, getState }) => {
    const { auth } = getState();
    if (!auth.isAuthenticated) {
      const items = getGuestCart();
      const existing = items.find(i => i.product.id === product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        items.push({ product, quantity });
      }
      saveGuestCart(items);
      return items;
    }
    try {
      return await cartApi.addCartItem(product.id, quantity);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateCartItem = createAsyncThunk(
  'cart/updateCartItem',
  async ({ itemId, quantity, productId }, { rejectWithValue, getState }) => {
    const { auth } = getState();
    if (!auth.isAuthenticated) {
      const items = getGuestCart();
      const existing = items.find(i => i.product.id === productId);
      if (existing) {
        existing.quantity = quantity;
        saveGuestCart(items);
      }
      return items;
    }
    try {
      return await cartApi.updateCartItem(itemId, quantity);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const removeCartItem = createAsyncThunk(
  'cart/removeCartItem',
  async ({ itemId, productId }, { rejectWithValue, getState }) => {
    const { auth } = getState();
    if (!auth.isAuthenticated) {
      let items = getGuestCart();
      items = items.filter(i => i.product.id !== productId);
      saveGuestCart(items);
      return items;
    }
    try {
      return await cartApi.removeCartItem(itemId);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const mergeGuestCart = createAsyncThunk(
  'cart/mergeGuestCart',
  async (_, { rejectWithValue }) => {
    const guestItems = getGuestCart();
    if (guestItems.length === 0) {
      return await cartApi.getCart(); // just fetch server cart
    }
    try {
      const itemsPayload = guestItems.map(i => ({
        product_id: i.product.id,
        quantity: i.quantity
      }));
      const response = await cartApi.mergeGuestCart(itemsPayload);
      clearGuestCart(); // clear after successful merge
      return response.cart; // response is { cart, merge_summary }
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Calculate totals for guest cart client-side
const calculateGuestTotals = (items) => {
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    subtotal: subtotal.toFixed(2),
    item_count: items.length,
    total_quantity: totalQuantity
  };
};

const initialState = {
  items: [],
  subtotal: "0.00",
  itemCount: 0,
  totalQuantity: 0,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    initializeGuestCart(state) {
      const items = getGuestCart();
      state.items = items;
      const totals = calculateGuestTotals(items);
      state.subtotal = totals.subtotal;
      state.itemCount = totals.item_count;
      state.totalQuantity = totals.total_quantity;
      state.status = 'succeeded';
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Cart
      .addCase(fetchCart.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.subtotal = action.payload.subtotal;
        state.itemCount = action.payload.item_count;
        state.totalQuantity = action.payload.total_quantity;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Clear Cart
      .addCase(clearCart.fulfilled, (state) => {
        state.items = [];
        state.subtotal = "0.00";
        state.itemCount = 0;
        state.totalQuantity = 0;
      })

      // Handle common fulfilled state for Cart mutation thunks
      .addMatcher(
        (action) => [addCartItem.fulfilled.type, updateCartItem.fulfilled.type, removeCartItem.fulfilled.type, mergeGuestCart.fulfilled.type].includes(action.type),
        (state, action) => {
          state.status = 'succeeded';
          if (Array.isArray(action.payload)) {
            // Guest Cart (returned array of items)
            state.items = action.payload;
            const totals = calculateGuestTotals(action.payload);
            state.subtotal = totals.subtotal;
            state.itemCount = totals.item_count;
            state.totalQuantity = totals.total_quantity;
          } else {
            // Server Cart (returned CartSerializer data)
            state.items = action.payload.items;
            state.subtotal = action.payload.subtotal;
            state.itemCount = action.payload.item_count;
            state.totalQuantity = action.payload.total_quantity;
          }
        }
      )
      // Generic pending/rejected handling for mutations
      .addMatcher(
        (action) => [addCartItem.pending.type, updateCartItem.pending.type, removeCartItem.pending.type, mergeGuestCart.pending.type].includes(action.type),
        (state) => {
          state.status = 'loading';
        }
      )
      .addMatcher(
        (action) => [addCartItem.rejected.type, updateCartItem.rejected.type, removeCartItem.rejected.type, mergeGuestCart.rejected.type].includes(action.type),
        (state, action) => {
          state.status = 'failed';
          state.error = action.payload;
        }
      );
  }
});

export const { initializeGuestCart } = cartSlice.actions;

export default cartSlice.reducer;

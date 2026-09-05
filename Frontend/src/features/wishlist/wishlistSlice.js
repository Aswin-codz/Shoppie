import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as wishlistApi from './wishlistApi';

export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async (_, { rejectWithValue, getState }) => {
    const { auth } = getState();
    if (!auth.isAuthenticated) {
      return [];
    }
    try {
      return await wishlistApi.getWishlist();
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const toggleWishlist = createAsyncThunk(
  'wishlist/toggleWishlist',
  async (product, { rejectWithValue, getState }) => {
    const { auth } = getState();
    if (!auth.isAuthenticated) {
      return rejectWithValue("Authentication required");
    }
    try {
      const response = await wishlistApi.toggleWishlist(product.id);
      return { added: response.added, product };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  items: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    clearWishlist(state) {
      state.items = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Wishlist
      .addCase(fetchWishlist.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Toggle Wishlist
      .addCase(toggleWishlist.fulfilled, (state, action) => {
        const { added, product } = action.payload;
        if (added) {
          // It was added
          if (!state.items.find(i => i.product.id === product.id)) {
            state.items.push({ id: `temp-${product.id}`, product }); // Optimistic addition
          }
        } else {
          // It was removed
          state.items = state.items.filter(i => i.product.id !== product.id);
        }
      });
  }
});

export const { clearWishlist } = wishlistSlice.actions;

export default wishlistSlice.reducer;

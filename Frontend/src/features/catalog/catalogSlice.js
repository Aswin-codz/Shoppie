import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as catalogApi from './catalogApi';

// Thunks
export const fetchProducts = createAsyncThunk(
  'catalog/fetchProducts',
  async (params, { rejectWithValue }) => {
    try {
      const response = await catalogApi.getProducts(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchMoreProducts = createAsyncThunk(
  'catalog/fetchMoreProducts',
  async (params, { rejectWithValue }) => {
    try {
      const response = await catalogApi.getProducts(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchProductDetail = createAsyncThunk(
  'catalog/fetchProductDetail',
  async (slug, { rejectWithValue }) => {
    try {
      const response = await catalogApi.getProduct(slug);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchRelatedProducts = createAsyncThunk(
  'catalog/fetchRelatedProducts',
  async (slug, { rejectWithValue }) => {
    try {
      const response = await catalogApi.getRelatedProducts(slug);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const trackProductEvent = createAsyncThunk(
  'catalog/trackProductEvent',
  async ({ slug, eventType }, { rejectWithValue }) => {
    try {
      return await catalogApi.trackProductEvent(slug, eventType);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'catalog/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await catalogApi.getCategories();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Image Thunks
export const uploadProductImage = createAsyncThunk(
  'catalog/uploadProductImage',
  async ({ productId, formData, onUploadProgress }, { rejectWithValue }) => {
    try {
      return await catalogApi.uploadProductImage(productId, formData, onUploadProgress);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteProductImage = createAsyncThunk(
  'catalog/deleteProductImage',
  async ({ productId, imageId }, { rejectWithValue }) => {
    try {
      await catalogApi.deleteProductImage(productId, imageId);
      return imageId;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const reorderProductImages = createAsyncThunk(
  'catalog/reorderProductImages',
  async ({ productId, imageIds }, { rejectWithValue }) => {
    try {
      return await catalogApi.reorderProductImages(productId, imageIds);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const setPrimaryProductImage = createAsyncThunk(
  'catalog/setPrimaryProductImage',
  async ({ productId, imageId }, { rejectWithValue }) => {
    try {
      return await catalogApi.setPrimaryProductImage(productId, imageId);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Initial State
const initialState = {
  products: [],
  selectedProduct: null,
  relatedProducts: [],
  categories: [],
  recentlyViewed: JSON.parse(localStorage.getItem('recentlyViewed')) || [],
  pagination: {
    count: 0,
    next: null,
    previous: null,
  },
  didYouMean: null,
  fallbackProducts: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// Slice
const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },
    addRecentlyViewed: (state, action) => {
      const product = action.payload;
      if (!product || !product.id) return;
      
      // Remove if exists
      state.recentlyViewed = state.recentlyViewed.filter(p => p.id !== product.id);
      
      // Add to front
      state.recentlyViewed.unshift({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        compare_at_price: product.compare_at_price,
        images: product.images
      });
      
      // Limit to 20
      if (state.recentlyViewed.length > 20) {
        state.recentlyViewed = state.recentlyViewed.slice(0, 20);
      }
      
      localStorage.setItem('recentlyViewed', JSON.stringify(state.recentlyViewed));
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Handle paginated response
        if (action.payload.results) {
          state.products = action.payload.results;
          state.pagination = {
            count: action.payload.count,
            next: action.payload.next,
            previous: action.payload.previous,
          };
          state.didYouMean = action.payload.did_you_mean || null;
          state.fallbackProducts = action.payload.fallback || [];
        } else {
          // Fallback if pagination is turned off
          state.products = action.payload;
        }
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch More Products (Infinite Scroll)
      .addCase(fetchMoreProducts.fulfilled, (state, action) => {
        if (action.payload.results) {
          const existingIds = new Set(state.products.map(p => p.id));
          const newItems = action.payload.results.filter(p => !existingIds.has(p.id));
          state.products.push(...newItems);
          state.pagination = {
            count: action.payload.count,
            next: action.payload.next,
            previous: action.payload.previous,
          };
        }
      })
      // Fetch Product Detail
      .addCase(fetchProductDetail.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProductDetail.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProductDetail.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch Related Products
      .addCase(fetchRelatedProducts.fulfilled, (state, action) => {
        state.relatedProducts = action.payload;
      })
      // Fetch Categories
      .addCase(fetchCategories.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.categories = action.payload.results || action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Image Management Mutations
      .addCase(uploadProductImage.fulfilled, (state, action) => {
        if (state.selectedProduct) {
          state.selectedProduct.images.push(action.payload);
        }
      })
      .addCase(deleteProductImage.fulfilled, (state, action) => {
        if (state.selectedProduct) {
          state.selectedProduct.images = state.selectedProduct.images.filter(img => img.id !== action.payload);
          // Update primary if it was deleted (the API handles this automatically, but UI needs to refetch to get new primary, 
          // or we just remove it and wait for refetch. To be perfectly consistent, a refetch of product detail is recommended if primary was deleted, 
          // but we will do simple removal here and let component refetch if needed).
        }
      })
      .addCase(reorderProductImages.fulfilled, (state, action) => {
        if (state.selectedProduct) {
          state.selectedProduct.images = action.payload;
        }
      })
      .addCase(setPrimaryProductImage.fulfilled, (state, action) => {
        if (state.selectedProduct) {
          state.selectedProduct.images = state.selectedProduct.images.map(img => {
            if (img.id === action.payload.id) return action.payload;
            return { ...img, is_primary: false };
          });
        }
      });
  },
});

export const { clearSelectedProduct, addRecentlyViewed } = catalogSlice.actions;
export default catalogSlice.reducer;

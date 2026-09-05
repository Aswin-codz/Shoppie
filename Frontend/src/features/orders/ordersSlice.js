import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ordersApi } from './ordersApi';

export const fetchOrders = createAsyncThunk('orders/fetchAll', async (_, { rejectWithValue }) => {
    try {
        const response = await ordersApi.getOrders();
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data || 'Failed to fetch orders');
    }
});

export const fetchOrderById = createAsyncThunk('orders/fetchById', async (id, { rejectWithValue }) => {
    try {
        const response = await ordersApi.getOrderById(id);
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data || 'Failed to fetch order');
    }
});

export const fetchMerchantOrders = createAsyncThunk('orders/fetchMerchant', async (_, { rejectWithValue }) => {
    try {
        const response = await ordersApi.getMerchantOrders();
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data || 'Failed to fetch merchant orders');
    }
});

const ordersSlice = createSlice({
    name: 'orders',
    initialState: {
        orders: [],
        merchantOrders: [],
        currentOrder: null,
        loading: false,
        error: null,
    },
    reducers: {
        clearOrders: (state) => {
            state.orders = [];
            state.merchantOrders = [];
            state.currentOrder = null;
            state.loading = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchOrders.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOrders.fulfilled, (state, action) => {
                state.loading = false;
                state.orders = Array.isArray(action.payload) ? action.payload : (action.payload?.results || []);
            })
            .addCase(fetchOrders.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchOrderById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOrderById.fulfilled, (state, action) => {
                state.loading = false;
                state.currentOrder = action.payload;
            })
            .addCase(fetchOrderById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchMerchantOrders.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMerchantOrders.fulfilled, (state, action) => {
                state.loading = false;
                state.merchantOrders = Array.isArray(action.payload) ? action.payload : (action.payload?.results || []);
            })
            .addCase(fetchMerchantOrders.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export const { clearOrders } = ordersSlice.actions;
export default ordersSlice.reducer;

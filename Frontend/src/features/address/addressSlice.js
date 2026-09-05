import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { addressApi } from './addressApi';

export const fetchAddresses = createAsyncThunk('address/fetchAll', async (_, { rejectWithValue }) => {
    try {
        const response = await addressApi.getAddresses();
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data || 'Failed to fetch addresses');
    }
});

export const createAddress = createAsyncThunk('address/create', async (data, { rejectWithValue }) => {
    try {
        const response = await addressApi.createAddress(data);
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data || 'Failed to create address');
    }
});

export const updateAddress = createAsyncThunk('address/update', async ({ id, data }, { rejectWithValue }) => {
    try {
        const response = await addressApi.updateAddress(id, data);
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data || 'Failed to update address');
    }
});

export const deleteAddress = createAsyncThunk('address/delete', async (id, { rejectWithValue }) => {
    try {
        await addressApi.deleteAddress(id);
        return id;
    } catch (err) {
        return rejectWithValue(err.response?.data || 'Failed to delete address');
    }
});

const addressSlice = createSlice({
    name: 'address',
    initialState: {
        addresses: [],
        loading: false,
        error: null,
    },
    reducers: {
        clearAddresses: (state) => {
            state.addresses = [];
            state.loading = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAddresses.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAddresses.fulfilled, (state, action) => {
                state.loading = false;
                state.addresses = Array.isArray(action.payload) ? action.payload : (action.payload?.results || []);
            })
            .addCase(fetchAddresses.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                if (!Array.isArray(state.addresses)) state.addresses = [];
            })
            .addCase(createAddress.fulfilled, (state, action) => {
                if (!Array.isArray(state.addresses)) state.addresses = [];
                if (action.payload.is_default) {
                    state.addresses.forEach(a => a.is_default = false);
                }
                state.addresses.unshift(action.payload);
                // maintain sort order where default is first
                state.addresses.sort((a, b) => (b.is_default === true) - (a.is_default === true));
            })
            .addCase(updateAddress.fulfilled, (state, action) => {
                if (action.payload.is_default) {
                    state.addresses.forEach(a => a.is_default = false);
                }
                const index = state.addresses.findIndex(a => a.id === action.payload.id);
                if (index !== -1) {
                    state.addresses[index] = action.payload;
                }
                state.addresses.sort((a, b) => (b.is_default === true) - (a.is_default === true));
            })
            .addCase(deleteAddress.fulfilled, (state, action) => {
                state.addresses = state.addresses.filter(a => a.id !== action.payload);
            });
    }
});

export const { clearAddresses } = addressSlice.actions;
export default addressSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationApi } from './notificationApi';

export const fetchNotifications = createAsyncThunk(
    'notifications/fetchNotifications',
    async (_, { rejectWithValue }) => {
        try {
            return await notificationApi.getNotifications();
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchUnreadCount = createAsyncThunk(
    'notifications/fetchUnreadCount',
    async (_, { rejectWithValue }) => {
        try {
            return await notificationApi.getUnreadCount();
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const markNotificationRead = createAsyncThunk(
    'notifications/markNotificationRead',
    async (id, { rejectWithValue }) => {
        try {
            await notificationApi.markRead(id);
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const markAllNotificationsRead = createAsyncThunk(
    'notifications/markAllNotificationsRead',
    async (_, { rejectWithValue }) => {
        try {
            await notificationApi.markAllRead();
            return true;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchPreferences = createAsyncThunk(
    'notifications/fetchPreferences',
    async (_, { rejectWithValue }) => {
        try {
            return await notificationApi.getPreferences();
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updatePreferences = createAsyncThunk(
    'notifications/updatePreferences',
    async (data, { rejectWithValue }) => {
        try {
            return await notificationApi.updatePreferences(data);
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const initialState = {
    items: [],
    unreadCount: 0,
    preferences: null,
    loading: false,
    error: null,
};

const notificationSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.loading = false;
                state.items = Array.isArray(action.payload)
                    ? action.payload
                    : (action.payload?.results || []);
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchUnreadCount.fulfilled, (state, action) => {
                state.unreadCount = action.payload.unread_count;
            })
            .addCase(markNotificationRead.fulfilled, (state, action) => {
                const id = action.payload;
                const notif = state.items.find(n => n.id === id);
                if (notif && !notif.is_read) {
                    notif.is_read = true;
                    if (state.unreadCount > 0) state.unreadCount -= 1;
                }
            })
            .addCase(markAllNotificationsRead.fulfilled, (state) => {
                state.items.forEach(n => { n.is_read = true; });
                state.unreadCount = 0;
            })
            .addCase(fetchPreferences.fulfilled, (state, action) => {
                state.preferences = action.payload;
            })
            .addCase(updatePreferences.fulfilled, (state, action) => {
                state.preferences = action.payload;
            });
    },
});

export default notificationSlice.reducer;

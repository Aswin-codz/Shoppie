import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from './authApi';

// --- Async Thunks ---

export const registerUser = createAsyncThunk(
    'auth/register',
    async (data, { dispatch, rejectWithValue }) => {
        try {
            const response = await authApi.register(data);
            localStorage.setItem('refreshToken', response.tokens.refresh);
            dispatch(setAccessToken(response.tokens.access));
            return response;
        } catch (error) {
            return rejectWithValue(
                error.response?.data || { detail: 'Registration failed.' }
            );
        }
    }
);

export const loginUser = createAsyncThunk(
    'auth/login',
    async (credentials, { dispatch, rejectWithValue }) => {
        try {
            const tokenData = await authApi.login(credentials);
            localStorage.setItem('refreshToken', tokenData.refresh);
            dispatch(setAccessToken(tokenData.access));
            // Fetch user profile with the new access token
            const user = await authApi.getMe();
            return { tokens: tokenData, user };
        } catch (error) {
            return rejectWithValue(
                error.response?.data || { detail: 'Invalid email or password.' }
            );
        }
    }
);

export const fetchCurrentUser = createAsyncThunk(
    'auth/fetchCurrentUser',
    async (_, { rejectWithValue }) => {
        try {
            const user = await authApi.getMe();
            return user;
        } catch (error) {
            return rejectWithValue(
                error.response?.data || { detail: 'Failed to fetch user.' }
            );
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logout',
    async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                await authApi.logout(refreshToken);
            }
        } catch {
            // Logout should succeed from the frontend perspective even if
            // the backend call fails (e.g., token already expired).
        } finally {
            localStorage.removeItem('refreshToken');
        }
    }
);

// --- Slice ---

const initialState = {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true, // Start true to prevent flash of unauthenticated content
    error: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setAccessToken: (state, action) => {
            state.accessToken = action.payload;
        },
        clearAuth: (state) => {
            state.user = null;
            state.accessToken = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
            localStorage.removeItem('refreshToken');
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Register
        builder
            .addCase(registerUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.accessToken = action.payload.tokens.access;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });

        // Login
        builder
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.accessToken = action.payload.tokens.access;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });

        // Fetch current user (bootstrap)
        builder
            .addCase(fetchCurrentUser.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchCurrentUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload;
            })
            .addCase(fetchCurrentUser.rejected, (state) => {
                state.isLoading = false;
                state.isAuthenticated = false;
                state.user = null;
                state.accessToken = null;
            });

        // Logout
        builder
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null;
                state.accessToken = null;
                state.isAuthenticated = false;
                state.isLoading = false;
                state.error = null;
            });
    },
});

export const { setAccessToken, clearAuth, clearError } = authSlice.actions;
export default authSlice.reducer;

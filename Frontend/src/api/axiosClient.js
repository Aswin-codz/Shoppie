import axios from 'axios';
import { store } from '../app/store';
import { setAccessToken, clearAuth } from '../features/auth/authSlice';
import toast from 'react-hot-toast';

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Request Interceptor: attach access token ---
axiosClient.interceptors.request.use(
    (config) => {
        const state = store.getState();
        const token = state.auth.accessToken;
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (config.data instanceof FormData && config.headers) {
            delete config.headers['Content-Type'];
            delete config.headers['content-type'];
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// --- Mutex-locked Token Refresh Queue ---

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

/**
 * Perform a thread-safe / race-condition-safe token refresh.
 * Reuses the single in-flight refresh promise if a refresh is already occurring.
 */
export const performTokenRefresh = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        store.dispatch(clearAuth());
        throw new Error('No refresh token available');
    }

    if (isRefreshing) {
        return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
        });
    }

    isRefreshing = true;

    try {
        const response = await axios.post(
            `${axiosClient.defaults.baseURL}/auth/token/refresh/`,
            { refresh: refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccessToken = response.data.access;
        store.dispatch(setAccessToken(newAccessToken));

        if (response.data.refresh) {
            localStorage.setItem('refreshToken', response.data.refresh);
        }

        processQueue(null, newAccessToken);
        return newAccessToken;
    } catch (error) {
        processQueue(error, null);
        store.dispatch(clearAuth());
        throw error;
    } finally {
        isRefreshing = false;
    }
};

// --- Response Interceptor: handle 401 with mutex-locked refresh ---

axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status !== 401 ||
            originalRequest._retry ||
            originalRequest.url?.includes('/auth/token/')
        ) {
            // General Error Handling
            if (error.response) {
                // The request was made and the server responded with a status code
                const status = error.response.status;
                const data = error.response.data || {};
                
                // If it's our standardized JSON response, use it
                const errorMessage = data.message || "An unexpected error occurred.";

                if (status === 403) {
                    toast.error(errorMessage || "You don't have permission to perform this action.");
                } else if (status === 404) {
                    // toast.error("The requested resource was not found."); // Often annoying for routine 404s, so keeping it silent or handled by specific components
                } else if (status === 429) {
                    toast.error(errorMessage || "Too many requests. Please try again later.");
                } else if (status >= 500) {
                    toast.error("Server error. We are working on it.");
                }
            } else if (error.request) {
                // The request was made but no response was received
                toast.error("Network error. Please check your connection.");
            } else {
                // Something happened in setting up the request that triggered an Error
                toast.error("An unexpected error occurred.");
            }
            
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            const newAccessToken = await performTokenRefresh();
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axiosClient(originalRequest);
        } catch (refreshError) {
            toast.error("Your session has expired. Please log in again.");
            return Promise.reject(refreshError);
        }
    }
);

export default axiosClient;

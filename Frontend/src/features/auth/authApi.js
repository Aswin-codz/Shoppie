import axiosClient from '../../api/axiosClient';

const AUTH_BASE = '/auth';

export const authApi = {
    register: async (data) => {
        const response = await axiosClient.post(`${AUTH_BASE}/register/`, data);
        return response.data;
    },

    login: async (credentials) => {
        const response = await axiosClient.post(`${AUTH_BASE}/token/`, credentials);
        return response.data;
    },

    getMe: async () => {
        const response = await axiosClient.get(`${AUTH_BASE}/me/`);
        return response.data;
    },

    updateMe: async (data) => {
        const response = await axiosClient.patch(`${AUTH_BASE}/me/`, data);
        return response.data;
    },

    logout: async (refreshToken) => {
        const response = await axiosClient.post(`${AUTH_BASE}/logout/`, {
            refresh: refreshToken,
        });
        return response.data;
    },

    refreshToken: async (refreshToken) => {
        const response = await axiosClient.post(`${AUTH_BASE}/token/refresh/`, {
            refresh: refreshToken,
        });
        return response.data;
    },
};

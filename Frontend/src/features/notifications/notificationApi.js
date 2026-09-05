import axiosClient from '../../api/axiosClient';

const BASE_URL = '/accounts';

export const notificationApi = {
    getNotifications: async () => {
        const response = await axiosClient.get(`${BASE_URL}/notifications/`);
        return response.data;
    },
    getUnreadCount: async () => {
        const response = await axiosClient.get(`${BASE_URL}/notifications/unread_count/`);
        return response.data;
    },
    markRead: async (id) => {
        const response = await axiosClient.post(`${BASE_URL}/notifications/${id}/mark_read/`);
        return response.data;
    },
    markAllRead: async () => {
        const response = await axiosClient.post(`${BASE_URL}/notifications/mark_all_read/`);
        return response.data;
    },
    getPreferences: async () => {
        const response = await axiosClient.get(`${BASE_URL}/notification-preferences/`);
        return response.data;
    },
    updatePreferences: async (data) => {
        const response = await axiosClient.put(`${BASE_URL}/notification-preferences/`, data);
        return response.data;
    },
};

import axiosClient from './axiosClient';

export const healthApi = {
    checkHealth: async () => {
        const response = await axiosClient.get('/health/');
        return response.data;
    },
};

import axiosClient from '../../api/axiosClient';

const BASE_URL = '/catalog';

export const recentlyViewedApi = {
    getRecentlyViewed: async () => {
        const response = await axiosClient.get(`${BASE_URL}/recently-viewed/`);
        return response.data;
    },
};

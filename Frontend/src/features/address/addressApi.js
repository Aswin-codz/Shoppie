import axiosClient from '../../api/axiosClient';

export const addressApi = {
    getAddresses: () => axiosClient.get('/accounts/addresses/'),
    createAddress: (data) => axiosClient.post('/accounts/addresses/', data),
    updateAddress: (id, data) => axiosClient.patch(`/accounts/addresses/${id}/`, data),
    deleteAddress: (id) => axiosClient.delete(`/accounts/addresses/${id}/`),
};

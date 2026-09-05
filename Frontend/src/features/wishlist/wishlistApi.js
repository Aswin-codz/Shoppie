import axiosClient from '../../api/axiosClient';

const ORDERS_URL = '/orders';

export const getWishlist = async () => {
  const response = await axiosClient.get(`${ORDERS_URL}/wishlist/`);
  return response.data;
};

export const toggleWishlist = async (productId) => {
  const response = await axiosClient.post(`${ORDERS_URL}/wishlist/toggle/`, { product_id: productId });
  return response.data;
};

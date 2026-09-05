import axiosClient from '../../api/axiosClient';

const ORDERS_URL = '/orders';

export const getCart = async () => {
  const response = await axiosClient.get(`${ORDERS_URL}/cart/`);
  return response.data;
};

export const clearCart = async () => {
  const response = await axiosClient.delete(`${ORDERS_URL}/cart/clear/`);
  return response.data;
};

export const getCartRecommendations = async () => {
  const response = await axiosClient.get(`${ORDERS_URL}/cart/recommendations/`);
  return response.data;
};

export const addCartItem = async (productId, quantity) => {
  const response = await axiosClient.post(`${ORDERS_URL}/cart/items/`, { product_id: productId, quantity });
  return response.data;
};

export const updateCartItem = async (itemId, quantity) => {
  const response = await axiosClient.patch(`${ORDERS_URL}/cart/items/${itemId}/`, { quantity });
  return response.data;
};

export const removeCartItem = async (itemId) => {
  const response = await axiosClient.delete(`${ORDERS_URL}/cart/items/${itemId}/`);
  return response.data;
};

export const mergeGuestCart = async (items) => {
  const response = await axiosClient.post(`${ORDERS_URL}/cart/merge/`, { items });
  return response.data;
};

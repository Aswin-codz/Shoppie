import axiosClient from '../../api/axiosClient';

const CATALOG_URL = '/catalog';

export const getCategories = async () => {
  const response = await axiosClient.get(`${CATALOG_URL}/categories/`);
  return response.data;
};

export const getCategory = async (slug) => {
  const response = await axiosClient.get(`${CATALOG_URL}/categories/${slug}/`);
  return response.data;
};

export const getTags = async () => {
  const response = await axiosClient.get(`${CATALOG_URL}/tags/`);
  return response.data;
};

export const getProducts = async (params = {}) => {
  // params could include: search, category, tags, min_price, max_price, ordering, page
  const response = await axiosClient.get(`${CATALOG_URL}/products/`, { params });
  return response.data;
};

export const getHomepageProducts = async () => {
  const response = await axiosClient.get(`${CATALOG_URL}/products/homepage/`);
  return response.data;
};

export const getProduct = async (slug) => {
  const response = await axiosClient.get(`${CATALOG_URL}/products/${slug}/`);
  return response.data;
};

export const getRelatedProducts = async (slug) => {
  const response = await axiosClient.get(`${CATALOG_URL}/products/${slug}/related/`);
  return response.data;
};

export const trackProductEvent = async (slug, eventType) => {
  const response = await axiosClient.post(`${CATALOG_URL}/products/${slug}/track_event/`, { event_type: eventType });
  return response.data;
};

export const getPersonalizedFeed = async () => {
  const response = await axiosClient.get(`${CATALOG_URL}/products/personalized_feed/`);
  return response.data;
};

export const getFrequentlyBoughtTogether = async (slug) => {
  const response = await axiosClient.get(`${CATALOG_URL}/products/${slug}/frequently_bought_together/`);
  return response.data;
};

export const getSearchSuggestions = async (query) => {
  const response = await axiosClient.get(`${CATALOG_URL}/products/search_suggestions/`, { params: { q: query } });
  return response.data;
};

export const getSearchHistory = async () => {
  const response = await axiosClient.get(`${CATALOG_URL}/products/search_history/`);
  return response.data;
};

// Merchant specific endpoints

export const getMerchantProducts = async (params = {}) => {
  const response = await axiosClient.get(`${CATALOG_URL}/merchant/products/`, { params });
  return response.data;
};

export const getMerchantAnalytics = async () => {
  const response = await axiosClient.get(`${CATALOG_URL}/merchant/products/analytics/`);
  return response.data;
};

export const createMerchantProduct = async (productData) => {
  const response = await axiosClient.post(`${CATALOG_URL}/merchant/products/`, productData);
  return response.data;
};

export const updateMerchantProduct = async (id, productData) => {
  const response = await axiosClient.patch(`${CATALOG_URL}/merchant/products/${id}/`, productData);
  return response.data;
};

export const deleteMerchantProduct = async (id) => {
  const response = await axiosClient.delete(`${CATALOG_URL}/merchant/products/${id}/`);
  return response.data;
};

// Image endpoints
export const uploadProductImage = async (productId, formData, onUploadProgress) => {
  const response = await axiosClient.post(`${CATALOG_URL}/merchant/products/${productId}/images/`, formData, {
    onUploadProgress
  });
  return response.data;
};

export const deleteProductImage = async (productId, imageId) => {
  const response = await axiosClient.delete(`${CATALOG_URL}/merchant/products/${productId}/images/${imageId}/`);
  return response.data;
};

export const reorderProductImages = async (productId, imageIds) => {
  const response = await axiosClient.patch(`${CATALOG_URL}/merchant/products/${productId}/images/reorder/`, { image_ids: imageIds });
  return response.data;
};

export const setPrimaryProductImage = async (productId, imageId) => {
  const response = await axiosClient.post(`${CATALOG_URL}/merchant/products/${productId}/images/${imageId}/set-primary/`);
  return response.data;
};

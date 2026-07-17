import api from './axios';

export const getProducts = (params) => api.get('/products', { params });
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const bulkCreateProducts = (data) => api.post('/products/bulk', data);
export const bulkDeleteProducts = (ids) => api.delete('/products/bulk', { data: { ids } });
export const getLowStock = (threshold) => api.get('/products/low-stock', { params: { threshold } });

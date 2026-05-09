import axios from 'axios';

const API = axios.create({ baseURL: 'http://127.0.0.1:5000/api' });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');
export const changePassword = (data) => API.post('/auth/change-password', data);

export const getDocuments = () => API.get('/documents/');
export const uploadDocument = (formData, policy) =>
  API.post(`/documents/upload?policy=${encodeURIComponent(policy)}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
export const downloadDocument = (id) =>
  API.get(`/documents/download/${id}`, { responseType: 'blob' });
export const deleteDocument = (id) => API.delete(`/documents/${id}`);

export const getUsers = () => API.get('/admin/users');
export const createUser = (data) => API.post('/admin/users', data);
export const updateAttributes = (id, data) => API.put(`/admin/users/${id}/attributes`, data);
export const deleteUser = (id) => API.delete(`/admin/users/${id}`);
export const getStats = () => API.get('/admin/stats');

export default API;

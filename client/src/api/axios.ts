import axios from 'axios';
import { message } from 'antd';

const instance = axios.create({
  baseURL: (import.meta as any).env.VITE_API_BASE || 'https://pharmacymanagement-skkk.onrender.com',
});

instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

instance.interceptors.response.use(res => res, err => {
  const msg = err?.response?.data?.message || 'Server error';
  message.error(msg);
  return Promise.reject(err);
});

export default instance;

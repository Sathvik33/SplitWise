import api from './axios';
import { User } from '../types';

export const authApi = {
  signup: async (data: any) => {
    const res = await api.post('/api/auth/signup', data);
    return res.data;
  },
  login: async (data: any) => {
    const res = await api.post('/api/auth/login', data);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get<User>('/api/auth/me');
    return res.data;
  },
};

import api from './axios';
import { GlobalDashboard } from '../types';

export const dashboardApi = {
  getDashboard: async () => {
    const res = await api.get<GlobalDashboard>('/api/dashboard');
    return res.data;
  },
};

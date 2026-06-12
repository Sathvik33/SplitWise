import api from './axios';
import { Payment } from '../types';

export const paymentsApi = {
  listGroupPayments: async (groupId: string) => {
    const res = await api.get<Payment[]>(`/api/groups/${groupId}/payments`);
    return res.data;
  },
  createPayment: async (groupId: string, data: any) => {
    const res = await api.post<Payment>(`/api/groups/${groupId}/payments`, data);
    return res.data;
  },
};

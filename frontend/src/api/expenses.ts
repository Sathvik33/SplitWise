import api from './axios';
import { Expense, Message } from '../types';

export const expensesApi = {
  listGroupExpenses: async (groupId: string) => {
    const res = await api.get<Expense[]>(`/api/groups/${groupId}/expenses`);
    return res.data;
  },
  createExpense: async (groupId: string, data: any) => {
    const res = await api.post<Expense>(`/api/groups/${groupId}/expenses`, data);
    return res.data;
  },
  getExpense: async (id: string) => {
    const res = await api.get<Expense>(`/api/expenses/${id}`);
    return res.data;
  },
  listMessages: async (id: string) => {
    const res = await api.get<Message[]>(`/api/expenses/${id}/messages`);
    return res.data;
  },
  sendMessage: async (id: string, content: string) => {
    const res = await api.post<Message>(`/api/expenses/${id}/messages`, { content });
    return res.data;
  },
};

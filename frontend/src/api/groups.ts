import api from './axios';
import { Group, BalanceEntry } from '../types';

export const groupsApi = {
  listGroups: async () => {
    const res = await api.get<Group[]>('/api/groups');
    return res.data;
  },
  createGroup: async (data: { name: string; member_emails: string[] }) => {
    const res = await api.post<Group>('/api/groups', data);
    return res.data;
  },
  getGroup: async (id: string) => {
    const res = await api.get<Group>(`/api/groups/${id}`);
    return res.data;
  },
  addMember: async (id: string, email: string) => {
    const res = await api.post(`/api/groups/${id}/members`, { email });
    return res.data;
  },
  getBalances: async (id: string) => {
    const res = await api.get<BalanceEntry[]>(`/api/groups/${id}/balances`);
    return res.data;
  },
  updateGroup: async (id: string, name: string) => {
    const res = await api.put<Group>(`/api/groups/${id}`, { name });
    return res.data;
  },
  uploadPhoto: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<Group>(`/api/groups/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  deleteGroup: async (id: string) => {
    await api.delete(`/api/groups/${id}`);
  },
};

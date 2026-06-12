import React, { useState } from 'react';
import { GroupMember } from '../types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../api/payments';
import { useAuth } from '../hooks/useAuth';

interface SettleUpModalProps {
  groupId: string;
  members: GroupMember[];
  onClose: () => void;
}

export default function SettleUpModal({ groupId, members, onClose }: SettleUpModalProps) {
  const { user } = useAuth();
  const [paidTo, setPaidTo] = useState('');
  const [amount, setAmount] = useState('');
  const queryClient = useQueryClient();

  const createPayment = useMutation({
    mutationFn: (data: any) => paymentsApi.createPayment(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId, 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPayment.mutate({
      paid_by: user?.id,
      paid_to: paidTo,
      amount: parseFloat(amount)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">Settle Up</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4 text-lg">
            <span>You</span>
            <span>paid</span>
            <select value={paidTo} onChange={e => setPaidTo(e.target.value)} required className="flex-1 rounded border px-2 py-1">
              <option value="">Select person</option>
              {members.filter(m => m.user_id !== user?.id).map(m => (
                <option key={m.user_id} value={m.user_id}>{m.user.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-center py-4 text-4xl">
            <span className="mr-2">₹</span>
            <input 
              type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} 
              placeholder="0.00" required className="w-32 border-b-2 text-center outline-none"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="flex-1 rounded border py-2 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={createPayment.isPending} className="flex-1 rounded bg-green-600 py-2 text-white hover:bg-green-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

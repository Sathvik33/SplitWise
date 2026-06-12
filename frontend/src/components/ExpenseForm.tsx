import React, { useState } from 'react';
import { GroupMember } from '../types';
import SplitCalculator from './SplitCalculator';
import { useGroupExpenses } from '../hooks/useExpenses';

interface ExpenseFormProps {
  groupId: string;
  members: GroupMember[];
  onClose: () => void;
}

export default function ExpenseForm({ groupId, members, onClose }: ExpenseFormProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(members[0]?.user_id || '');
  const [splitType, setSplitType] = useState<'equal' | 'unequal' | 'percentage' | 'share'>('equal');
  const [splitValues, setSplitValues] = useState<Record<string, number>>({});
  const [error, setError] = useState('');

  const { createExpenseMutation } = useGroupExpenses(groupId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    
    let splits: any[] = [];
    if (splitType === 'equal') {
      splits = members.map(m => ({ user_id: m.user_id }));
    } else if (splitType === 'unequal') {
      const sum = Object.values(splitValues).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - parsedAmount) > 0.01) {
        setError("Splits do not sum to the total amount"); return;
      }
      splits = Object.entries(splitValues).map(([k, v]) => ({ user_id: k, amount_owed: v }));
    } else if (splitType === 'percentage') {
      const sum = Object.values(splitValues).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.01) {
        setError("Percentages must sum to 100"); return;
      }
      splits = Object.entries(splitValues).map(([k, v]) => ({ user_id: k, percentage: v }));
    } else if (splitType === 'share') {
      const sum = Object.values(splitValues).reduce((a, b) => a + b, 0);
      if (sum === 0) {
        setError("Total shares must be > 0"); return;
      }
      splits = Object.entries(splitValues).map(([k, v]) => ({ user_id: k, shares: v }));
    }

    createExpenseMutation.mutate({
      title,
      amount: parsedAmount,
      paid_by: paidBy,
      split_type: splitType,
      splits
    }, {
      onSuccess: () => onClose(),
      onError: (err: any) => setError(err.response?.data?.detail || "Failed to create expense")
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">Add an Expense</h2>
        {error && <div className="mb-4 text-sm text-red-500">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Description" required className="w-full rounded border px-3 py-2"
          />
          <div className="flex gap-2">
            <span className="flex items-center rounded border bg-gray-50 px-3">₹</span>
            <input
              type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" required className="w-full rounded border px-3 py-2"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span>Paid by</span>
            <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="rounded border px-2 py-1">
              {members.map(m => <option key={m.user_id} value={m.user_id}>{m.user.name}</option>)}
            </select>
          </div>

          <div className="flex gap-2 rounded bg-gray-100 p-1">
            {['equal', 'unequal', 'percentage', 'share'].map(type => (
              <button
                key={type} type="button" onClick={() => setSplitType(type as any)}
                className={`flex-1 rounded py-1 text-sm capitalize ${splitType === type ? 'bg-white font-bold shadow' : ''}`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="max-h-48 overflow-y-auto">
            <SplitCalculator 
              amount={parseFloat(amount) || 0} splitType={splitType} 
              members={members} splitValues={splitValues} onSplitValuesChange={setSplitValues} 
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="flex-1 rounded border py-2 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={createExpenseMutation.isPending} className="flex-1 rounded bg-green-600 py-2 text-white hover:bg-green-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroup } from '../hooks/useGroups';
import { useGroupExpenses } from '../hooks/useExpenses';
import { useBalances } from '../hooks/useBalances';
import { useAuth } from '../hooks/useAuth';
import ExpenseCard from '../components/ExpenseCard';
import ExpenseForm from '../components/ExpenseForm';
import SettleUpModal from '../components/SettleUpModal';
import BalanceSummary from '../components/BalanceSummary';
import MemberList from '../components/MemberList';

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groupQuery, updateGroupMutation, uploadPhotoMutation, deleteGroupMutation } = useGroup(id!);
  const { expensesQuery } = useGroupExpenses(id!);
  const { balancesQuery } = useBalances(id!);
  
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  if (groupQuery.isLoading) return <div className="p-8 text-center">Loading group...</div>;
  if (!groupQuery.data) return <div className="p-8 text-center">Group not found.</div>;

  const isCreator = user?.id === groupQuery.data.created_by;

  const handleEditName = () => {
    if (editNameValue.trim()) {
      updateGroupMutation.mutate(editNameValue, {
        onSuccess: () => setIsEditingName(false)
      });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadPhotoMutation.mutate(e.target.files[0]);
    }
  };

  const handleDeleteGroup = () => {
    if (confirm("Are you sure you want to delete this group? This cannot be undone.")) {
      deleteGroupMutation.mutate(undefined, {
        onSuccess: () => navigate('/dashboard')
      });
    }
  };

  const photoUrl = groupQuery.data.image_url ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${groupQuery.data.image_url}` : null;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
            {photoUrl ? (
              <img src={photoUrl} alt="Group DP" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl text-gray-400">🖼️</span>
            )}
            <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
              <span className="text-xs text-white">Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadPhotoMutation.isPending} />
            </label>
          </div>
          <div>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editNameValue}
                  onChange={e => setEditNameValue(e.target.value)}
                  className="rounded border px-2 py-1 text-xl font-bold"
                  autoFocus
                />
                <button onClick={handleEditName} disabled={updateGroupMutation.isPending} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">Save</button>
                <button onClick={() => setIsEditingName(false)} className="rounded border px-3 py-1 text-sm">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{groupQuery.data.name}</h1>
                <button onClick={() => { setEditNameValue(groupQuery.data.name); setIsEditingName(true); }} className="text-sm text-blue-600 hover:underline">Edit</button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isCreator && (
            <button onClick={handleDeleteGroup} disabled={deleteGroupMutation.isPending} className="rounded border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50">
              Delete Group
            </button>
          )}
          <button onClick={() => setShowSettleModal(true)} className="rounded border border-green-600 px-4 py-2 text-green-600 hover:bg-green-50">
            Settle up
          </button>
          <button onClick={() => setShowExpenseForm(true)} className="rounded bg-orange-500 px-4 py-2 text-white hover:bg-orange-600">
            Add an expense
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
            {expensesQuery.isLoading ? (
              <div className="p-4 text-center">Loading expenses...</div>
            ) : expensesQuery.data?.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No expenses yet. Add one!</div>
            ) : (
              expensesQuery.data?.map(exp => (
                <ExpenseCard key={exp.id} expense={exp} />
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <BalanceSummary balances={balancesQuery.data || []} />
          <MemberList members={groupQuery.data.members} />
        </div>
      </div>

      {showExpenseForm && <ExpenseForm groupId={id!} members={groupQuery.data.members} onClose={() => setShowExpenseForm(false)} />}
      {showSettleModal && <SettleUpModal groupId={id!} members={groupQuery.data.members} onClose={() => setShowSettleModal(false)} />}
    </div>
  );
}

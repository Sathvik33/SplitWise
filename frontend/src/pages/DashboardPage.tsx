import { useState } from 'react';
import { useGroups } from '../hooks/useGroups';
import { dashboardApi } from '../api/dashboard';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/formatCurrency';

export default function DashboardPage() {
  const { groupsQuery, createGroupMutation } = useGroups();
  const [newGroupName, setNewGroupName] = useState('');
  const [memberEmails, setMemberEmails] = useState('');
  const [error, setError] = useState('');

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getDashboard,
  });

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const emails = memberEmails.split(',').map((e) => e.trim()).filter(Boolean);
    createGroupMutation.mutate(
      { name: newGroupName, member_emails: emails },
      {
        onSuccess: () => {
          setNewGroupName('');
          setMemberEmails('');
        },
        onError: (err: any) => {
          setError(err.response?.data?.detail || "Failed to create group");
        }
      }
    );
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Dashboard</h2>
        <div className="flex gap-8">
          <div>
            <p className="text-sm text-gray-500">Total balance</p>
            <p className={`text-2xl font-bold ${dashboardQuery.data?.total_balance! > 0 ? 'text-green-600' : dashboardQuery.data?.total_balance! < 0 ? 'text-red-600' : ''}`}>
              {formatCurrency(dashboardQuery.data?.total_balance || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">You owe</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(dashboardQuery.data?.total_i_owe || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">You are owed</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(dashboardQuery.data?.total_owed_to_me || 0)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-4 text-lg font-bold">Your Groups</h3>
          <div className="space-y-4">
            {groupsQuery.data?.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="block rounded-lg border bg-white p-4 transition hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 overflow-hidden rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                      {group.image_url ? (
                        <img src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${group.image_url}`} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-gray-400">🖼️</span>
                      )}
                    </div>
                    <span className="font-semibold">{group.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{group.members.length} members</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-bold">Create a Group</h3>
          {error && <div className="mb-4 text-sm text-red-500">{error}</div>}
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              required
              className="w-full rounded border px-3 py-2"
            />
            <input
              type="text"
              value={memberEmails}
              onChange={(e) => setMemberEmails(e.target.value)}
              placeholder="Emails (comma separated)"
              className="w-full rounded border px-3 py-2"
            />
            <button
              type="submit"
              disabled={createGroupMutation.isPending}
              className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700"
            >
              Create Group
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

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
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getDashboard,
  });

  const breakdownQuery = useQuery({
    queryKey: ['dashboard', 'breakdown'],
    queryFn: dashboardApi.getDashboardBreakdown,
    enabled: isBreakdownOpen,
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
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      {/* Header Section */}
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back. Here's where your finances stand.</p>
      </div>

      {/* Balance Summary Cards */}
      <div className="mb-10 grid gap-6 sm:grid-cols-3">
        {/* Total Balance Card */}
        <button 
          onClick={() => setIsBreakdownOpen(true)}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 shadow-lg shadow-indigo-200/50 transition-transform hover:-translate-y-1 text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-indigo-100">Total balance</p>
              <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">View Details</span>
            </div>
            <p className="mt-2 text-4xl font-bold tracking-tight text-white">
              {formatCurrency(dashboardQuery.data?.total_balance || 0)}
            </p>
          </div>
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
        </button>

        {/* You Owe Card */}
        <button 
          onClick={() => setIsBreakdownOpen(true)}
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-gray-900/5 transition-shadow hover:shadow-md text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">You owe</p>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-red-600">
            {formatCurrency(dashboardQuery.data?.total_i_owe || 0)}
          </p>
        </button>

        {/* You Are Owed Card */}
        <button 
          onClick={() => setIsBreakdownOpen(true)}
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-gray-900/5 transition-shadow hover:shadow-md text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">You are owed</p>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-emerald-600">
            {formatCurrency(dashboardQuery.data?.total_owed_to_me || 0)}
          </p>
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Groups List */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Your Groups</h3>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
              {groupsQuery.data?.length || 0} active
            </span>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {groupsQuery.data?.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="group relative flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
                  {group.image_url ? (
                    <img src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${group.image_url}`} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg opacity-50">👥</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900 group-hover:text-indigo-600">{group.name}</p>
                  <p className="text-sm text-gray-500">{group.members.length} members</p>
                </div>
                <div className="shrink-0 text-gray-400 group-hover:text-indigo-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Create Group Form */}
        <div>
          <h3 className="mb-4 text-lg font-bold text-gray-900">Create New Group</h3>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">{error}</div>}
            
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Goa Trip 2026"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Invite Members</label>
                <input
                  type="text"
                  value={memberEmails}
                  onChange={(e) => setMemberEmails(e.target.value)}
                  placeholder="Emails (comma separated)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              
              <button
                type="submit"
                disabled={createGroupMutation.isPending}
                className="mt-2 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Balance Breakdown Modal */}
      {isBreakdownOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Balance Breakdown</h3>
                <p className="text-sm text-gray-500">No magic numbers. Exactly what makes up your balance.</p>
              </div>
              <button 
                onClick={() => setIsBreakdownOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {breakdownQuery.isLoading ? (
                <div className="flex h-40 items-center justify-center text-gray-500">Loading breakdown...</div>
              ) : breakdownQuery.data?.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-gray-500 text-center">
                  <span className="text-3xl mb-2">🤷‍♂️</span>
                  <p>No expenses yet.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {breakdownQuery.data?.map((item: any, idx: number) => (
                    <li key={idx} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-gray-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          item.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {item.amount > 0 ? '+' : '-'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{item.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span className="font-medium bg-gray-100 px-2 py-0.5 rounded">{item.group_name}</span>
                            <span>•</span>
                            <span>{new Date(item.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${item.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {item.amount > 0 ? '+' : ''}{formatCurrency(item.amount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{item.action}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Calculated Net Balance:</span>
              <span className={`text-xl font-bold ${
                (dashboardQuery.data?.total_balance || 0) > 0 ? 'text-emerald-600' : 
                (dashboardQuery.data?.total_balance || 0) < 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatCurrency(dashboardQuery.data?.total_balance || 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

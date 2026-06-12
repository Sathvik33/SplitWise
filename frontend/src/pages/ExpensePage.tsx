import { useParams, Link } from 'react-router-dom';
import { useExpense } from '../hooks/useExpenses';
import ChatBox from '../components/ChatBox';
import { formatCurrency } from '../utils/formatCurrency';
import { useGroup } from '../hooks/useGroups';

export default function ExpensePage() {
  const { id: groupId, expenseId } = useParams<{ id: string, expenseId: string }>();
  const { expenseQuery } = useExpense(expenseId!);
  const { groupQuery } = useGroup(groupId!);

  if (expenseQuery.isLoading || groupQuery.isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!expenseQuery.data || !groupQuery.data) return <div className="p-8 text-center">Not found.</div>;

  const expense = expenseQuery.data;
  const payer = groupQuery.data.members.find(m => m.user_id === expense.paid_by);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link to={`/groups/${groupId}`} className="mb-4 inline-block text-blue-600 hover:underline">
        &larr; Back to group
      </Link>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-6 flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold">{expense.title}</h2>
              <div className="text-3xl font-extrabold">{formatCurrency(expense.amount)}</div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div>Added by {payer?.user.name}</div>
              <div>on {new Date(expense.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          <h3 className="mb-3 font-semibold">Splits</h3>
          <ul className="space-y-3">
            {expense.splits.map(split => {
              const member = groupQuery.data.members.find(m => m.user_id === split.user_id);
              return (
                <li key={split.id} className="flex items-center justify-between">
                  <span>{member?.user.name}</span>
                  <span className="font-medium">{formatCurrency(split.amount_owed)}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <ChatBox expenseId={expenseId!} members={groupQuery.data.members} />
        </div>
      </div>
    </div>
  );
}

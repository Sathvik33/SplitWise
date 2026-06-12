import { Link } from 'react-router-dom';
import { Expense } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { useAuth } from '../hooks/useAuth';

export default function ExpenseCard({ expense }: { expense: Expense }) {
  const { user } = useAuth();
  
  const mySplit = expense.splits.find(s => s.user_id === user?.id);
  const isPayer = expense.paid_by === user?.id;

  const month = new Date(expense.created_at).toLocaleString('default', { month: 'short' });
  const day = new Date(expense.created_at).getDate();

  return (
    <Link to={`/groups/${expense.group_id}/expenses/${expense.id}`} className="block border-b bg-white p-4 transition hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-center text-sm text-gray-500">
            <div className="uppercase">{month}</div>
            <div className="text-lg font-bold text-gray-900">{day}</div>
          </div>
          <div>
            <h4 className="font-semibold">{expense.title}</h4>
            {isPayer ? (
              <span className="text-sm text-gray-500">You paid {formatCurrency(expense.amount)}</span>
            ) : (
              <span className="text-sm text-gray-500">Someone paid {formatCurrency(expense.amount)}</span>
            )}
          </div>
        </div>
        
        <div className="text-right">
          {mySplit ? (
            isPayer ? (
              <>
                <div className="text-sm text-gray-500">You lent</div>
                <div className="font-semibold text-green-600">{formatCurrency(expense.amount - mySplit.amount_owed)}</div>
              </>
            ) : (
              <>
                <div className="text-sm text-gray-500">You borrowed</div>
                <div className="font-semibold text-red-600">{formatCurrency(mySplit.amount_owed)}</div>
              </>
            )
          ) : (
            <div className="text-sm text-gray-400">Not involved</div>
          )}
        </div>
      </div>
    </Link>
  );
}

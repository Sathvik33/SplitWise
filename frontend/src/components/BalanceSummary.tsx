import { BalanceEntry } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { useAuth } from '../hooks/useAuth';

export default function BalanceSummary({ balances }: { balances: BalanceEntry[] }) {
  const { user } = useAuth();

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-bold">Group Balances</h3>
      <ul className="space-y-3">
        {balances.map((b) => {
          const isMe = b.user_id === user?.id;
          const name = isMe ? 'You' : b.name;
          
          if (b.net_amount === 0) {
            return <li key={b.user_id} className="text-gray-500">{name} settled up</li>;
          }
          
          if (b.net_amount > 0) {
            return (
              <li key={b.user_id} className="text-green-600">
                <span className="font-medium">{name}</span> {isMe ? 'are' : 'is'} owed {formatCurrency(b.net_amount)}
                <span className="ml-2">↑</span>
              </li>
            );
          }
          
          return (
            <li key={b.user_id} className="text-red-600">
              <span className="font-medium">{name}</span> owe{isMe ? '' : 's'} {formatCurrency(Math.abs(b.net_amount))}
              <span className="ml-2">↓</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

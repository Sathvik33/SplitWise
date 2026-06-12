import { GroupMember } from '../types';

interface SplitCalculatorProps {
  amount: number;
  splitType: 'equal' | 'unequal' | 'percentage' | 'share';
  members: GroupMember[];
  splitValues: Record<string, number>;
  onSplitValuesChange: (values: Record<string, number>) => void;
}

export default function SplitCalculator({ amount, splitType, members, splitValues, onSplitValuesChange }: SplitCalculatorProps) {
  const handleChange = (userId: string, value: number) => {
    onSplitValuesChange({ ...splitValues, [userId]: value });
  };

  if (splitType === 'equal') {
    const splitAmount = amount / members.length;
    return (
      <div className="space-y-3">
        {members.map(m => (
          <div key={m.user_id} className="flex justify-between border-b pb-2">
            <span>{m.user.name}</span>
            <span className="text-gray-500">₹{splitAmount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map(m => (
        <div key={m.user_id} className="flex items-center justify-between border-b pb-2">
          <span>{m.user.name}</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step={splitType === 'share' ? "1" : "0.01"}
              value={splitValues[m.user_id] || ''}
              onChange={(e) => handleChange(m.user_id, parseFloat(e.target.value) || 0)}
              className="w-24 rounded border px-2 py-1 text-right"
              placeholder="0"
            />
            {splitType === 'percentage' && <span>%</span>}
            {splitType === 'share' && <span>shares</span>}
            {splitType === 'unequal' && <span>₹</span>}
          </div>
        </div>
      ))}
      {splitType === 'unequal' && (
        <div className="text-right text-sm text-gray-500">
          Total: ₹{Object.values(splitValues).reduce((a, b) => a + (b || 0), 0).toFixed(2)} / ₹{amount}
        </div>
      )}
      {splitType === 'percentage' && (
        <div className="text-right text-sm text-gray-500">
          Total: {Object.values(splitValues).reduce((a, b) => a + (b || 0), 0).toFixed(2)}% / 100%
        </div>
      )}
    </div>
  );
}

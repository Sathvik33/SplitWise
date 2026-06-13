import { GroupMember } from '../types';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';

interface MemberListProps {
  members: GroupMember[];
  groupId: string;
  currentUserId?: string;
}

export default function MemberList({ members, groupId, currentUserId }: MemberListProps) {
  const queryClient = useQueryClient();

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from this group? This marks them as "left" and preserves history.`)) return;
    
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/groups/${groupId}/members/${userId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('splitwise_token')}` } }
      );
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to remove member");
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-bold">Group Members</h3>
      <ul className="space-y-2">
        {members.map((member) => (
          <li key={member.user_id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                {member.user.name.charAt(0).toUpperCase()}
              </div>
              <span>{member.user.name}</span>
            </div>
            {currentUserId && member.user_id !== currentUserId && (
              <button
                onClick={() => handleRemoveMember(member.user_id, member.user.name)}
                className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                title="Remove member"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

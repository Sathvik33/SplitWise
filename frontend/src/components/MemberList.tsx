import { GroupMember } from '../types';

export default function MemberList({ members }: { members: GroupMember[] }) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-bold">Group Members</h3>
      <ul className="space-y-2">
        {members.map((member) => (
          <li key={member.user_id} className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
              {member.user.name.charAt(0).toUpperCase()}
            </div>
            <span>{member.user.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

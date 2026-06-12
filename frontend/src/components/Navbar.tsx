import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
      <Link to="/dashboard" className="text-xl font-bold text-blue-600">Splitwise</Link>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user.name}</span>
        <button onClick={logout} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">
          Logout
        </button>
      </div>
    </nav>
  );
}

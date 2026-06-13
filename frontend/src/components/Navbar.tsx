import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
      <Link to="/dashboard" className="text-xl font-bold text-blue-600">Splitwise</Link>
      <div className="flex items-center gap-6">
        <Link to="/import" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
          Import CSV
        </Link>
        <div className="flex items-center gap-4 border-l pl-6">
          <span className="text-sm font-medium text-gray-700">{user.name}</span>
          <button onClick={logout} className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import GroupPage from './pages/GroupPage';
import ExpensePage from './pages/ExpensePage';
import ImportPage from './pages/ImportPage';
import Navbar from './components/Navbar';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <Outlet />
    </div>
  );
};

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading app...</div>;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/groups/:id" element={<GroupPage />} />
        <Route path="/groups/:id/expenses/:expenseId" element={<ExpensePage />} />
        <Route path="/import" element={<ImportPage />} />
      </Route>
    </Routes>
  );
}

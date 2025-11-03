import { Navigate, Outlet, useLocation } from 'react-router-dom';import { useAuth } from '@/features/auth/hooks/useAuth';
import { FullScreenLoader } from '@/components/FullScreenLoader';

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role_id !== 1) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}


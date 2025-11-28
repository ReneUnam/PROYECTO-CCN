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

export function RequireTerms() {
  const location = useLocation();
  // Allow access to the terms page itself
  if (location.pathname === '/terms') return <Outlet />;
  try {
    const accepted = typeof window !== 'undefined' && localStorage.getItem('terms:accepted') === '1';
    if (!accepted) return <Navigate to="/terms" replace state={{ from: location.pathname }} />;
  } catch (e) {
    return <Navigate to="/terms" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}


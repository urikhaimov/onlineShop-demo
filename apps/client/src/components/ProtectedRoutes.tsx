import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { useRedirect } from '../context/RedirectContext';

type Props = { children: React.ReactNode };

/**
 * Renders children only when the user is authenticated.
 * Auth state comes entirely from AuthContext:
 *  - demo mode:  AuthProvider provides a synthetic admin user (non-null)
 *  - E2E bare:   AuthProvider returns null user → redirect to /login
 *  - E2E harness: useAuth module is intercepted → returns admin user
 */
export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { setRedirectTo, setMessage } = useRedirect();
  const notified = React.useRef(false);

  // All hooks must run unconditionally before any early return
  React.useEffect(() => {
    if (!loading && !user && !notified.current) {
      const full = location.pathname + location.search + location.hash;
      setRedirectTo(full);
      setMessage('You must be logged in to continue.');
      notified.current = true;
    }
  }, [loading, user, location, setRedirectTo, setMessage]);

  if (loading) {
    return (
      <Box
        data-testid="auth-loading"
        sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(
      location.pathname + location.search + location.hash,
    );
    return (
      <Navigate
        to={`/login?redirect=${redirect}`}
        replace
        state={{ from: location }}
      />
    );
  }

  return <>{children}</>;
};

/**
 * Renders children only when the user is authenticated AND holds an admin role.
 * Exported as both `AdminProtectedRoute` (legacy name, used in routesConfig)
 * and `AdminRoute` (preferred name going forward) for gradual migration.
 */
export const AdminProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user, loading, role } = useAuth();
  const location = useLocation();
  const { setRedirectTo, setMessage } = useRedirect();
  const notified = React.useRef(false);

  const isAdminRole = role === 'admin' || role === 'superadmin';

  React.useEffect(() => {
    if (!loading && (!user || !isAdminRole) && !notified.current) {
      const full = location.pathname + location.search + location.hash;
      setRedirectTo(full);
      setMessage('Admin access required.');
      notified.current = true;
    }
  }, [loading, user, isAdminRole, location, setRedirectTo, setMessage]);

  if (loading) {
    return (
      <Box
        data-testid="auth-loading"
        sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user || !isAdminRole) {
    const redirect = encodeURIComponent(
      location.pathname + location.search + location.hash,
    );
    return (
      <Navigate
        to={`/login?redirect=${redirect}`}
        replace
        state={{ from: location }}
      />
    );
  }

  return <>{children}</>;
};

/** Alias — prefer this name in new code */
export const AdminRoute = AdminProtectedRoute;

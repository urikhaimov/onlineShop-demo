import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { useRedirect } from '../context/RedirectContext';

type Props = { children: React.ReactNode };

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { setRedirectTo, setMessage } = useRedirect();
  const notified = React.useRef(false);

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

export const AdminProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user, loading, role } = useAuth();
  const location = useLocation();
  const { setRedirectTo, setMessage } = useRedirect();
  const notified = React.useRef(false);

  const isAdmin = role === 'admin' || role === 'superadmin';

  React.useEffect(() => {
    if (!loading && (!user || !isAdmin) && !notified.current) {
      const full = location.pathname + location.search + location.hash;
      setRedirectTo(full);
      setMessage('Admin access required.');
      notified.current = true;
    }
  }, [loading, user, isAdmin, location, setRedirectTo, setMessage]);

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

  if (!user || !isAdmin) {
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

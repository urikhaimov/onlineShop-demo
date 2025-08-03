import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRedirect } from '../context/RedirectContext';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { setRedirectTo, setMessage } = useRedirect();

  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!user) {
      setRedirectTo(location.pathname);
      setMessage('You must be logged in to continue.');
      setShouldRedirect(true);
    }
  }, [user, location.pathname, setRedirectTo, setMessage]);

  // if (!user && shouldRedirect) {
  //   return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  // }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

interface Props {
  children: ReactNode;
}

export const AdminProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user, loading, role } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // ✅ Enable this check once roles are ready
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      setShouldRedirect(true);
    }
  }, [user, loading, isAdmin]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (shouldRedirect) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

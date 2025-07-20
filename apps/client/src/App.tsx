import React, { useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  ThemeProvider as MuiThemeProvider,
  CssBaseline,
  CircularProgress,
  Box,
} from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { AnimatePresence } from 'framer-motion';

import { ProtectedRoute, AdminProtectedRoute } from './components/ProtectedRoutes';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MyOrdersPage from './pages/MyOrdersPage';
import UserProfilePage from './pages/UserProfilePage';
import OrderDetailPage from './pages/OrderDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import ThankYouPage from './pages/ThankYouPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CheckoutSuccessPage from './pages/CheckoutPage/CheckoutSuccessPage';
import Layout from './layouts/MainLayout';
import AdminDashboardLayout from './layouts/AdminDashboardLayout';
import AdminThemePage from './pages/admin/AdminThemePage';
import AdminLandingPage from './pages/admin/AdminLandingPage/AdminLandingPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminLogsPage from './pages/admin/AdminLogsPage';
import EditOrderPage from './pages/admin/AdminEditOrderPage';
import { ProductFormPage, AdminProductsPage } from './pages/admin/AdminProductsPage';
import AdminHomePage from './pages/admin/AdminHomePage';

import { useRedirect } from './context/RedirectContext';
import { useAuthStore } from './stores/useAuthStore';
import { useThemeStore } from './stores/useThemeStore';
import { getThemeFromSettings } from './utils/themeBuilder';
import { StripeProvider } from './stripe/StripeProvider';
import AdminSecurityLogsPage from './pages/admin/AdminSecurityLogsPage';
import './App.css';
import LoadingProgress from './components/LoadingProgress';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    loading,
    authInitialized,
    initializeAuth,
  } = useAuthStore();
  const { consumeRedirect } = useRedirect();
  const hasRedirected = useRef(false);

  const { themeSettings } = useThemeStore();
  const theme = createTheme(getThemeFromSettings(themeSettings));

  // Firebase auth init
useEffect(() => {
  const unsubscribe = useAuthStore.getState().initializeAuth();
   return unsubscribe;
}, []);

  // Redirect unauthenticated users
  useEffect(() => {
    if (authInitialized && !user && !hasRedirected.current) {
      const next = consumeRedirect();
      navigate('/login' + (next ? `?redirect=${next}` : ''));
      hasRedirected.current = true;
    }
  }, [authInitialized, user, consumeRedirect, navigate]);

  useEffect(() => {
    if (user && !hasRedirected.current) {
      const redirect = consumeRedirect();
      const defaultTarget = ['admin', 'superadmin'].includes(user.role ?? '') ? '/admin' : '/';
      if (redirect && location.pathname !== redirect) {
        navigate(redirect, { replace: true });
        hasRedirected.current = true;
      }
    }
  }, [user, consumeRedirect, location.pathname, navigate]);

  // You can remove this condition if themeSettings is always preloaded
  if (!authInitialized || !themeSettings) {
    return (
      <LoadingProgress />

    );
  }

  const isAuthPage =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/signup') ||
    location.pathname.startsWith('/reset-password');

  const appRoutes = (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/product/:id" element={<ProductPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <StripeProvider>
              <CheckoutPage />
            </StripeProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout/success"
        element={
          <ProtectedRoute>
            <StripeProvider>
              <CheckoutSuccessPage />
            </StripeProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/:id"
        element={
          <ProtectedRoute>
            <OrderDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <UserProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-orders"
        element={
          <ProtectedRoute>
            <MyOrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/thank-you"
        element={
          <ProtectedRoute>
            <ThankYouPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <AdminProtectedRoute>
            <AdminDashboardLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<AdminHomePage />} />
        <Route path="landingPage" element={<AdminLandingPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="orders/:id" element={<EditOrderPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="logs" element={<AdminLogsPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/add" element={<ProductFormPage mode="add" />} />
        <Route path="products/edit/:productId" element={<ProductFormPage mode="edit" />} />
        <Route path="theme" element={<AdminThemePage />} />
        <Route path="security-logs" element={<AdminSecurityLogsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <AnimatePresence mode="wait">
        {isAuthPage ? appRoutes : <Layout>{appRoutes}</Layout>}
      </AnimatePresence>
    </MuiThemeProvider>
  );
}

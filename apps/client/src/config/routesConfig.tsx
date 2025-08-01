import React from 'react';
import {
  AdminProtectedRoute,
  ProtectedRoute,
} from '../components/ProtectedRoutes';
import AdminDashboardLayout from '../layouts/AdminDashboardLayout';
import AdminCategoriesPage from '../pages/admin/AdminCategoriesPage';
import EditOrderPage from '../pages/admin/AdminEditOrderPage';
import AdminHomePage from '../pages/admin/AdminHomePage';
import AdminLandingPage from '../pages/admin/AdminLandingPage';
import AdminLogsPage from '../pages/admin/AdminLogsPage';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage';
import {
  AdminProductsPage,
  ProductFormPage,
} from '../pages/admin/AdminProductsPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import CartPage from '../pages/CartPage';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import MyOrdersPage from '../pages/MyOrdersPage';
import OrderDetailPage from '../pages/OrderDetailPage';
import ProductPage from '../pages/ProductPage';
import ProductsPage from '../pages/ProductsPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import SignupPage from '../pages/SignupPage';
import ThankYouPage from '../pages/ThankYouPage';
import UserProfilePage from '../pages/UserProfilePage';
import { type Location, Route, Routes } from 'react-router-dom';
import AdminThemePage from '../pages/admin/AdminThemePage';
import NotFoundPage from '../pages/NotFoundPage';
import AdminSecurityLogsPage from '../pages/admin/AdminSecurityLogsPage';
import CheckoutPage from '../pages/CheckoutPage';
import CheckoutSuccessPage from '../pages/CheckoutPage/CheckoutSuccessPage';

export enum ERoutePaths {
  HOME = '/',
  LOGIN = '/login',
  SIGNUP = '/signup',
  RESET_PASSWORD = '/reset-password',
  PRODUCTS = '/products',
  PRODUCT = '/product/:id',
  CART = '/cart',
  CHECKOUT = '/checkout',
  CHECKOUT_SUCCESS = '/checkout/success',
  ORDER_DETAIL = '/order/:id',
  PROFILE = '/profile',
  MY_ORDERS = '/my-orders',
  THANK_YOU = '/thank-you',
  ADMIN_HOME = '/admin',
  ADMIN_LANDING_PAGE = '/admin/landingPage',
  ADMIN_CATEGORIES = '/admin/categories',
  ADMIN_ORDERS = '/admin/orders',
  ADMIN_ORDER_EDIT = '/admin/orders/:id',
  ADMIN_USERS = '/admin/users',
  ADMIN_LOGS = '/admin/logs',
  ADMIN_PRODUCTS = '/admin/products',
  ADMIN_PRODUCT_ADD = '/admin/products/add',
  ADMIN_PRODUCT_EDIT = '/admin/products/edit/:productId',
  ADMIN_THEME = '/admin/theme',
  ADMIN_SECURITY_LOGS = '/admin/security-logs',
  NOT_FOUND = '*',
  ADMIN_DASHBOARD = '/admin/*',
}

export const appRoutes = (location: Location<any>) => (
  <Routes location={location} key={location.pathname}>
    <Route path={ERoutePaths.HOME} element={<HomePage />} />
    <Route path={ERoutePaths.PRODUCTS} element={<ProductsPage />} />
    <Route path={ERoutePaths.PRODUCT} element={<ProductPage />} />
    <Route path="/cart" element={<CartPage />} />
    <Route path={ERoutePaths.LOGIN} element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route
      path="/checkout"
      element={
        <ProtectedRoute>
          <CheckoutPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/checkout/success"
      element={
        <ProtectedRoute>
          <CheckoutSuccessPage />
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
      path={ERoutePaths.ADMIN_DASHBOARD}
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
      <Route
        path="products/edit/:productId"
        element={<ProductFormPage mode="edit" />}
      />
      <Route path="theme" element={<AdminThemePage />} />
      <Route path="security-logs" element={<AdminSecurityLogsPage />} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

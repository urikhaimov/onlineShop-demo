import React from 'react';
import {
  AdminProtectedRoute,
  ProtectedRoute,
} from '../components/ProtectedRoutes';
import PayPalProvider from '../paypal/PayPalProvider';
import { type Location, Route, Routes } from 'react-router-dom';

// Eagerly loaded — always needed
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import HomePage from '../pages/HomePage';
import ProductsPage from '../pages/ProductsPage';
import ProductPage from '../pages/ProductPage';
import CartPage from '../pages/CartPage';
import NotFoundPage from '../pages/NotFoundPage';
import DashboardLayout from '../layouts/dashboard/DashboardLayout';

// Lazily loaded — authenticated-only or heavy
const CheckoutPage = React.lazy(() => import('../pages/CheckoutPage'));
const CheckoutSuccessPage = React.lazy(
  () => import('../pages/CheckoutPage/CheckoutSuccessPage'),
);
const OrderDetailPage = React.lazy(() => import('../pages/OrderDetailPage'));
const UserProfilePage = React.lazy(() => import('../pages/UserProfilePage'));
const MyOrdersPage = React.lazy(() => import('../pages/MyOrdersPage'));

// Admin — lazily loaded
const AdminDashboardLayout = React.lazy(
  () => import('../layouts/AdminDashboardLayout'),
);
const AdminHomePage = React.lazy(() => import('../pages/admin/AdminHomePage'));
const AdminLandingPage = React.lazy(
  () => import('../pages/admin/AdminLandingPage'),
);
const AdminCategoriesPage = React.lazy(
  () => import('../pages/admin/AdminCategoriesPage'),
);
const AddCategoryPage = React.lazy(
  () => import('../pages/admin/AdminCategoriesPage/AddCategoryPage'),
);
const EditCategoryPage = React.lazy(
  () => import('../pages/admin/AdminCategoriesPage/EditCategoryPage'),
);
const AdminOrdersPage = React.lazy(
  () => import('../pages/admin/AdminOrdersPage'),
);
const EditOrderPage = React.lazy(
  () => import('../pages/admin/AdminEditOrderPage'),
);
const AdminUsersPage = React.lazy(
  () => import('../pages/admin/AdminUsersPage'),
);
const AdminLogsPage = React.lazy(() => import('../pages/admin/AdminLogsPage'));
const AdminSecurityLogsPage = React.lazy(
  () => import('../pages/admin/AdminSecurityLogsPage'),
);
const AdminThemePage = React.lazy(
  () => import('../pages/admin/AdminThemePage'),
);
const OrderSettingsPage = React.lazy(
  () => import('../pages/admin/OrderSettingsPage'),
);

// AdminProductsPage exports two components — use a wrapper
const AdminProductsPageLazy = React.lazy(() =>
  import('../pages/admin/AdminProductsPage').then((m) => ({
    default: m.AdminProductsPage,
  })),
);
const ProductFormPageAdd = React.lazy(() =>
  import('../pages/admin/AdminProductsPage').then((m) => ({
    default: () => <m.ProductFormPage mode="add" />,
  })),
);
const ProductFormPageEdit = React.lazy(() =>
  import('../pages/admin/AdminProductsPage').then((m) => ({
    default: () => <m.ProductFormPage mode="edit" />,
  })),
);

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

export const appRoutes = (location: Location) => (
  <Routes location={location} key={location.pathname}>
    {/* Auth routes WITHOUT app shell */}
    <Route path={ERoutePaths.LOGIN} element={<LoginPage />} />
    <Route path={ERoutePaths.SIGNUP} element={<SignupPage />} />
    <Route path={ERoutePaths.RESET_PASSWORD} element={<ResetPasswordPage />} />
    <Route path="/reset-password/confirm" element={<ResetPasswordPage />} />

    {/* Everything else uses the app shell */}
    <Route element={<DashboardLayout />}>
      <Route path={ERoutePaths.HOME} element={<HomePage />} />
      <Route path={ERoutePaths.PRODUCTS} element={<ProductsPage />} />
      <Route path={ERoutePaths.PRODUCT} element={<ProductPage />} />
      <Route path={ERoutePaths.CART} element={<CartPage />} />

      <Route
        path={ERoutePaths.CHECKOUT}
        element={
          <ProtectedRoute>
            <PayPalProvider>
              <CheckoutPage />
            </PayPalProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path={ERoutePaths.CHECKOUT_SUCCESS}
        element={
          <ProtectedRoute>
            <CheckoutSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ERoutePaths.ORDER_DETAIL}
        element={
          <ProtectedRoute>
            <OrderDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ERoutePaths.PROFILE}
        element={
          <ProtectedRoute>
            <UserProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ERoutePaths.MY_ORDERS}
        element={
          <ProtectedRoute>
            <MyOrdersPage />
          </ProtectedRoute>
        }
      />

      {/* Admin area */}
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
        <Route path="products" element={<AdminProductsPageLazy />} />
        <Route path="products/add" element={<ProductFormPageAdd />} />
        <Route path="categories/add" element={<AddCategoryPage />} />
        <Route path="categories/edit/:id" element={<EditCategoryPage />} />
        <Route path="orders/settings" element={<OrderSettingsPage />} />
        <Route
          path="products/edit/:productId"
          element={<ProductFormPageEdit />}
        />
        <Route path="theme" element={<AdminThemePage />} />
        <Route path="security-logs" element={<AdminSecurityLogsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

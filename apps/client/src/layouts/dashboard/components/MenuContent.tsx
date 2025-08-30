// src/components/.../MenuContent.tsx
import * as React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Brush as BrushIcon,
  Category as CategoryIcon,
  Home as HomeIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Security as SecurityIcon,
  SettingsRounded as SettingsRoundedIcon,
  InfoRounded as InfoRoundedIcon,
  HelpRounded as HelpRoundedIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../../hooks/useAuth';
import { isAdmin } from '../../../context/AuthContext';

export default function MenuContent() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isSelected = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return (
      location.pathname === path || location.pathname.startsWith(path + '/')
    );
  };
  const handleNavigate = (path: string) => () => navigate(path);

  const mainListItems = React.useMemo(
    () => [
      { label: t('nav.home'), icon: <HomeIcon />, path: '/' },
      { label: t('nav.products'), icon: <InventoryIcon />, path: '/products' },
      { label: t('nav.myOrders'), icon: <ReceiptIcon />, path: '/my-orders' },
    ],
    [t],
  );

  const secondaryListItems = React.useMemo(() => {
    if (isAdmin(role)) {
      return [
        {
          label: t('admin.dashboardHome'),
          icon: <AdminPanelSettingsIcon />,
          path: '/admin',
        },
        {
          label: t('admin.categories'),
          icon: <CategoryIcon />,
          path: '/admin/categories',
        },
        { label: t('admin.users'), icon: <PeopleIcon />, path: '/admin/users' },
        {
          label: t('admin.products'),
          icon: <InventoryIcon />,
          path: '/admin/products',
        },
        {
          label: t('admin.orders'),
          icon: <ReceiptIcon />,
          path: '/admin/orders',
        },
        // { label: t('admin.theme'), icon: <BrushIcon />, path: '/admin/theme' },
        {
          label: t('admin.landingPage'),
          icon: <HomeIcon />,
          path: '/admin/landingPage',
        },
        {
          label: t('admin.ordersSettings'),
          icon: <SecurityIcon />,
          path: '/admin/orders/settings',
        },
      ];
    }
    return [];
  }, [role, t]);

  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: 'space-between' }}>
      <List dense>
        {mainListItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              selected={isSelected(item.path)}
              onClick={handleNavigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <List dense>
        {secondaryListItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              selected={isSelected(item.path)}
              onClick={handleNavigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}

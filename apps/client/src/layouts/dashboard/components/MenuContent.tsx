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

import { useAuth } from '../../../hooks/useAuth';
import { isAdmin } from '../../../context/AuthContext';

export default function MenuContent() {
  const { role } = useAuth();

  const mainListItems = [
    { label: 'Home', icon: <HomeIcon />, path: '/' },
    { label: 'Products', icon: <InventoryIcon />, path: '/products' },
    { label: 'My Orders', icon: <ReceiptIcon />, path: '/my-orders' },
  ];

  const secondaryListItems = isAdmin(role)
    ? [
        {
          label: 'Dashboard Home',
          icon: <AdminPanelSettingsIcon />,
          path: '/admin',
        },
        {
          label: 'Categories',
          icon: <CategoryIcon />,
          path: '/admin/categories',
        },
        {
          label: 'Users',
          icon: <PeopleIcon />,
          path: '/admin/users',
        },
        {
          label: 'Products',
          icon: <InventoryIcon />,
          path: '/admin/products',
        },
        {
          label: 'Orders',
          icon: <ReceiptIcon />,
          path: '/admin/orders',
        },
        {
          label: 'Theme',
          icon: <BrushIcon />,
          path: '/admin/theme',
        },
        {
          label: 'Landing Page',
          icon: <HomeIcon />,
          path: '/admin/landingPage',
        },
        {
          label: 'Security Logs',
          icon: <SecurityIcon />,
          path: '/admin/security-logs',
        },
      ]
    : [
        {
          label: 'Settings',
          icon: <SettingsRoundedIcon />,
          path: '/settings',
        },
        {
          label: 'About',
          icon: <InfoRoundedIcon />,
          path: '/about',
        },
        {
          label: 'Feedback',
          icon: <HelpRoundedIcon />,
          path: '/feedback',
        },
      ];

  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: 'space-between' }}>
      <List dense>
        {mainListItems.map((item, index) => (
          <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
            <ListItemButton selected={index === 0} href={item.path}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <List dense>
        {secondaryListItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
            <ListItemButton href={item.path}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}

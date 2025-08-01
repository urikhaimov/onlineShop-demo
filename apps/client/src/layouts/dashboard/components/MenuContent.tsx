import * as React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
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
} from '@mui/icons-material';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import { useAuth } from '../../../hooks/useAuth';
import { isAdmin } from '../../../context/AuthContext';

export default function MenuContent() {
  const { role } = useAuth();
  const mainListItems = [
    { label: 'Home', icon: <HomeIcon />, path: '/' },

    { label: 'Products', icon: <InventoryIcon />, path: '/products' },
    { label: 'My Orders', icon: <ReceiptIcon />, path: '/my-orders' },
    // { label: 'Profile', icon: <AccountCircleIcon />, path: '/profile' },
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
        { label: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
        { label: 'Products', icon: <InventoryIcon />, path: '/admin/products' },
        { label: 'Orders', icon: <ReceiptIcon />, path: '/admin/orders' },
        { label: 'Theme', icon: <BrushIcon />, path: '/admin/theme' },
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
        { text: 'Settings', icon: <SettingsRoundedIcon /> },
        { text: 'About', icon: <InfoRoundedIcon /> },
        { text: 'Feedback', icon: <HelpRoundedIcon /> },
      ];

  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: 'space-between' }}>
      <List dense>
        {mainListItems.map((item, index) => (
          <ListItem key={index} disablePadding sx={{ display: 'block' }}>
            <ListItemButton selected={index === 0}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <List dense>
        {secondaryListItems.map((item, index) => (
          <ListItem key={index} disablePadding sx={{ display: 'block' }}>
            <ListItemButton>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}

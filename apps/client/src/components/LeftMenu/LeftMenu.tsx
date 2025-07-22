// src/components/LeftMenu/LeftMenu.tsx
import React, { useCallback, useEffect } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AccountCircle as AccountCircleIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Brush as BrushIcon,
  Category as CategoryIcon,
  Home as HomeIcon,
  Inventory as InventoryIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Security as SecurityIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';

import { useCartStore } from '../../stores/useCartStore';
import { useSidebarStore } from '../../stores/useSidebarStore';
import ScrollContainer from '../ScrollContainer';
import CartDrawer from '../CartDrawer';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../context/AuthContext';

export default function LeftMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user, role } = useAuth();
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  // const isAdmin =
  //   !!user && (user.role === 'admin' || user.role === 'superadmin');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    mobileOpen,
    expanded,
    cartOpen,
    anchorEl,
    setExpanded,
    toggleMobileDrawer,
    closeMobileDrawer,
    openCartDrawer,
    closeCartDrawer,
    setAnchorEl,
  } = useSidebarStore();

  const drawerWidth = expanded ? 240 : 72;
  const showLabel = expanded && !isMobile;

  useEffect(() => {
    setExpanded(!isMobile);
  }, [isMobile, setExpanded]);

  const handleProfileMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget),
    [setAnchorEl],
  );
  const handleProfileMenuClose = useCallback(
    () => setAnchorEl(null),
    [setAnchorEl],
  );

  const isActive = (path: string) => location.pathname === path;

  const storeLinks = [
    { label: 'Home', icon: <HomeIcon />, path: '/' },
    {
      label: 'Cart',
      icon: (
        <Badge badgeContent={cartCount} color="secondary">
          <ShoppingCartIcon />
        </Badge>
      ),
      action: () => openCartDrawer(),
    },
    { label: 'Products', icon: <InventoryIcon />, path: '/products' },
    { label: 'My Orders', icon: <ReceiptIcon />, path: '/my-orders' },
    { label: 'Profile', icon: <AccountCircleIcon />, path: '/profile' },
  ];

  const adminLinks = [
    {
      label: 'Dashboard Home',
      icon: <AdminPanelSettingsIcon />,
      path: '/admin',
    },
    { label: 'Categories', icon: <CategoryIcon />, path: '/admin/categories' },
    { label: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
    { label: 'Products', icon: <InventoryIcon />, path: '/admin/products' },
    { label: 'Orders', icon: <ReceiptIcon />, path: '/admin/orders' },
    { label: 'Theme', icon: <BrushIcon />, path: '/admin/theme' },
    { label: 'Landing Page', icon: <HomeIcon />, path: '/admin/landingPage' },
    {
      label: 'Security Logs',
      icon: <SecurityIcon />,
      path: '/admin/security-logs',
    },
  ];

  const renderLink = ({
    label,
    icon,
    path,
    action,
  }: {
    label: string;
    icon: React.ReactNode;
    path?: string;
    action?: () => void;
  }) => (
    <Tooltip title={!showLabel ? label : ''} placement="right" key={label}>
      <ListItem disablePadding>
        <ListItemButton
          selected={path ? isActive(path) : false}
          onClick={() => {
            if (path) navigate(path);
            if (action) action();
            if (isMobile) closeMobileDrawer();
          }}
        >
          <ListItemIcon>{icon}</ListItemIcon>
          {showLabel && <ListItemText primary={label} />}
        </ListItemButton>
      </ListItem>
    </Tooltip>
  );

  const drawerContent = (
    <ScrollContainer>
      <Box
        width={drawerWidth}
        display="flex"
        flexDirection="column"
        sx={{ px: isMobile ? 0 : 1 }}
      >
        {/* Toggle Button */}
        {!isMobile && (
          <IconButton onClick={() => setExpanded(!expanded)} sx={{ m: 1 }}>
            <MenuIcon />
          </IconButton>
        )}

        {/* User Info */}
        {user && (
          <Box
            display="flex"
            alignItems="center"
            gap={1}
            p={2}
            sx={{ cursor: 'pointer' }}
            onClick={handleProfileMenuOpen}
          >
            <Avatar
              src={user.photoURL || '/default-avatar.png'}
              sx={{ width: 32, height: 32 }}
            />
            {showLabel && (
              <Typography variant="subtitle2" noWrap>
                {user.displayName || user.email}
              </Typography>
            )}
          </Box>
        )}

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              navigate('/profile');
              handleProfileMenuClose();
            }}
          >
            Edit Profile
          </MenuItem>
          <MenuItem
            onClick={async () => {
              await signOut();
              handleProfileMenuClose();
            }}
          >
            Logout
          </MenuItem>
        </Menu>

        <Divider />

        {/* Store Section */}
        <List>
          {storeLinks.map(({ label, icon, path, action }) =>
            renderLink({ label, icon, path, action }),
          )}
        </List>

        {/* Admin Section */}
        {isAdmin(role) ? (
          <>
            <Divider />
            <List>
              {adminLinks.map(({ label, icon, path }) =>
                renderLink({ label, icon, path }),
              )}
            </List>
          </>
        ) : null}

        <Box flexGrow={1} />

        {/* Logout */}
        <Divider />
        <List>
          <Tooltip title={!showLabel ? 'Logout' : ''} placement="right">
            <ListItem disablePadding>
              <ListItemButton onClick={signOut}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                {showLabel && <ListItemText primary="Logout" />}
              </ListItemButton>
            </ListItem>
          </Tooltip>
        </List>
      </Box>
    </ScrollContainer>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={closeMobileDrawer}
        ModalProps={{ keepMounted: true }}
        slotProps={{
          paper: {
            sx: {
              width: '100vw',
              maxWidth: drawerWidth,
              zIndex: (theme) => theme.zIndex.drawer + 2,
            },
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              transition: 'width 0.3s ease',
              overflowX: 'hidden',
            },
            display: { xs: 'none', sm: 'block' },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <CartDrawer open={cartOpen} onClose={closeCartDrawer} />
    </>
  );
}

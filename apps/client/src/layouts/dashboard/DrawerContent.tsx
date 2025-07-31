// apps/client-ui/layouts/dashboard/DrawerContent.tsx

import React from 'react';
import {
  Drawer,
  Toolbar,
  Divider,
  MenuList,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import StoreIcon from '@mui/icons-material/Store';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptIcon from '@mui/icons-material/Receipt';

const drawerWidth = 240;

export default function DrawerContent() {
  const navigate = useNavigate();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar />
      <Divider />
      <MenuList>
        <MenuItem onClick={() => navigate('/')}>
          <ListItemIcon>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText>Home</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => navigate('/products')}>
          <ListItemIcon>
            <StoreIcon />
          </ListItemIcon>
          <ListItemText>Products</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => navigate('/cart')}>
          <ListItemIcon>
            <ShoppingCartIcon />
          </ListItemIcon>
          <ListItemText>Cart</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => navigate('/my-orders')}>
          <ListItemIcon>
            <ReceiptIcon />
          </ListItemIcon>
          <ListItemText>Orders</ListItemText>
        </MenuItem>
      </MenuList>
    </Drawer>
  );
}

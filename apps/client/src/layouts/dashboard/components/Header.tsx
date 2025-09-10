// src/components/Header.tsx
import * as React from 'react';
import Stack from '@mui/material/Stack';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import CustomDatePicker from './CustomDatePicker';
import NavbarBreadcrumbs from './NavbarBreadcrumbs';
import ColorModeIconDropdown from './ColorModeIconDropdown';
import Search from './Search';
import LanguageSwitcher from '../../../components/LanguageSwitcher'; // 👈 add this
import BackgroundModeControl from '../../../components/background/BackgroundModeControl';
import { useCartCount } from '../../../stores/useCartStore';
import { useSidebarStore } from '../../../stores/useSidebarStore';

export default function Header() {
  const cartCount = useCartCount();
  const openCartDrawer = useSidebarStore((s) => s.openCartDrawer);

  return (
    <Stack
      direction="row"
      sx={{
        display: { xs: 'none', md: 'flex' },
        width: '100%',
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
        maxWidth: { sm: '100%', md: '1700px' },
        pt: 1.5,
        pb: 1.5,
        pl: 5,
        pr: 5,
      }}
      spacing={2}
    >
      {/* <NavbarBreadcrumbs /> */}
      <BackgroundModeControl />
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
        <Search />
        <CustomDatePicker />

        {/* 🌐 Language selector */}
        <LanguageSwitcher />

        {/* <MenuButton showBadge aria-label="Open notifications">
          <NotificationsRoundedIcon />
        </MenuButton> */}

        {/* 🛒 Cart Badge with click to open drawer */}
        <IconButton
          onClick={openCartDrawer}
          aria-label="Open cart"
          title="Open cart"
          data-testid="open-cart"
        >
          <Badge
            data-testid="cart-count"
            badgeContent={cartCount}
            color="secondary"
          >
            <ShoppingCartIcon data-testid="cart-icon" />
          </Badge>
        </IconButton>

        <ColorModeIconDropdown />
      </Stack>
    </Stack>
  );
}

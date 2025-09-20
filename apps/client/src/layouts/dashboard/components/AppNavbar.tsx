import * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MuiToolbar from '@mui/material/Toolbar';
import { tabsClasses } from '@mui/material/Tabs';

import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import SideMenuMobile from './SideMenuMobile';
import MenuButton from './MenuButton';
import ColorModeIconDropdown from './ColorModeIconDropdown';
import BackgroundModeControl from '@client/components/background/BackgroundModeControl';
import LanguageSwitcher from '@client/components/LanguageSwitcher';
import { useCartCount } from '../../../stores/useCartStore';
import { useSidebarStore } from '../../../stores/useSidebarStore';

const Toolbar = styled(MuiToolbar)({
  width: '100%',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'start',
  justifyContent: 'center',
  gap: '12px',
  flexShrink: 0,
  [`& ${tabsClasses.flexContainer}`]: {
    gap: '8px',
    p: '8px',
    pb: 0,
  },
});

export default function AppNavbar() {
  const theme = useTheme();
  const isLTR = theme.direction === 'ltr';

  const [open, setOpen] = React.useState(false);
  const cartCount = useCartCount();
  const openCartDrawer = useSidebarStore((s) => s.openCartDrawer);
  const toggleDrawer = (newOpen: boolean) => () => setOpen(newOpen);

  return (
    <AppBar
      position="fixed"
      sx={{
        display: { xs: 'auto', md: 'none' },
        boxShadow: 0,
        bgcolor: 'background.paper',
        backgroundImage: 'none',
        borderBottom: '1px solid',
        borderColor: 'divider',
        top: 'var(--template-frame-height, 0px)',
      }}
    >
      <Toolbar
        variant="regular"
        sx={{
          // logical edge padding so the last icon never hugs the viewport edge
          ...(isLTR ? { pr: 1.5 } : { pl: 1.5 }),
          paddingInlineEnd: 'max(12px, env(safe-area-inset-right))',
          paddingInlineStart: 'max(12px, env(safe-area-inset-left))',
        }}
      >
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            flexGrow: 1,
            width: '100%',
            gap: 1, // keep normal spacing between controls
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'center', mr: 'auto' }}
          >
            <LanguageSwitcher />
          </Stack>

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

          <BackgroundModeControl />
          <ColorModeIconDropdown />

          {/* Wrapper adds a small logical padding so the hamburger breathes */}
          <Box sx={isLTR ? { pr: 0.75 } : { pl: 0.75 }}>
            <MenuButton aria-label="menu" onClick={toggleDrawer(true)}>
              <MenuRoundedIcon />
            </MenuButton>
          </Box>

          <SideMenuMobile open={open} toggleDrawer={toggleDrawer} />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

export function CustomIcon() {
  return (
    <Box
      sx={{
        width: '1.5rem',
        height: '1.5rem',
        bgcolor: 'black',
        borderRadius: '999px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundImage:
          'linear-gradient(135deg, hsl(210, 98%, 60%) 0%, hsl(210, 100%, 35%) 100%)',
        color: 'hsla(210, 100%, 95%, 0.9)',
        border: '1px solid',
        borderColor: 'hsl(210, 100%, 55%)',
        boxShadow: 'inset 0 2px 5px rgba(255, 255, 255, 0.3)',
      }}
    >
      <DashboardRoundedIcon color="inherit" sx={{ fontSize: '1rem' }} />
    </Box>
  );
}

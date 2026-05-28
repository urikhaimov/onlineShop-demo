// src/components/header/OptionsMenu.tsx
import * as React from 'react';
import { styled } from '@mui/material/styles';
import Divider, { dividerClasses } from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import { paperClasses } from '@mui/material/Paper';
import { listClasses } from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon, { listItemIconClasses } from '@mui/material/ListItemIcon';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import CircularProgress from '@mui/material/CircularProgress'; // ✨ NEW
import MenuButton from './MenuButton';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ListItemButton } from '@mui/material';
import { useTranslation } from 'react-i18next';

export const ROUTES = {
  PROFILE: '/profile',
  ACCOUNT: '/account',
  LOGIN: '/login',
};

const StyledListItemButton = styled(ListItemButton)(() => ({
  margin: '2px 0',
  padding: '6px 12px',
  justifyContent: 'flex-start',
}));

export default function OptionsMenu() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [busy, setBusy] = React.useState(false); // ✨ NEW
  const location = useLocation();
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  const isSelected = (path: string) => location.pathname === path;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNavigate = (path: string) => () => {
    navigate(path);
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      setBusy(false); // in case logout threw without redirect
    } finally {
      setAnchorEl(null);
    }
  };

  return (
    <>
      <MenuButton
        aria-label={t('menu.openAria', { defaultValue: 'Open menu' })}
        onClick={handleClick}
        sx={{ borderColor: 'transparent' }}
      >
        <MoreVertRoundedIcon />
      </MenuButton>

      <Menu
        anchorEl={anchorEl}
        id="menu"
        open={open}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{
          [`& .${listClasses.root}`]: { padding: '4px' },
          [`& .${paperClasses.root}`]: { padding: 0 },
          [`& .${dividerClasses.root}`]: { margin: '4px -4px' },
        }}
      >
        <StyledListItemButton
          selected={isSelected(ROUTES.PROFILE)}
          onClick={handleNavigate(ROUTES.PROFILE)}
          disabled={busy} // prevent actions while logging out
        >
          <ListItemText
            primary={t('menu.profile', { defaultValue: 'Profile' })}
          />
        </StyledListItemButton>

        <Divider />

        <StyledListItemButton
          onClick={handleLogout}
          disabled={busy} // ✨ NEW
          data-testid="logout-btn"
          sx={{
            [`& .${listItemIconClasses.root}`]: { ml: 'auto', minWidth: 0 },
          }}
        >
          <ListItemText
            primary={
              busy
                ? t('menu.loggingOut', { defaultValue: 'Logging out…' })
                : t('menu.logout', { defaultValue: 'Logout' })
            }
          />
          <ListItemIcon>
            {busy ? (
              <CircularProgress size={16} thickness={5} />
            ) : (
              <LogoutRoundedIcon fontSize="small" />
            )}
          </ListItemIcon>
        </StyledListItemButton>
      </Menu>
    </>
  );
}

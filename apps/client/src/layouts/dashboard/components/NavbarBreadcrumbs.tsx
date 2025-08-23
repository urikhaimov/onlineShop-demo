import * as React from 'react';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Breadcrumbs, { breadcrumbsClasses } from '@mui/material/Breadcrumbs';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import { useTranslation } from 'react-i18next';

const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  [`& .${breadcrumbsClasses.separator}`]: {
    color: (theme.vars || theme).palette.action.disabled,
    margin: 1,
    // Mirror the arrow in RTL for correct visual direction
    '& svg': {
      transform: theme.direction === 'rtl' ? 'scaleX(-1)' : 'none',
    },
  },
  [`& .${breadcrumbsClasses.ol}`]: {
    alignItems: 'center',
  },
}));

export default function NavbarBreadcrumbs() {
  const { t } = useTranslation();

  return (
    <StyledBreadcrumbs
      aria-label="breadcrumb"
      separator={<NavigateNextRoundedIcon fontSize="small" />}
    >
      <Typography variant="body1">{t('admin.dashboardHome')}</Typography>
      <Typography
        variant="body1"
        sx={{ color: 'text.primary', fontWeight: 600 }}
      >
        {t('nav.home')}
      </Typography>
    </StyledBreadcrumbs>
  );
}

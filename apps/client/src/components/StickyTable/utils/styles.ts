import type { Theme } from '@mui/material';
import type { SystemStyleObject } from '@mui/system';
import type { ColumnMeta } from './columnMeta';

export const getStickyStyles = (
  theme: Theme,
  meta?: ColumnMeta,
  rightGap = 0,
): SystemStyleObject<Theme> => {
  if (meta?.sticky === 'left') {
    return {
      position: 'sticky',
      left: 0,
      zIndex: 3,
      backgroundColor: theme.palette.background.paper,
    };
  }
  if (meta?.sticky === 'right') {
    return {
      position: 'sticky',
      right: rightGap,
      zIndex: 3,
      backgroundColor: theme.palette.background.paper,
    };
  }
  return {};
};

export const responsiveVisibility = (
  meta?: ColumnMeta,
): SystemStyleObject<Theme> =>
  meta?.hiddenOnMobile
    ? { display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' } }
    : {};

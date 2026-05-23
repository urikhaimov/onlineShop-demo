import * as React from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type RowAction<T> = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (ctx: T) => void;
  disabled?: (ctx: T) => boolean;
  tooltip?: (ctx: T) => string;
  /** Render with a destructive/danger visual style */
  danger?: boolean;
};

export type RowActionsProps<T> = {
  /** Accept readonly arrays too */
  actions: readonly RowAction<T>[];
  context: T;

  /** How to render actions. "auto" = buttons on wide screens, menu on small. */
  renderMode?: 'auto' | 'menu' | 'buttons';
  /** Below which breakpoint should "auto" switch to a menu. */
  menuBelow?: BreakpointKey;
  /** Size for IconButtons (when showing buttons). */
  size?: 'small' | 'medium' | 'large';
};

export default function RowActions<T>({
  actions,
  context,
  renderMode = 'auto',
  menuBelow = 'sm',
  size = 'small',
}: RowActionsProps<T>) {
  const theme = useTheme();
  const isBelow = useMediaQuery(theme.breakpoints.down(menuBelow));

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);

  const isValidAnchor = React.useCallback((el: HTMLElement | null) => {
    if (!el) return false;
    if (!document.body.contains(el)) return false;
    return el.getClientRects().length > 0;
  }, []);

  React.useEffect(() => {
    if (anchorEl && !isValidAnchor(anchorEl)) setAnchorEl(null);
  }, [anchorEl, isValidAnchor]);

  const open = isValidAnchor(anchorEl);
  const useMenu = renderMode === 'menu' || (renderMode === 'auto' && isBelow);

  if (useMenu) {
    return (
      <>
        <IconButton
          size={size}
          onClick={handleOpen}
          sx={{ display: 'inline-flex' }}
        >
          <MoreVertIcon fontSize={size === 'small' ? 'small' : 'medium'} />
        </IconButton>

        <Menu
          anchorEl={open ? anchorEl : undefined}
          open={open}
          onClose={handleClose}
          keepMounted
          disableRestoreFocus
        >
          {actions.map((a) => {
            const disabled = a.disabled?.(context) ?? false;
            const label = a.tooltip?.(context) ?? a.label;
            return (
              <MenuItem
                key={a.id}
                disabled={disabled}
                onClick={() => {
                  a.onClick(context);
                  handleClose();
                }}
                sx={{ gap: 1 }}
              >
                {a.icon}
                {label}
              </MenuItem>
            );
          })}
        </Menu>
      </>
    );
  }

  return (
    <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
      {actions.map((a) => {
        const disabled = a.disabled?.(context) ?? false;
        const label = a.tooltip?.(context) ?? a.label;
        return (
          <Tooltip key={a.id} title={label}>
            <span>
              <IconButton
                size={size}
                onClick={() => a.onClick(context)}
                disabled={disabled}
              >
                {a.icon}
              </IconButton>
            </span>
          </Tooltip>
        );
      })}
    </Box>
  );
}

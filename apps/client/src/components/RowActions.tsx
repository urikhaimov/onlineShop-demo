import * as React from 'react';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Stack,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export type RowActionId = string;

export type ConfirmConfig<T extends object> = {
  title?: string;
  description?: string | ((ctx: T) => React.ReactNode);
  confirmText?: string;
  cancelText?: string;
  color?: 'primary' | 'error' | 'warning';
};

export type RowAction<T extends object> = {
  id: RowActionId;
  label: string | ((ctx: T) => string);
  icon?: React.ReactNode;
  tooltip?: string | ((ctx: T) => string);
  color?:
    | 'inherit'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'error'
    | 'info'
    | 'warning';
  variant?: 'text' | 'outlined' | 'contained';
  /** Called when action is clicked. Can be async. */
  onClick: (ctx: T) => void | Promise<void>;
  /** Ask for confirmation before running onClick */
  confirm?: ConfirmConfig<T> | boolean;
  /** Hide this action for given row */
  visible?: (ctx: T) => boolean;
  /** Disable this action for given row */
  disabled?: (ctx: T) => boolean;
  /** Mark this action as ‘dangerous’ (default confirm color = error) */
  danger?: boolean;
};

export type RowActionsProps<T extends object> = {
  context: T;
  actions: ReadonlyArray<RowAction<T>>;
  /** 'auto' = buttons on desktop, menu on mobile */
  renderMode?: 'auto' | 'buttons' | 'menu';
  /** When renderMode='auto', switch to menu under this breakpoint (default 'sm') */
  menuBelow?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Spacing between buttons (buttons mode) */
  gap?: number;
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** If provided, called after an action completes successfully */
  onActionDone?: (id: RowActionId, ctx: T) => void;
};

function resolve<T>(v: string | ((ctx: T) => string), ctx: T): string {
  return typeof v === 'function' ? v(ctx) : v;
}

function ConfirmDialog<T extends object>({
  open,
  onClose,
  onConfirm,
  config,
  ctx,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  config: ConfirmConfig<T>;
  ctx: T;
}) {
  const {
    title = 'Are you sure?',
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    color = 'error',
  } = config;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      {description && (
        <DialogContent>
          <DialogContentText>
            {typeof description === 'function' ? description(ctx) : description}
          </DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onClose}>{cancelText}</Button>
        <Button onClick={onConfirm} color={color} variant="contained" autoFocus>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function RowActions<T extends object>({
  context,
  actions,
  renderMode = 'auto',
  menuBelow = 'sm',
  gap = 1,
  size = 'small',
  onActionDone,
}: RowActionsProps<T>) {
  const theme = useTheme();
  const isBelow = useMediaQuery(theme.breakpoints.down(menuBelow));

  // Filter by visibility
  const visibleActions = React.useMemo(
    () => actions.filter((a) => (a.visible ? a.visible(context) : true)),
    [actions, context],
  );

  // Per-action loading state
  const [loadingMap, setLoadingMap] = React.useState<
    Record<RowActionId, boolean>
  >({});
  const setLoading = (id: RowActionId, v: boolean) =>
    setLoadingMap((prev) => ({ ...prev, [id]: v }));

  // Menu state
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const openMenu = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  // Confirmation state
  const [confirmId, setConfirmId] = React.useState<RowActionId | null>(null);

  const runAction = async (action: RowAction<T>) => {
    const id = action.id;
    try {
      setLoading(id, true);
      await action.onClick(context);
      onActionDone?.(id, context);
    } finally {
      setLoading(id, false);
    }
  };

  const onActionClick = async (action: RowAction<T>) => {
    const needsConfirm =
      action.confirm &&
      (typeof action.confirm === 'object' || action.confirm === true);

    if (needsConfirm) {
      setConfirmId(action.id);
    } else {
      await runAction(action);
      // If clicked from menu, close menu afterwards
      if (menuOpen) closeMenu();
    }
  };

  const confirmConfigFor = (action: RowAction<T>): ConfirmConfig<T> => {
    if (!action.confirm) {
      return { color: action.danger ? 'error' : 'primary' };
    }
    if (typeof action.confirm === 'boolean') {
      return { color: action.danger ? 'error' : 'primary' };
    }
    return {
      color: action.danger ? 'error' : (action.confirm.color ?? 'primary'),
      ...action.confirm,
    };
  };

  // Choose render style
  const shouldUseMenu =
    renderMode === 'menu' ||
    (renderMode === 'auto' && (isBelow || visibleActions.length > 2));

  if (visibleActions.length === 0) return null;

  return (
    <Box>
      {/* Buttons mode */}
      {!shouldUseMenu && (
        <Stack direction="row" spacing={gap} alignItems="center">
          {visibleActions.map((action) => {
            const label = resolve(action.label, context);
            const disabled = action.disabled ? action.disabled(context) : false;
            const isLoading = !!loadingMap[action.id];
            const content = (
              <Button
                key={action.id}
                size={size}
                variant={action.variant ?? 'outlined'}
                color={action.color ?? (action.danger ? 'error' : 'primary')}
                startIcon={
                  isLoading ? <CircularProgress size={14} /> : action.icon
                }
                disabled={disabled || isLoading}
                onClick={() => onActionClick(action)}
              >
                {label}
              </Button>
            );
            const tooltip = action.tooltip
              ? resolve(action.tooltip, context)
              : undefined;
            return tooltip ? (
              <Tooltip key={action.id} title={tooltip}>
                <span>{content}</span>
              </Tooltip>
            ) : (
              content
            );
          })}
        </Stack>
      )}

      {/* Menu mode */}
      {shouldUseMenu && (
        <>
          <IconButton size={size} onClick={openMenu}>
            <MoreVertIcon />
          </IconButton>
          <Menu anchorEl={anchorEl} open={menuOpen} onClose={closeMenu}>
            {visibleActions.map((action) => {
              const label = resolve(action.label, context);
              const disabled = action.disabled
                ? action.disabled(context)
                : false;
              const isLoading = !!loadingMap[action.id];
              const tooltip = action.tooltip
                ? resolve(action.tooltip, context)
                : undefined;

              const item = (
                <MenuItem
                  key={action.id}
                  onClick={async () => {
                    await onActionClick(action);
                  }}
                  disabled={disabled || isLoading}
                >
                  <ListItemIcon>
                    {isLoading ? <CircularProgress size={16} /> : action.icon}
                  </ListItemIcon>
                  <ListItemText>{label}</ListItemText>
                </MenuItem>
              );

              return tooltip ? (
                <Tooltip key={action.id} title={tooltip} placement="left">
                  <span>{item}</span>
                </Tooltip>
              ) : (
                item
              );
            })}
          </Menu>
        </>
      )}

      {/* Confirmation dialog */}
      {confirmId && (
        <ConfirmDialog<T>
          open={true}
          onClose={() => setConfirmId(null)}
          onConfirm={async () => {
            const action = visibleActions.find((a) => a.id === confirmId);
            if (!action) return setConfirmId(null);
            await runAction(action);
            setConfirmId(null);
            if (menuOpen) closeMenu();
          }}
          config={confirmConfigFor(
            visibleActions.find((a) => a.id === confirmId)!,
          )}
          ctx={context}
        />
      )}
    </Box>
  );
}

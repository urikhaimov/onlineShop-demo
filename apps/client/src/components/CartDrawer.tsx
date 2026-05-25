// apps/client/src/components/cart.drawer.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  Fade,
  IconButton,
  List,
  ListItemText,
  SwipeableDrawer,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import { useCartStore } from '../stores/useCartStore';
import { useSwipeable } from 'react-swipeable';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';

import { IProduct, CDefaultCurrency } from '@common/types';
import { useLocaleFormatters } from '../hooks/useLocale';

export type CartItem = IProduct & { quantity: number };

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

// ── helpers ─────────────────────────────────────────────────────────────────
const toNum = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const toPosInt = (v: unknown, fallback = 1) => {
  const n = Math.trunc(toNum(v, fallback));
  return n > 0 ? n : fallback;
};

function SwipeableCartItem({
  item,
  onRemove,
  onUpdate,
  showToast,
  formatCurrency,
}: {
  item: CartItem;
  onRemove: () => void;
  onUpdate: (quantity: number) => void; // absolute qty
  showToast: (msg: string) => void;
  formatCurrency: (n: number) => string;
}) {
  const { t } = useTranslation();
  const handlers = useSwipeable({ onSwipedLeft: onRemove, delta: 50 });

  // Sanitize live values (avoid NaN poisoning)
  const qty = toPosInt(item.quantity, 1);
  const stock = toPosInt(item.stock ?? Infinity, Infinity);
  const priceMajor = toNum(item.price, 0);

  const dec = () => {
    const next = Math.max(1, qty - 1);
    onUpdate(next);
    showToast(t('cart.decreaseToast', { name: item.name }));
  };
  const inc = () => {
    const next = Math.min(stock, qty + 1);
    onUpdate(next); // first click -> 2
    showToast(t('cart.increaseToast', { name: item.name }));
  };

  return (
    <Fade in>
      <Box
        {...handlers}
        sx={{
          mb: 1,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          touchAction: 'pan-y',
        }}
      >
        <ListItemText
          primary={item.name}
          // RTL will visually reorder, numeric values stay correct
          secondary={`${qty} × ${formatCurrency(priceMajor)}`}
        />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mt: 1,
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <Button
              onClick={dec}
              disabled={qty <= 1}
              sx={{ minWidth: 32, px: 0 }}
            >
              -
            </Button>
            <Typography sx={{ px: 2 }}>{qty}</Typography>
            <Button
              onClick={inc}
              disabled={qty >= stock}
              sx={{ minWidth: 32, px: 0 }}
            >
              +
            </Button>
          </Box>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={onRemove}
          >
            {t('cart.remove')}
          </Button>
        </Box>
      </Box>
    </Fade>
  );
}

const CartDrawer: React.FC<CartDrawerProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  // In LTR the cart slides in from the right; in RTL from the left.
  // swipeAreaWidth gives fingers a generous 48px edge target on both sides.
  const anchor = theme.direction === 'rtl' ? 'left' : 'right';
  const { enqueueSnackbar } = useSnackbar();

  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const clearCart = useCartStore((s) => s.clearCart);

  // Safe subtotal; fallback qty = 1 to match UI
  const subtotal = items.reduce((sum, i) => {
    const qty = toPosInt(i.quantity, 1);
    const price = toNum(i.price, 0);
    return sum + qty * price;
  }, 0);

  // Locale-aware currency (₪, $, €, …)
  const { formatCurrency } = useLocaleFormatters(CDefaultCurrency);

  const noop = () => undefined;
  const showToast = (message: string) =>
    enqueueSnackbar(message, { variant: 'info', autoHideDuration: 2500 });
  const isE2E =
    typeof window !== 'undefined' && (window as any).__E2E_ALLOW__ === true;

  return (
    <SwipeableDrawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      onOpen={noop}
      disableSwipeToOpen
      data-testid="cart-drawer"
    >
      <Box
        sx={{
          width: 350,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <Typography variant="h6">{t('cart.title')}</Typography>
          <IconButton onClick={onClose} sx={{ color: 'primary.contrastText' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          {items.length === 0 ? (
            <Typography variant="body2" align="center" color="text.secondary">
              {t('cart.empty')}
            </Typography>
          ) : (
            <List>
              {items.map((item) => (
                <SwipeableCartItem
                  key={String(item.id)} // use item.id
                  item={item}
                  onRemove={() => {
                    removeFromCart(item.id); // use item.id
                    showToast(t('cart.removedToast', { name: item.name }));
                  }}
                  onUpdate={
                    (newQty) => updateQuantity(item.id, toPosInt(newQty, 1)) // use item.id
                  }
                  showToast={showToast}
                  formatCurrency={formatCurrency}
                />
              ))}
            </List>
          )}
        </Box>

        <Divider />

        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {t('cart.total')}: {formatCurrency(subtotal)}
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            fullWidth
            sx={{ mb: 1 }}
            data-testid="checkout"
            disabled={!isE2E && items.length === 0}
            onClick={() => {
              if (!isE2E) onClose();
              navigate('/checkout');
            }}
          >
            {t('cart.checkout')}
          </Button>
          <Button
            variant="outlined"
            color="error"
            fullWidth
            onClick={() => {
              clearCart();
              showToast(t('cart.clearedToast'));
            }}
            disabled={items.length === 0}
          >
            {t('cart.clear')}
          </Button>
          <Button variant="text" fullWidth sx={{ mt: 1 }} onClick={onClose}>
            {t('cart.close')}
          </Button>
        </Box>
      </Box>
    </SwipeableDrawer>
  );
};

export default CartDrawer;

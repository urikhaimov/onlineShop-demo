import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SwipeableDrawer,
  List,
  ListItemText,
  IconButton,
  Typography,
  Box,
  Button,
  Divider,
  Fade,
  Snackbar,
  Alert,
  Slide,
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import CloseIcon from '@mui/icons-material/Close';
import { useCartStore } from '../stores/useCartStore';
import { useSwipeable } from 'react-swipeable';
import { Product } from '../types/firebase';
export type CartItem = Product & { quantity: number };
const SlideTransition = React.forwardRef(function SlideTransition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

function SwipeableCartItem({
  item,
  onRemove,
  onUpdate,
  showToast,
}: {
  item: CartItem;
  onRemove: () => void;
  onUpdate: (quantity: number) => void;
  showToast: (msg: string) => void;
}) {
  const handlers = useSwipeable({
    onSwipedLeft: onRemove,
    delta: 50,
  });

  const formattedPrice = Number(item.price).toFixed(2);

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
          secondary={`$${formattedPrice} × ${item.quantity}`}
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
              onClick={() => {
                onUpdate(item.quantity - 1);
                showToast(`Reduced ${item.name}`);
              }}
              disabled={item.quantity <= 1}
              sx={{ minWidth: 32, px: 0 }}
            >
              -
            </Button>
            <Typography sx={{ px: 2 }}>{item.quantity}</Typography>
            <Button
              onClick={() => {
                onUpdate(item.quantity + 1);
                showToast(`Increased ${item.name}`);
              }}
              disabled={item.quantity >= item.stock}
              sx={{ minWidth: 32, px: 0 }}
            >
              +
            </Button>
          </Box>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => {
              onRemove();
              showToast(`Removed ${item.name}`);
            }}
          >
            Remove
          </Button>
        </Box>
      </Box>
    </Fade>
  );
}

const CartDrawer: React.FC<CartDrawerProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);

  const [toast, setToast] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
  const noop = () => undefined;
  const showToast = (message: string) => setToast({ open: true, message });

  return (
    <SwipeableDrawer anchor="right" open={open} onClose={onClose} onOpen={noop}>
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
          <Typography variant="h6">Your Cart</Typography>
          <IconButton onClick={onClose} sx={{ color: 'primary.contrastText' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          {items.length === 0 ? (
            <Typography variant="body2" align="center" color="text.secondary">
              Your cart is empty.
            </Typography>
          ) : (
            <List>
              {items.map((item) => (
                <SwipeableCartItem
                  key={item.id}
                  item={item}
                  onRemove={() => removeFromCart(item.id)}
                  onUpdate={(qty) => updateQuantity(item.id, qty)}
                  showToast={showToast}
                />
              ))}
            </List>
          )}
        </Box>

        <Divider />

        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Total: ${subtotal.toFixed(2)}
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            fullWidth
            sx={{ mb: 1 }}
            disabled={items.length === 0}
            onClick={() => {
              onClose();
              navigate('/checkout');
            }}
          >
            Checkout
          </Button>
          <Button
            variant="outlined"
            color="error"
            fullWidth
            onClick={() => {
              clearCart();
              showToast('Cart cleared');
            }}
            disabled={items.length === 0}
          >
            Clear Cart
          </Button>
          <Button variant="text" fullWidth sx={{ mt: 1 }} onClick={onClose}>
            Close
          </Button>
        </Box>
      </Box>

      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast({ open: false, message: '' })}
        TransitionComponent={SlideTransition}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="info"
          variant="filled"
          onClose={() => setToast({ open: false, message: '' })}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </SwipeableDrawer>
  );
};

export default CartDrawer;

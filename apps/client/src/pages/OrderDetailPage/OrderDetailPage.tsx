// src/pages/OrderDetailPage.tsx
import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useOrderDetails } from '../../hooks/useOrderDetails';
import { formatCurrency } from '../../utils/format';
import { footerHeight, headerHeight } from '../../config/themeConfig';
import { useAuth } from '../../hooks/useAuth';

function formatDate(date?: string | { toDate?: () => Date }) {
  if (!date) return 'N/A';
  if (typeof date === 'string') return new Date(date).toLocaleString();
  return date.toDate?.()?.toLocaleString?.() || 'N/A';
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { order, loading, error, downloading, downloadInvoice } =
    useOrderDetails(id, Boolean(user));

  if (!id || !user || loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box mt={4} textAlign="center">
        <Typography color="error">
          Error loading order. Please try again.
        </Typography>
      </Box>
    );
  }

  const {
    id: orderId,
    status,
    email = 'N/A',
    ownerName = 'N/A',
    total = 0,
    createdAt,
    payment = {
      method: 'N/A',
      status: 'N/A',
      transactionId: '',
    },
    shippingAddress = {
      fullName: '',
      street: '',
      city: '',
      country: '',
    },
    delivery = {
      eta: '',
      trackingNumber: '',
    },
    items = [],
    statusHistory = [],
  } = order;

  return (
    <Box
      sx={{
        height: `calc(100vh - ${headerHeight + footerHeight}px)`,
        overflowY: 'auto',
        mt: `${headerHeight}px`,
        mb: `${footerHeight}px`,
        px: { xs: 2, md: 4 },
        py: { xs: 2, md: 3 },
      }}
    >
      <Box
        id="invoice-content"
        sx={{
          maxWidth: 700,
          mx: 'auto',
          px: isMobile ? 1 : 3,
          overflowX: 'hidden',
        }}
      >
        <Typography variant="h5" gutterBottom textAlign="center">
          Order #{orderId}
        </Typography>

        <Paper elevation={3} sx={{ p: isMobile ? 2 : 3, borderRadius: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Status:</strong> {status}
          </Typography>

          <Typography>
            <strong>Customer:</strong> {ownerName} ({email})
          </Typography>

          <Typography>
            <strong>Date:</strong> {formatDate(createdAt)}
          </Typography>

          <Typography>
            <strong>Total:</strong> {formatCurrency(total)}
          </Typography>

          <Typography>
            <strong>Payment:</strong> {payment.method} ({payment.status})
            {payment.transactionId && ` • TX: ${payment.transactionId}`}
          </Typography>

          <Typography>
            <strong>Shipping Address:</strong>{' '}
            {[
              shippingAddress.fullName,
              shippingAddress.street,
              shippingAddress.city,
              shippingAddress.country,
            ]
              .filter(Boolean)
              .join(', ') || 'N/A'}
          </Typography>

          {delivery.eta && (
            <Typography>
              <strong>ETA:</strong> {delivery.eta}
            </Typography>
          )}

          {delivery.trackingNumber && (
            <Typography>
              <strong>Tracking Number:</strong> {delivery.trackingNumber}
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Items
          </Typography>
          <List dense disablePadding>
            {items.map((item, idx) => (
              <ListItem key={idx} disablePadding sx={{ py: 1 }}>
                <ListItemText
                  primary={`${item.name} × ${item.quantity}`}
                  secondary={`Price: ${formatCurrency(item.price)}`}
                  sx={{ pl: 1 }}
                />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Order Timeline
          </Typography>
          {statusHistory.length > 0 ? (
            statusHistory.map((entry, idx) => (
              <Typography variant="body2" color="text.secondary" key={idx}>
                • {entry.status} – {formatDate(entry.timestamp)} (by{' '}
                {entry.changedBy})
              </Typography>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No status history available.
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          <Box mt={2} textAlign="center">
            <Button
              onClick={downloadInvoice}
              variant="outlined"
              fullWidth
              disabled={downloading}
            >
              {downloading ? (
                <CircularProgress size={20} sx={{ color: 'inherit' }} />
              ) : (
                'Download Invoice (PDF)'
              )}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

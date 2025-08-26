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
import { footerHeight, headerHeight } from '../../config/themeConfig';
import { useAuth } from '../../hooks/useAuth';
import LoadingProgress from '../../components/LoadingProgress';
import { PageLayout } from '../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../services/ability.service';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '../../hooks/useLocale';

// Coerce various date-like inputs (Date | string | number | Firestore-like) to Date
function toMaybeDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;

  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  if (typeof value === 'object') {
    const v = value as any;
    if (typeof v?.toDate === 'function') {
      try {
        const d = v.toDate();
        return d instanceof Date && !isNaN(d.getTime()) ? d : undefined;
      } catch {
        return undefined;
      }
    }
    if (typeof v?.seconds === 'number') {
      const ns = typeof v?.nanoseconds === 'number' ? v.nanoseconds : 0;
      const d = new Date(v.seconds * 1000 + Math.floor(ns / 1_000_000));
      return isNaN(d.getTime()) ? undefined : d;
    }
  }
  return undefined;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { t, i18n } = useTranslation();
  const { formatCurrency, formatDateTime } = useLocaleFormatters(
    i18n.resolvedLanguage || i18n.language,
    'USD', // change currency if needed
  );

  const { order, loading, error, downloading, downloadInvoice } =
    useOrderDetails(id, Boolean(user));

  if (!id || !user || loading) {
    return <LoadingProgress />;
  }

  if (error || !order) {
    return (
      <Box mt={4} textAlign="center">
        <Typography color="error">
          {t('errors.loadOrder', {
            defaultValue: 'Error loading order. Please try again.',
          })}
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

  const createdDate = toMaybeDate(createdAt);
  const createdLabel = createdDate ? formatDateTime(createdDate) : 'N/A';

  const etaDate = toMaybeDate(delivery.eta as any);
  const etaLabel = etaDate
    ? formatDateTime(etaDate)
    : (delivery.eta as string) || '';

  return (
    <PageLayout action={EAbilityActions.READ} subject={EAbilitySubjects.CART}>
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
            {t('order.title', { defaultValue: 'Order', id: orderId })} #
            {orderId}
          </Typography>

          <Paper elevation={3} sx={{ p: isMobile ? 2 : 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              <strong>{t('order.status', { defaultValue: 'Status' })}:</strong>{' '}
              {status}
            </Typography>

            <Typography>
              <strong>
                {t('order.customer', { defaultValue: 'Customer' })}:
              </strong>{' '}
              {ownerName} ({email})
            </Typography>

            <Typography>
              <strong>{t('order.date', { defaultValue: 'Date' })}:</strong>{' '}
              {createdLabel}
            </Typography>

            <Typography>
              <strong>{t('order.total', { defaultValue: 'Total' })}:</strong>{' '}
              {typeof total === 'number' ? formatCurrency(total) : 'N/A'}
            </Typography>

            <Typography>
              <strong>
                {t('order.payment', { defaultValue: 'Payment' })}:
              </strong>{' '}
              {payment.method} ({payment.status})
              {payment.transactionId && ` • TX: ${payment.transactionId}`}
            </Typography>

            <Typography>
              <strong>
                {t('order.shippingAddress', {
                  defaultValue: 'Shipping Address',
                })}
                :
              </strong>{' '}
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
                <strong>{t('order.eta', { defaultValue: 'ETA' })}:</strong>{' '}
                {etaLabel}
              </Typography>
            )}

            {delivery.trackingNumber && (
              <Typography>
                <strong>
                  {t('order.trackingNumber', {
                    defaultValue: 'Tracking Number',
                  })}
                  :
                </strong>{' '}
                {delivery.trackingNumber}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              {t('order.items', { defaultValue: 'Items' })}
            </Typography>
            <List dense disablePadding>
              {items.map((item, idx) => (
                <ListItem key={idx} disablePadding sx={{ py: 1 }}>
                  <ListItemText
                    primary={`${item.name} × ${item.quantity}`}
                    secondary={`${t('order.price', {
                      defaultValue: 'Price',
                    })}: ${
                      typeof item.price === 'number'
                        ? formatCurrency(item.price)
                        : 'N/A'
                    }`}
                    sx={{ pl: 1 }}
                  />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              {t('order.timeline', { defaultValue: 'Order Timeline' })}
            </Typography>
            {statusHistory.length > 0 ? (
              statusHistory.map((entry, idx) => {
                const ts = toMaybeDate(entry.timestamp as any);
                const tsLabel = ts ? formatDateTime(ts) : 'N/A';
                return (
                  <Typography variant="body2" color="text.secondary" key={idx}>
                    • {entry.status} – {tsLabel} (by {entry.changedBy})
                  </Typography>
                );
              })
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('order.noHistory', {
                  defaultValue: 'No status history available.',
                })}
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
                  t('order.downloadInvoice', {
                    defaultValue: 'Download Invoice (PDF)',
                  })
                )}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>
    </PageLayout>
  );
}

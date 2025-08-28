// src/pages/OrderDetailPage.tsx
import * as React from 'react';
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
import { alpha } from '@mui/material/styles';
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
import { useThemeStore } from '../../stores/useThemeStore';

// Coerce various date-like inputs (Date | string | number | Firestore-like) to Date
function toMaybeDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;

  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  if (typeof value === 'object') {
    type FirestoreLike = {
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
    };
    const v = value as FirestoreLike;
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

  // 🧩 Theme store — theme-aware values
  const { themeSettings } = useThemeStore();
  const isDark = themeSettings?.darkMode ?? theme.palette.mode === 'dark';
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius = (themeSettings?.borderRadius ??
    theme.shape.borderRadius) as number;
  const primaryMain = themeSettings?.primaryColor || theme.palette.primary.main;

  // Derived UI tokens
  const outerPx = { xs: 2, md: Math.max(3, Math.round(3 * spacingScale)) };
  const outerPy = { xs: 2, md: Math.max(2, Math.round(2 * spacingScale)) };
  const cardPadding = { xs: 2 * spacingScale, md: 3 * spacingScale };
  const cardShadow = isDark ? theme.shadows[4] : theme.shadows[2];
  const dividerColor =
    theme.vars?.palette?.divider ??
    alpha(theme.palette.text.primary, isDark ? 0.2 : 0.12);
  const outlinedHoverBg = alpha(primaryMain, isDark ? 0.12 : 0.08);

  const { t } = useTranslation();
  const { formatCurrency, formatDateTime } = useLocaleFormatters();

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

  const etaDate = toMaybeDate(
    delivery.eta as
      | string
      | number
      | Date
      | { toDate?: () => Date; seconds?: number; nanoseconds?: number },
  );
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
          px: outerPx,
          py: outerPy,
          backgroundColor: theme.palette.background.default,
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

          <Paper
            elevation={0}
            sx={{
              p: cardPadding,
              borderRadius: radius,
              boxShadow: cardShadow,
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${dividerColor}`,
            }}
          >
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
              {formatCurrency(total)}
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

            <Divider sx={{ my: 2, borderColor: dividerColor }} />

            <Typography variant="h6" gutterBottom>
              {t('order.items', { defaultValue: 'Items' })}
            </Typography>
            <List dense disablePadding>
              {items.map((item, idx) => (
                <ListItem key={idx} disablePadding sx={{ py: spacingScale }}>
                  <ListItemText
                    primary={`${item.name} × ${item.quantity}`}
                    secondary={`${t('order.price', {
                      defaultValue: 'Price',
                    })}: ${
                      typeof item.price === 'number'
                        ? formatCurrency(item.price)
                        : 'N/A'
                    }`}
                    sx={{ pl: spacingScale }}
                  />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2, borderColor: dividerColor }} />

            <Typography variant="h6" gutterBottom>
              {t('order.timeline', { defaultValue: 'Order Timeline' })}
            </Typography>
            {statusHistory.length > 0 ? (
              statusHistory.map((entry, idx) => {
                const ts = toMaybeDate(entry.timestamp as unknown);
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

            <Divider sx={{ my: 2, borderColor: dividerColor }} />

            <Box mt={2} textAlign="center">
              <Button
                onClick={downloadInvoice}
                variant="outlined"
                fullWidth
                disabled={downloading}
                sx={{
                  borderRadius: radius,
                  color: primaryMain,
                  borderColor: primaryMain,
                  '&:hover': {
                    backgroundColor: outlinedHoverBg,
                    borderColor: primaryMain,
                  },
                }}
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

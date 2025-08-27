// src/components/orders/OrderCard.tsx
import * as React from 'react';
import {
  Paper,
  Typography,
  Divider,
  Chip,
  Link,
  Box,
  useTheme,
  type ChipProps,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import type { TOrder as Order } from '@common/types';
import { DASH } from '../../utils/columns.util';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '../../hooks/useLocale';
import { useThemeStore } from '../../stores/useThemeStore';

// Map order status → Chip color (typed)
function getStatusColor(status: string): ChipProps['color'] {
  switch (status) {
    case 'processing':
      return 'warning';
    case 'shipped':
      return 'info';
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

// Coerce Date | string | number | Firestore-like to Date
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

type Props = { order: Order };

const OrderCard: React.FC<Props> = ({ order }) => {
  const theme = useTheme();
  const { themeSettings } = useThemeStore();

  const { i18n } = useTranslation();
  const { formatCurrency, formatDateTime } = useLocaleFormatters(
    i18n.resolvedLanguage || i18n.language,
    'USD',
  );

  // ---- Theme-aware tokens from store + theme
  const isDark =
    themeSettings?.darkMode ?? (theme.palette.mode === 'dark' ? true : false);
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius = (themeSettings?.borderRadius ??
    theme.shape.borderRadius) as number;

  // Scalars that respect spacing scale
  const pad = 2 * spacingScale;

  // Background that respects CSS vars when available
  const paperBg = theme.vars?.palette?.background?.paperChannel
    ? `rgba(${theme.vars.palette.background.paperChannel} / 1)`
    : theme.palette.background.paper;

  // Outlines & shadows tuned for light/dark
  const outline =
    theme.vars?.palette?.divider ??
    alpha(theme.palette.text.primary, isDark ? 0.22 : 0.12);

  const hoverOutline =
    theme.vars?.palette?.divider ??
    alpha(theme.palette.primary.main, isDark ? 0.35 : 0.22);

  const baseShadow = isDark ? theme.shadows[3] : theme.shadows[1];
  const hoverShadow = isDark ? theme.shadows[6] : theme.shadows[3];

  const created =
    toMaybeDate(order.createdAt) ?? toMaybeDate(order.metadata?.createdAt);

  return (
    <Paper
      elevation={0}
      sx={{
        p: pad,
        borderRadius: radius,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        bgcolor: paperBg,
        border: '1px solid',
        borderColor: outline,
        boxShadow: baseShadow,
        transition:
          'box-shadow .2s ease, border-color .2s ease, transform .15s ease',
        '&:hover': {
          boxShadow: hoverShadow,
          borderColor: hoverOutline,
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
        <Link
          component={RouterLink}
          to={`/order/${order.id}`}
          underline="hover"
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 0.5,
            color: 'inherit',
            textDecoration: 'none',
            maxWidth: '100%',
          }}
        >
          <Box component="span">Order #</Box>
          <Box
            component="span"
            title={order.id}
            sx={{
              minWidth: 0,
              flex: '1 1 auto',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontFamily: 'monospace',
            }}
          >
            {order.id}
          </Box>
        </Link>
      </Typography>

      <Chip
        label={order.status}
        color={getStatusColor(order.status)}
        size="small"
        sx={{ my: spacingScale * 0.5 }}
      />

      <Typography variant="body2" sx={{ mb: 0.25 }}>
        Date: {created ? formatDateTime(created) : DASH}
      </Typography>

      {/* Placeholders for now; style as secondary to de-emphasize */}
      <Typography variant="body2" color="text.secondary">
        Paid with: Visa ending in 4242
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Shipping: Express Delivery
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        Delivery ETA: July 8, 2025
      </Typography>

      <Typography variant="body2" fontWeight={600} gutterBottom>
        Total:{' '}
        {typeof order.amount === 'number' ? formatCurrency(order.amount) : DASH}
      </Typography>

      <Divider sx={{ my: spacingScale * 1 }} />

      <Box component="ul" sx={{ m: 0, p: 0, pl: 2 }}>
        {(order.items ?? []).map((item, idx) => (
          <li key={idx}>
            <Typography variant="body2">
              {item.name} × {item.quantity} — Price:{' '}
              {typeof item.price === 'number'
                ? formatCurrency(item.price)
                : DASH}
            </Typography>
          </li>
        ))}
      </Box>
    </Paper>
  );
};

export default OrderCard;

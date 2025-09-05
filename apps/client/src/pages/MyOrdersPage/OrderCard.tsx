// src/components/orders/OrderCard.tsx
import * as React from 'react';
import {
  Box,
  Chip,
  type ChipProps,
  Divider,
  Link,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';

import type { TOrder as Order } from '@common/types';
import { DASH, asDate } from '../../utils/columns.util';
import { useLocaleFormatters } from '../../hooks/useLocale';
import { useThemeStore } from '../../stores/useThemeStore';

import OrderNotes from '../../components/orders/OrderNotes';
import OrderTimestamps from '../../components/orders/OrderTimestamps';
import OrderDelivery from '../../components/orders/OrderDelivery';
import OrderPayment from '../../components/orders/OrderPayment';
import OrderItems from '../../components/orders/OrderItems';
import OrderShipping from '../../components/orders/OrderShipping';
import OrderCustomer from '../../components/orders/OrderCustomer';

// Map order status → Chip color (typed)
function getStatusColor(status: string): ChipProps['color'] {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'confirmed':
      return 'info';
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

type Props = { order: Order };

const OrderCard: React.FC<Props> = ({ order }) => {
  const theme = useTheme();
  const { themeSettings } = useThemeStore();
  const { formatCurrency, formatDateTime } = useLocaleFormatters();

  // ---- Theme-aware tokens from store + theme
  const isDark = themeSettings?.darkMode ?? theme.palette.mode === 'dark';
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const radius = (themeSettings?.borderRadius ??
    theme.shape.borderRadius) as number;

  // Paddings respond to scale and viewport
  const padX = { xs: 1.5 * spacingScale, sm: 2 * spacingScale };
  const padY = { xs: 1.25 * spacingScale, sm: 1.5 * spacingScale };

  const paperBg = theme.vars?.palette?.background?.paperChannel
    ? `rgba(${theme.vars.palette.background.paperChannel} / 1)`
    : theme.palette.background.paper;

  const outline =
    theme.vars?.palette?.divider ??
    alpha(theme.palette.text.primary, isDark ? 0.22 : 0.12);

  const hoverOutline =
    theme.vars?.palette?.divider ??
    alpha(theme.palette.primary.main, isDark ? 0.35 : 0.22);

  const baseShadow = isDark ? theme.shadows[3] : theme.shadows[1];
  const hoverShadow = isDark ? theme.shadows[6] : theme.shadows[3];

  const created = asDate(order.metadata?.createdAt);

  // Optional quick meta line (created date + total if present)
  const total =
    (order as any).total ??
    (order as any).totalAmount ??
    (Array.isArray(order.items)
      ? order.items.reduce(
          (s, it: any) =>
            s + Number(it?.price ?? 0) * Number(it?.quantity ?? 1),
          0,
        )
      : undefined);

  return (
    <Paper
      elevation={0}
      sx={{
        px: padX,
        py: padY,
        borderRadius: radius,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        bgcolor: paperBg,
        border: '1px solid',
        borderColor: outline,
        boxShadow: baseShadow,
        overflow: 'hidden', // ✅ prevent horizontal scroll on mobile
        transition:
          'box-shadow .2s ease, border-color .2s ease, transform .15s ease',
        '&:hover': {
          boxShadow: hoverShadow,
          borderColor: hoverOutline,
          transform: 'translateY(-1px)',
        },
      }}
    >
      {/* Header row: title + status chip */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minWidth: 0, // ✅ enables text ellipsis
          mb: { xs: 1, sm: 1.25 },
        }}
      >
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={{
            minWidth: 0,
            flex: '1 1 auto',
            lineHeight: 1.2,
          }}
        >
          <Link
            component={RouterLink}
            to={`/order/${order.id}`}
            underline="hover"
            sx={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 0.5,
              color: 'inherit',
              textDecoration: 'none',
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
              Order&nbsp;#
            </Box>
            <Box
              component="span"
              title={order.id}
              sx={{
                minWidth: 0,
                flex: '0 1 auto',
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
          sx={{ ml: 'auto' }}
        />
      </Box>

      {/* Meta row (subtle): created date • total */}
      <Typography
        variant="caption"
        sx={{
          color: theme.palette.text.secondary,
          display: 'block',
          mb: { xs: 1.25 * spacingScale, sm: 1.5 * spacingScale },
          wordBreak: 'break-word',
        }}
      >
        {created ? formatDateTime(created) : DASH}
        {typeof total === 'number' && (
          <>
            {' \u2022 '}
            {formatCurrency(total)}
          </>
        )}
      </Typography>

      {/* Content sections stacked with consistent rhythm */}
      <Stack
        spacing={{ xs: 1.25 * spacingScale, sm: 1.5 * spacingScale }}
        divider={
          <Divider
            flexItem
            sx={{
              borderColor: outline,
              opacity: isDark ? 0.5 : 0.7,
            }}
          />
        }
        sx={{
          // ✅ ensure children cannot cause horizontal overflow
          '& > *': { minWidth: 0 },
        }}
      >
        <OrderCustomer order={order} />
        <OrderShipping order={order} />
        <OrderItems order={order} />
        <OrderPayment order={order} />
        <OrderDelivery order={order} />
        <OrderTimestamps order={order} />
        <OrderNotes order={order} />
      </Stack>
    </Paper>
  );
};

export default OrderCard;

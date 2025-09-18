import * as React from 'react';
import { Box, useTheme } from '@mui/material';
import type { TOrder } from '@common/types';

import OrderCustomer from '../../../components/orders/OrderCustomer';
import OrderShipping from '../../../components/orders/OrderShipping';
import OrderItems from '../../../components/orders/OrderItems';
import OrderPayment from '../../../components/orders/OrderPayment';
import OrderDelivery from '../../../components/orders/OrderDelivery';
import OrderTimestamps from '../../../components/orders/OrderTimestamps';
import OrderNotes from '../../../components/orders/OrderNotes';
import { useThemeStore } from '../../../stores/useThemeStore';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers: currency conversion + normalization
// ──────────────────────────────────────────────────────────────────────────────
const ZERO_DEC = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

function toMajorFromMinor(minor?: number, currency?: string) {
  if (minor === null) return undefined;
  const cur = (currency || '').toUpperCase();
  return ZERO_DEC.has(cur) ? Math.round(minor) : minor / 100;
}

/** Map service/webhook statuses to UI statuses */
function mapStatus(status?: string): TOrder['status'] {
  switch ((status || '').toLowerCase()) {
    case 'paid':
    case 'succeeded':
      return 'confirmed';
    case 'open':
    case 'processing':
    case 'requires_confirmation':
    case 'requires_action':
      return 'pending';
    case 'canceled':
    case 'cancelled':
    case 'refunded':
      return 'cancelled';
    default:
      // keep whatever came if it already matches app statuses
      if (
        status === 'pending' ||
        status === 'confirmed' ||
        status === 'shipped' ||
        status === 'delivered' ||
        status === 'cancelled'
      ) {
        return status as TOrder['status'];
      }
      return 'pending';
  }
}

/** Build a view-safe order that fills/normalizes missing fields */
function useNormalizedOrder(order: TOrder): TOrder {
  // Pick a usable total (major). Preference: order.total → totalMajor → totalAmount
  const currency =
    order.currency || (order.payment?.currency as string | undefined);
  const totalFromMinor =
    toMajorFromMinor(
      (order as any).totalAmount ?? (order as any).totalMinor,
      currency,
    ) ?? undefined;

  // Also accept a server-provided totalMajor field if present

  const totalFromTotalMajor: number | undefined = (order as any).totalMajor;

  const safeTotal =
    typeof order.total === 'number'
      ? order.total
      : typeof totalFromTotalMajor === 'number'
        ? totalFromTotalMajor
        : totalFromMinor;

  // Flatten Stripe-style shipping into TOrderAddress
  // Accept both { shippingAddress: { address: {...}, name, phone } } and already-flat shapes
  const s: any = (order as any).shippingAddress || {};
  const addr = s.address || s || {};
  const flatShipping =
    s || addr
      ? {
          fullName: s.name ?? order.ownerName ?? undefined,
          phone: s.phone ?? undefined,
          street: addr.line1 ?? addr.line ?? addr.street ?? undefined,
          city: addr.city ?? undefined,
          postalCode: addr.postalCode ?? addr.postal_code ?? undefined,
          country: (addr.country || '').toUpperCase() || undefined,
        }
      : undefined;

  // Ensure payment block exists for rendering
  const safePayment =
    order.payment && (order.payment as any).method
      ? order.payment
      : {
          method: 'card',
          status: mapStatus(order.status) === 'confirmed' ? 'paid' : 'unpaid',
          transactionId: order.paymentIntentId,
          currency,
          receipt_email: order.email ?? undefined,
        };

  return {
    ...order,
    status: mapStatus(order.status as any),
    total: safeTotal,
    currency,
    shippingAddress: flatShipping ?? order.shippingAddress,
    payment: safePayment,
  } as TOrder;
}

// ──────────────────────────────────────────────────────────────────────────────

type Props = { order: TOrder };

const OrderExpandedRow: React.FC<Props> = ({ order }) => {
  const mui = useTheme();
  const { themeSettings } = useThemeStore();
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const gap = mui.spacing(Math.max(1, Math.round(2 * spacingScale)));

  const normalized = useNormalizedOrder(order);

  return (
    <Box
      sx={{
        display: 'grid',
        gap,
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
      }}
    >
      <OrderCustomer order={normalized} />
      <OrderShipping order={normalized} />
      <OrderItems order={normalized} />
      <OrderPayment order={normalized} />
      <OrderDelivery order={normalized} />
      <OrderTimestamps order={normalized} />
      <OrderNotes order={normalized} />
    </Box>
  );
};

export default OrderExpandedRow;

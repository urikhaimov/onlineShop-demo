// src/pages/admin/orders/components/OrderExpandedRow.tsx
import * as React from 'react';
import { Box, useTheme } from '@mui/material';
import type {
  TOrder,
  TOrderStatus,
  TOrderPayment,
  StripePaymentIntentStatus,
} from '@common/types';

import OrderCustomer from '../../../components/orders/OrderCustomer';
import OrderShipping from '../../../components/orders/OrderShipping';
import OrderItems from '../../../components/orders/OrderItems';
import OrderPayment from '../../../components/orders/OrderPayment';
import OrderDelivery from '../../../components/orders/OrderDelivery';
import OrderTimestamps from '../../../components/orders/OrderTimestamps';
import OrderNotes from '../../../components/orders/OrderNotes';
import { useThemeStore } from '../../../stores/useThemeStore';

// ──────────────────────────────────────────────────────────────────────────────
// Currency helpers
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

// ──────────────────────────────────────────────────────────────────────────────
// Canonical status mapping (backend + legacy + provider → TOrderStatus)
// Canon: 'open' | 'authorized' | 'paid' | 'shipped' | 'delivered' | 'refunded' | 'canceled'
// ──────────────────────────────────────────────────────────────────────────────
function statusToCanon(s?: string): TOrderStatus {
  const raw = String(s ?? '').toLowerCase();

  // already canonical?
  if (
    raw === 'open' ||
    raw === 'authorized' ||
    raw === 'paid' ||
    raw === 'shipped' ||
    raw === 'delivered' ||
    raw === 'refunded' ||
    raw === 'canceled'
  )
    return raw as TOrderStatus;

  // legacy UI names
  if (raw === 'pending') return 'open';
  if (raw === 'confirmed') return 'paid';
  if (raw === 'cancelled') return 'canceled';

  // provider / Stripe-inspired statuses
  if (raw === 'succeeded') return 'paid';
  if (raw === 'canceled') return 'canceled';
  if (
    raw === 'processing' ||
    raw === 'requires_confirmation' ||
    raw === 'requires_action' ||
    raw === 'requires_capture' ||
    raw === 'requires_payment_method'
  )
    return 'open';

  // default safe
  return 'open';
}

// When order.payment is missing, derive a Stripe-like status (type-safe)
function deriveProviderStatus(canon: TOrderStatus): StripePaymentIntentStatus {
  if (canon === 'paid') return 'succeeded';
  if (canon === 'canceled') return 'canceled';
  // not paid yet -> something pending
  return 'processing';
}

// Flatten Stripe-style shipping into our flat view model
function flattenShipping(order: TOrder) {
  const s: any = order.shippingAddress || {};
  const addr = s.address || s || {};
  return s || addr
    ? {
        fullName: s.name ?? order.ownerName ?? undefined,
        phone: s.phone ?? undefined,
        street: addr.line1 ?? addr.line ?? addr.street ?? undefined,
        city: addr.city ?? undefined,
        postalCode: addr.postalCode ?? addr.postal_code ?? undefined,
        country: (addr.country || '').toUpperCase() || undefined,
      }
    : undefined;
}

/** Build a view-safe order that fills/normalizes missing fields (canonical). */
function useNormalizedOrder(order: TOrder): TOrder {
  const currency =
    order.currency || (order.payment?.currency as string | undefined);

  const totalFromMinor =
    toMajorFromMinor(
      (order as any).totalAmount ?? (order as any).totalMinor,
      currency,
    ) ?? undefined;

  const totalFromTotalMajor: number | undefined = (order as any).totalMajor;

  const total =
    typeof order.total === 'number'
      ? order.total
      : typeof totalFromTotalMajor === 'number'
        ? totalFromTotalMajor
        : totalFromMinor;

  const canonStatus = statusToCanon(order.status as any);

  const payment: TOrderPayment =
    order.payment && (order.payment as any).method
      ? order.payment
      : {
          method: 'card',
          status: deriveProviderStatus(canonStatus), // ✅ Stripe-typed status
          transactionId: order.paymentIntentId,
          currency,
          receipt_email: order.email ?? undefined,
        };

  return {
    ...order,
    status: canonStatus, // ✅ canonical vocab
    total,
    currency,
    shippingAddress: flattenShipping(order) ?? order.shippingAddress,
    payment,
  };
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

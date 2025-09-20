// apps/client/src/utils/normalizeOrder.ts
import type { TOrder, TOrderStatus } from '@common/types';

type ProviderPaymentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'requires_capture'
  | 'processing'
  | 'succeeded'
  | 'canceled'
  | string;

// canonical map (backend → client)
const STATUS_MAP: Record<string, TOrderStatus> = {
  open: 'open',
  paid: 'paid',
  refunded: 'refunded',
  canceled: 'canceled', // US spelling
  cancelled: 'canceled', // tolerate UK spelling

  // legacy client names (map to canon)
  pending: 'open',
  confirmed: 'paid',

  // fulfillment states if you use them
  shipped: 'shipped' as TOrderStatus,
  delivered: 'delivered' as TOrderStatus,
};

function normalizeOrderStatus(
  raw?: string,
  provider?: ProviderPaymentStatus,
): TOrderStatus {
  const s = String(raw ?? '').toLowerCase();
  if (s && STATUS_MAP[s]) return STATUS_MAP[s];

  // fallback to Stripe provider state when order.status missing
  switch (provider) {
    case 'succeeded':
      return 'paid';
    case 'canceled':
      return 'canceled';
    case 'requires_capture':
    case 'requires_action':
    case 'requires_confirmation':
    case 'requires_payment_method':
    case 'processing':
    default:
      return 'open';
  }
}

function toUpperCurrency(cur?: string) {
  return (cur ?? 'ILS').toUpperCase();
}

function toIsoDate(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v._seconds === 'number') {
    const ms = v._seconds * 1000 + Math.floor((v._nanoseconds || 0) / 1e6);
    return new Date(ms).toISOString();
  }
  if (typeof v.toDate === 'function') {
    try {
      return v.toDate().toISOString();
    } catch {
      // ignore
    }
  }
  if (v instanceof Date) return v.toISOString();
  return undefined;
}

export function normalizeOrder(dto: any): TOrder {
  const currency = toUpperCurrency(
    dto?.currency ?? dto?.payment?.currency ?? 'ILS',
  );

  const totalMinor =
    typeof dto?.totalMinor === 'number'
      ? dto.totalMinor
      : Math.round((Number(dto?.total) || 0) * 100);

  const providerStatus = (dto?.payment?.status ?? '') as ProviderPaymentStatus;

  const shipping = dto?.shippingAddress ?? dto?.shipping ?? {};
  const shippingAddressObj = shipping?.address ?? {};

  const order: TOrder = {
    id: String(dto?.id ?? dto?.paymentIntentId ?? ''),
    userId: String(dto?.userId ?? ''),
    email: dto?.customer?.email ?? dto?.email ?? null,

    total: dto?.total ?? (totalMinor ? totalMinor / 100 : undefined),
    totalAmount: totalMinor,
    currency,

    paymentIntentId: dto?.paymentIntentId ?? dto?.id ?? undefined,

    // ✅ key line: exact alignment with backend; legacy tolerated
    status: normalizeOrderStatus(dto?.status, providerStatus),

    items: Array.isArray(dto?.items)
      ? dto.items.map((i: any) => ({
          productId: String(i?.productId ?? ''),
          name: String(i?.name ?? ''),
          quantity: Number(i?.quantity ?? 0),
          price: Number(i?.price ?? 0),
          image: i?.image,
        }))
      : [],

    payment: {
      method: String(dto?.payment?.method ?? 'card'),
      status: providerStatus === 'succeeded' ? 'paid' : 'unpaid',
      transactionId: dto?.payment?.transactionId ?? dto?.id ?? undefined,
      currency,
      receipt_email: dto?.payment?.receipt_email,
    },

    ownerName: dto?.ownerName ?? dto?.customer?.name ?? null,
    passportId: dto?.passportId ?? null,

    shippingAddress: {
      fullName:
        shipping?.name ??
        dto?.shipping?.name ??
        dto?.ownerName ??
        dto?.customer?.name ??
        undefined,
      phone: shipping?.phone ?? dto?.customer?.phone ?? undefined,
      street:
        shippingAddressObj?.line1 ??
        shipping?.street ??
        dto?.shipping?.street ??
        undefined,
      city: shippingAddressObj?.city ?? shipping?.city ?? undefined,
      postalCode:
        shippingAddressObj?.postalCode ?? shipping?.postalCode ?? undefined,
      country: shippingAddressObj?.country ?? shipping?.country ?? undefined,
    },

    delivery: dto?.delivery
      ? {
          provider: dto?.delivery?.provider,
          trackingNumber: dto?.delivery?.trackingNumber,
          eta: dto?.delivery?.eta,
        }
      : undefined,

    notes: dto?.notes ?? null,

    statusHistory: Array.isArray(dto?.statusHistory)
      ? dto.statusHistory
      : undefined,

    createdAt: toIsoDate(dto?.createdAt),
    updatedAt: toIsoDate(dto?.updatedAt),

    metadata: (dto?.metadata ?? {}) as any,
  };

  return order;
}

export default normalizeOrder;

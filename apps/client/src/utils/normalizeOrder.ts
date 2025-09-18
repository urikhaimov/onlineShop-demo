// apps/client/src/utils/normalizeOrder.ts
import type { TOrder, TOrderStatus } from '@common/types';

type ProviderPaymentStatus =
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'canceled'
  | 'canceled' // stripe sometimes
  | string;

const statusMap: Record<string, TOrderStatus> = {
  open: 'pending', // <- PI “draft”/open becomes our domain 'pending'
  pending: 'pending',
  confirmed: 'confirmed',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

function toUpperCurrency(cur?: string) {
  return (cur ?? 'ILS').toUpperCase();
}

export function normalizeOrder(dto: any): TOrder {
  const currency = toUpperCurrency(
    dto?.currency ?? dto?.payment?.currency ?? 'ILS',
  );

  const totalMinor = Number(
    dto?.totalMinor ?? Math.round((Number(dto?.total) || 0) * 100),
  );

  const paymentProviderStatus = String(
    (dto?.payment?.status ?? '') as ProviderPaymentStatus,
  );

  const paid = paymentProviderStatus === 'succeeded';

  const shipping = dto?.shippingAddress ?? dto?.shipping ?? {};
  const shippingAddressObj = shipping?.address ?? {};

  const order: TOrder = {
    id: String(dto?.id ?? dto?.paymentIntentId ?? ''),
    userId: String(dto?.userId ?? ''),
    email: dto?.customer?.email ?? dto?.email ?? null,

    // MAJOR (optional mirror) and MINOR (source of truth)
    total: dto?.total ?? (totalMinor ? totalMinor / 100 : undefined),
    totalAmount: totalMinor,

    currency,

    paymentIntentId: dto?.paymentIntentId ?? dto?.id ?? undefined,

    status: statusMap[dto?.status] ?? 'pending',

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
      status: paid ? 'paid' : 'unpaid',
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

    createdAt: dto?.createdAt,
    updatedAt: dto?.updatedAt,

    metadata: dto?.metadata ?? ({} as any),
  };

  return order;
}

export default normalizeOrder;

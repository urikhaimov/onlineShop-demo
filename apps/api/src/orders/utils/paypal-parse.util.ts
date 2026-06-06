import type {
  PayPalOrder,
  PayPalPurchaseUnit,
  PayPalPayer,
} from '../services/paypal-payments.service';

export function extractEmailFromCapture(order: PayPalOrder): string | null {
  return order.payer?.email_address?.trim() || null;
}

export function extractShippingFromCapture(unit: PayPalPurchaseUnit) {
  const ship = unit.shipping;
  if (!ship) return null;
  return {
    fullName: ship.name?.full_name ?? '',
    street: ship.address?.address_line_1 ?? '',
    city: ship.address?.admin_area_2 ?? '',
    postalCode: ship.address?.postal_code ?? '',
    country: ship.address?.country_code ?? '',
    phone: '',
  };
}

export function extractPeopleFromCapture(order: PayPalOrder) {
  const unit = order.purchase_units?.[0];
  const payer: PayPalPayer = order.payer ?? {};
  const fullName = [payer.name?.given_name, payer.name?.surname]
    .filter(Boolean)
    .join(' ');

  const shippingAddress = unit ? extractShippingFromCapture(unit) : null;

  const customer = {
    ...(fullName ? { name: fullName } : {}),
    ...(payer.email_address ? { email: payer.email_address } : {}),
  };

  return { shippingAddress, customer };
}

export function extractCaptureId(order: PayPalOrder): string | null {
  return order.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
}

import type Stripe from 'stripe';

export function extractEmailFromPI(pi: Stripe.PaymentIntent): string | null {
  const receipt = (pi.receipt_email || '').trim();
  if (receipt) return receipt;

  const chargeEmail = (
    (pi as any).latest_charge?.billing_details?.email as string | undefined
  )?.trim();
  if (chargeEmail) return chargeEmail;

  const mdEmail = (pi.metadata?.email as string | undefined)?.trim();
  return mdEmail || null;
}

export function extractShippingFromPI(pi: Stripe.PaymentIntent) {
  // metadata.shippingAddress (JSON) → pi.shipping → latest_charge.shipping
  if (pi.metadata?.shippingAddress) {
    try {
      return JSON.parse(pi.metadata.shippingAddress);
    } catch {
      /* ignore */
    }
  }

  if (pi.shipping) {
    return {
      fullName: pi.shipping.name ?? '',
      phone: pi.shipping.phone ?? '',
      street: pi.shipping.address?.line1 ?? '',
      city: pi.shipping.address?.city ?? '',
      postalCode: pi.shipping.address?.postal_code ?? '',
      country: pi.shipping.address?.country ?? '',
    };
  }

  const lc: any = (pi as any).latest_charge;
  if (lc && typeof lc === 'object' && lc.shipping) {
    return {
      fullName: lc.shipping.name ?? '',
      phone: lc.shipping.phone ?? '',
      street: lc.shipping.address?.line1 ?? '',
      city: lc.shipping.address?.city ?? '',
      postalCode: lc.shipping.address?.postal_code ?? '',
      country: lc.shipping.address?.country ?? '',
    };
  }

  return null;
}

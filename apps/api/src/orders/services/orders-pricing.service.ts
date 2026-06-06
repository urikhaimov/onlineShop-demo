import { Injectable, Inject } from '@nestjs/common';
import { OrdersRepository } from '../repositories/orders.repository';
import { normalizeRate, toMinor } from '../utils/orders.helpers';

const VAT_APPLIES_TO_SHIPPING =
  String(process.env.VAT_APPLIES_TO_SHIPPING ?? '1') !== '0';
const DISCOUNT_BEFORE_TAX =
  String(process.env.DISCOUNT_BEFORE_TAX ?? '1') !== '0';

@Injectable()
export class OrdersPricingService {
  constructor(
    @Inject(OrdersRepository)
    private readonly repo: OrdersRepository,
  ) {}

  async loadOrderSettings() {
    const snap = await this.repo.settingsDoc().get();
    const d = (snap.exists ? snap.data() : {}) as any;
    return {
      shippingMinor: toMinor(d?.shipping),
      discountMinor: toMinor(d?.discount),
      vatRate: normalizeRate(d?.taxRate), // fraction, e.g., 0.17
    };
  }

  async subtotalFromCart(cart?: any[]) {
    if (!Array.isArray(cart) || cart.length === 0) return 0;
    let subtotal = 0;
    for (const it of cart) {
      const id = String(it.productId ?? it.id ?? '').trim();
      const qty = Math.max(0, Number(it.quantity ?? it.qty ?? 1) || 0);
      if (!id || qty <= 0) continue;
      const snap = await this.repo.productsCol().doc(id).get();
      const unitMajor =
        Number(snap.get('price')) || Number(it.priceMajor || it.price) || 0;
      if (unitMajor > 0 && qty > 0) {
        subtotal += toMinor(unitMajor) * qty;
      }
    }
    return subtotal;
  }

  async computeTotals(cart?: any[], fallbackTotalMajor?: number) {
    const subtotalMinor =
      (await this.subtotalFromCart(cart)) || toMinor(fallbackTotalMajor);

    const { shippingMinor, discountMinor, vatRate } =
      await this.loadOrderSettings();

    const vatBase =
      subtotalMinor +
      (VAT_APPLIES_TO_SHIPPING ? shippingMinor : 0) -
      (DISCOUNT_BEFORE_TAX ? discountMinor : 0);

    const vatMinor = Math.round(Math.max(0, vatBase) * vatRate);
    const amountMinor = Math.max(
      0,
      subtotalMinor + shippingMinor - discountMinor + vatMinor,
    );

    return {
      subtotalMinor,
      shippingMinor,
      discountMinor,
      vatRate,
      vatMinor,
      amountMinor,
    };
  }
}

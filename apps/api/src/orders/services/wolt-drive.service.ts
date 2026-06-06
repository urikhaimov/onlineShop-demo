import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WoltDelivery {
  id: string;
  status: string;
  tracking?: { url?: string };
  estimated_dropoff_time?: string;
  merchant_order_reference_id?: string;
}

@Injectable()
export class WoltDriveService {
  private readonly logger = new Logger(WoltDriveService.name);

  private readonly baseUrl: string;
  private readonly merchantId: string;
  private readonly merchantKey: string;
  private readonly venueId: string;
  private readonly currency: string;
  private readonly enabled: boolean;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.baseUrl =
      config.get<string>('WOLT_BASE_URL') ?? 'https://daas-public-api.wolt.com';
    this.merchantId = config.get<string>('WOLT_MERCHANT_ID') ?? '';
    this.merchantKey = config.get<string>('WOLT_MERCHANT_KEY') ?? '';
    this.venueId = config.get<string>('WOLT_VENUE_ID') ?? '';
    this.currency = config.get<string>('WOLT_CURRENCY') ?? 'EUR';
    this.enabled = Boolean(this.merchantId && this.merchantKey && this.venueId);
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  async dispatchDelivery(order: {
    id: string;
    shippingAddress?: {
      name?: string;
      phone?: string;
      address?: {
        line1?: string;
        city?: string;
        postalCode?: string;
        country?: string;
      };
      fullName?: string;
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
    customer?: { name?: string; phone?: string };
    totalMinor?: number;
    totalMajor?: number;
    currency?: string;
  }): Promise<WoltDelivery | null> {
    if (!this.enabled) {
      this.logger.debug('Wolt Drive not configured — skipping dispatch');
      return null;
    }

    const addr = order.shippingAddress;
    const formattedAddress = this.formatAddress(addr);

    if (!formattedAddress) {
      this.logger.warn(
        `[Wolt] Order ${order.id} has no deliverable address — skipping`,
      );
      return null;
    }

    const contactName =
      addr?.name ?? addr?.fullName ?? order.customer?.name ?? 'Customer';
    const contactPhone = addr?.phone ?? order.customer?.phone ?? '';
    const amountMinor =
      order.totalMinor ?? Math.round((order.totalMajor ?? 0) * 100);
    const currency = (order.currency ?? this.currency).toUpperCase();

    const body = {
      merchant_order_reference_id: order.id,
      order_value: { amount: amountMinor, currency },
      pickup: { venue_id: this.venueId },
      dropoff: {
        location: { formatted_address: formattedAddress },
        contact: {
          name: contactName,
          phone_number: contactPhone,
          send_tracking_link_sms: Boolean(contactPhone),
        },
      },
    };

    const response = await axios.post<WoltDelivery>(
      `${this.baseUrl}/merchants/${this.merchantId}/deliveries`,
      body,
      { headers: this.authHeader() },
    );

    this.logger.log(
      `[Wolt] Delivery ${response.data.id} created for order ${order.id}`,
    );
    return response.data;
  }

  async getDelivery(deliveryId: string): Promise<WoltDelivery | null> {
    if (!this.enabled) return null;
    const response = await axios.get<WoltDelivery>(
      `${this.baseUrl}/merchants/${this.merchantId}/deliveries/${deliveryId}`,
      { headers: this.authHeader() },
    );
    return response.data;
  }

  private formatAddress(
    addr?: {
      address?: {
        line1?: string;
        city?: string;
        postalCode?: string;
        country?: string;
      };
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    } | null,
  ): string | null {
    if (!addr) return null;
    const parts = addr.address
      ? [
          addr.address.line1,
          addr.address.city,
          addr.address.postalCode,
          addr.address.country,
        ]
      : [addr.street, addr.city, addr.postalCode, addr.country];
    const joined = parts.filter(Boolean).join(', ');
    return joined || null;
  }

  private authHeader() {
    return {
      Authorization: `Bearer ${this.merchantKey}`,
      'Content-Type': 'application/json',
    };
  }
}

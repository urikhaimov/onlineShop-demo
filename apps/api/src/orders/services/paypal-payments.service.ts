import {
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Firestore } from '@google-cloud/firestore';
import axios from 'axios';

export interface PayPalOrder {
  id: string;
  status: string;
  purchase_units: PayPalPurchaseUnit[];
  payer?: PayPalPayer;
  links?: { href: string; rel: string; method: string }[];
}

export interface PayPalPurchaseUnit {
  reference_id?: string;
  custom_id?: string;
  description?: string;
  amount: { currency_code: string; value: string };
  shipping?: {
    name?: { full_name?: string };
    address?: {
      address_line_1?: string;
      admin_area_2?: string;
      postal_code?: string;
      country_code?: string;
    };
  };
  payments?: {
    captures?: PayPalCapture[];
  };
}

export interface PayPalCapture {
  id: string;
  status: string;
  amount: { currency_code: string; value: string };
  final_capture?: boolean;
  custom_id?: string;
  create_time?: string;
  update_time?: string;
}

export interface PayPalPayer {
  name?: { given_name?: string; surname?: string };
  email_address?: string;
  payer_id?: string;
}

@Injectable()
export class PayPalPaymentsService {
  private readonly logger = new Logger(PayPalPaymentsService.name);
  private readonly webhookId: string;

  // Resolved lazily — Firestore takes priority over env vars
  private _clientId = '';
  private _clientSecret = '';
  private _baseUrl = '';
  private _credentialsLoaded = false;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Optional() @Inject(Firestore) private readonly db?: Firestore,
  ) {
    this.webhookId = config.get<string>('PAYPAL_WEBHOOK_ID') ?? '';
  }

  private async resolveCredentials() {
    if (this._credentialsLoaded) return;

    // Try Firestore first
    if (this.db) {
      try {
        const snap = await this.db.collection('settings').doc('paypal').get();
        if (snap.exists) {
          const data = snap.data() as {
            clientId?: string;
            clientSecret?: string;
            sandbox?: boolean;
          };
          if (data.clientId) this._clientId = data.clientId;
          if (data.clientSecret) this._clientSecret = data.clientSecret;
          const sandbox = data.sandbox !== false;
          this._baseUrl = sandbox
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';
          this._credentialsLoaded = true;
          return;
        }
      } catch {
        // fall through to env vars
      }
    }

    // Fallback to env vars
    this._clientId = this.config.get<string>('PAYPAL_CLIENT_ID') ?? '';
    this._clientSecret = this.config.get<string>('PAYPAL_CLIENT_SECRET') ?? '';
    const sandbox =
      (this.config.get<string>('PAYPAL_SANDBOX') ?? 'true') !== 'false';
    this._baseUrl = sandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
    this._credentialsLoaded = true;

    if (!this._clientId || !this._clientSecret) {
      this.logger.warn(
        'PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set — configure via wizard or env vars.',
      );
    }
  }

  /** Call when settings change so next request reloads from Firestore */
  invalidateCredentials() {
    this._credentialsLoaded = false;
  }

  private async assertConfigured() {
    await this.resolveCredentials();
    if (!this._clientId || !this._clientSecret) {
      throw new ServiceUnavailableException(
        'PayPal is not configured. Use the Setup Wizard or set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.',
      );
    }
  }

  private async getAccessToken(): Promise<string> {
    await this.assertConfigured();
    const res = await axios.post<{ access_token: string }>(
      `${this._baseUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        auth: { username: this._clientId, password: this._clientSecret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    return res.data.access_token;
  }

  private authHeader(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async createOrder(opts: {
    amountMinor: number;
    currency: string;
    orderId?: string;
    description?: string;
    requestId?: string;
  }): Promise<PayPalOrder> {
    const token = await this.getAccessToken();
    const value = (opts.amountMinor / 100).toFixed(2);
    const currency = opts.currency.toUpperCase();

    const headers: Record<string, string> = {
      ...this.authHeader(token),
      Prefer: 'return=representation',
    };
    if (opts.requestId) {
      headers['PayPal-Request-Id'] = opts.requestId.slice(0, 255);
    }

    const res = await axios.post<PayPalOrder>(
      `${this._baseUrl}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: { currency_code: currency, value },
            custom_id: opts.orderId ?? undefined,
            description: opts.description ?? 'Online shop order',
          },
        ],
        application_context: {
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
        },
      },
      { headers },
    );

    this.logger.log(`createOrder ${res.data.id} ${currency} ${value}`);
    return res.data;
  }

  async captureOrder(
    orderId: string,
    requestId?: string,
  ): Promise<PayPalOrder> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = {
      ...this.authHeader(token),
      Prefer: 'return=representation',
    };
    if (requestId) {
      headers['PayPal-Request-Id'] = requestId.slice(0, 255);
    }

    const res = await axios.post<PayPalOrder>(
      `${this._baseUrl}/v2/checkout/orders/${orderId}/capture`,
      {},
      { headers },
    );

    this.logger.log(`captureOrder ${orderId} status=${res.data.status}`);
    return res.data;
  }

  async retrieveOrder(orderId: string): Promise<PayPalOrder> {
    const token = await this.getAccessToken();
    const res = await axios.get<PayPalOrder>(
      `${this._baseUrl}/v2/checkout/orders/${orderId}`,
      { headers: this.authHeader(token) },
    );
    return res.data;
  }

  /** Returns true when PayPal verifies the webhook signature. */
  async verifyWebhookSignature(params: {
    authAlgo: string;
    certUrl: string;
    transmissionId: string;
    transmissionSig: string;
    transmissionTime: string;
    webhookEvent: unknown;
  }): Promise<boolean> {
    if (!this.webhookId) return false;
    try {
      const token = await this.getAccessToken();
      const res = await axios.post<{ verification_status: string }>(
        `${this._baseUrl}/v1/notifications/verify-webhook-signature`,
        {
          auth_algo: params.authAlgo,
          cert_url: params.certUrl,
          transmission_id: params.transmissionId,
          transmission_sig: params.transmissionSig,
          transmission_time: params.transmissionTime,
          webhook_id: this.webhookId,
          webhook_event: params.webhookEvent,
        },
        { headers: this.authHeader(token) },
      );
      return res.data.verification_status === 'SUCCESS';
    } catch (e: any) {
      this.logger.warn(`verifyWebhookSignature failed: ${e?.message}`);
      return false;
    }
  }
}

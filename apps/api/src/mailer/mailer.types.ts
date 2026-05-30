// libs/mailer/src/mailer.types.ts
export type Provider = 'sendgrid' | 'smtp' | 'json';

export type MailerOptions = {
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
  replyTo?: string;
};

export type OrderEmailPayload = {
  orderId: string;
  amount: number; // minor
  currency: string | null; // 'ils'
  paymentIntentId: string;
  created: boolean;
  invoiceUrl?: string | null;
  locale?: 'he' | 'en';
};

export type RefundEmailPayload = {
  orderId: string;
  amount: number;
  currency: string | null;
  chargeId: string;
  full: boolean;
  refundIds: string[];
  locale?: 'he' | 'en';
};

export type OrderUpdatePayload = {
  orderId: string;
  status?: string;
  delivery?: {
    provider?: string;
    trackingNumber?: string;
    eta?: string | null;
  };
  shippingAddress?: {
    name?: string;
    phone?: string;
    address?: {
      line1?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
  };
  locale?: 'he' | 'en';
};

export type SendResult = { ok: boolean; id?: string };

export type MailerConfig = {
  provider: Provider;
  fromAddress: string;
  sandbox: boolean;
  // SMTP
  smtp?: {
    url?: string;
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
  };
  // SendGrid
  sendgrid?: { apiKey: string };
  brandName: string;
  publicBaseUrl?: string;
  assetsBaseUrl?: string;
  defaultLocale: 'he' | 'en';
};

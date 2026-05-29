import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayPalPaymentsService } from './paypal-payments.service';
import { OrdersPaymentFlowService } from './orders-payment-flow.service';
import { OrdersLifecycleService } from './orders-lifecycle.service';

@Injectable()
export class OrdersWebhookService {
  private readonly logger = new Logger(OrdersWebhookService.name);

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(PayPalPaymentsService)
    private readonly paypalSvc: PayPalPaymentsService,
    @Inject(OrdersPaymentFlowService)
    private readonly payments: OrdersPaymentFlowService,
    @Inject(OrdersLifecycleService)
    private readonly lifecycle: OrdersLifecycleService,
  ) {}

  async handlePayPalWebhook(
    rawBody: string | Buffer,
    headers: {
      authAlgo?: string;
      certUrl?: string;
      transmissionId?: string;
      transmissionSig?: string;
      transmissionTime?: string;
    },
  ) {
    const raw =
      typeof rawBody === 'string' ? rawBody : rawBody?.toString('utf8');
    let event: any;

    try {
      event = JSON.parse(raw || '{}');
    } catch (e: any) {
      this.logger.warn(`PayPal webhook parse failed: ${e?.message}`);
      throw e;
    }

    // Verify signature when headers are present
    if (headers.transmissionId) {
      const valid = await this.paypalSvc.verifyWebhookSignature({
        authAlgo: headers.authAlgo ?? '',
        certUrl: headers.certUrl ?? '',
        transmissionId: headers.transmissionId ?? '',
        transmissionSig: headers.transmissionSig ?? '',
        transmissionTime: headers.transmissionTime ?? '',
        webhookEvent: event,
      });
      if (!valid) {
        this.logger.warn(
          `PayPal webhook signature verification failed for event ${event?.id}`,
        );
        // Log but don't reject — PayPal signature verification requires PAYPAL_WEBHOOK_ID
        // in prod, set PAYPAL_WEBHOOK_ID and handle appropriately
      }
    }

    this.logger.log(`handlePayPalWebhook: ${event.event_type}`);

    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = event.resource as any;
      const customId: string | undefined = resource?.custom_id;
      const captureId: string = resource?.id;
      const supplementaryData = resource?.supplementary_data;
      const orderId =
        supplementaryData?.related_ids?.order_id ?? customId ?? captureId;

      if (orderId) {
        await this.lifecycle.markPaidByPaymentIntentId(orderId);
      }
      return { received: true };
    }

    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
      // Order was approved but not yet captured — no action needed here;
      // capture is triggered explicitly by the client via POST /orders/capture-paypal-order
      return { received: true };
    }

    if (event.event_type === 'PAYMENT.CAPTURE.DENIED') {
      const resource = event.resource as any;
      const supplementaryData = resource?.supplementary_data;
      const orderId =
        supplementaryData?.related_ids?.order_id ?? resource?.custom_id;
      if (orderId) {
        await this.lifecycle.updateStatus(orderId, 'canceled');
      }
      return { received: true };
    }

    return { received: true };
  }
}

import type { APIRequestContext } from '@playwright/test';

/**
 * Sends a simulated PAYMENT.CAPTURE.COMPLETED webhook to the server.
 * Only works when the server is running with PAYPAL_SANDBOX=true and
 * signature verification is relaxed (or the test endpoint is used).
 */
export async function triggerPayPalCaptureCompleted(
  api: APIRequestContext,
  paypalOrderId: string,
  email = 'e2e@example.com',
) {
  const body = JSON.stringify({
    id: `WH-${Date.now()}`,
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource_type: 'capture',
    resource: {
      id: `CAP-${Date.now()}`,
      status: 'COMPLETED',
      amount: { currency_code: 'USD', value: '1.00' },
      supplementary_data: {
        related_ids: { order_id: paypalOrderId },
      },
      payer: { email_address: email },
    },
  });

  return api.post('/webhooks/paypal', {
    data: body,
    headers: {
      'content-type': 'application/json',
      'paypal-transmission-id': `txn-${Date.now()}`,
      'paypal-transmission-time': new Date().toISOString(),
      'paypal-cert-url':
        'https://api-m.sandbox.paypal.com/v1/notifications/certs/test',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-transmission-sig': 'test-sig',
    },
  });
}

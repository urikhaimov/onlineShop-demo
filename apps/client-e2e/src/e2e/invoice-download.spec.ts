import {
  test,
  expect,
  request,
  type APIRequestContext,
} from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { triggerPayPalCaptureCompleted } from '../utils/paypal';

const API_HOST = process.env.API_HOST ?? 'http://127.0.0.1:3000';
const API_PREFIX = process.env.API_PREFIX ?? 'api';
const API = process.env.API_BASE_URL ?? `${API_HOST}/${API_PREFIX}`;

/** Poll invoice endpoint until it exists (preferred readiness probe). */
async function waitForInvoiceReady(
  api: APIRequestContext,
  orderId: string,
  timeoutMs = 90_000,
) {
  const start = Date.now();
  const candidates = [
    `/payments/orders/${orderId}/invoice`,
    `/invoices/${orderId}.pdf`,
    `/invoice/${orderId}.pdf`,
    `/invoices/order/${orderId}.pdf`,
    `/invoice/order/${orderId}.pdf`,
    `/orders/public/invoice/${orderId}.pdf`,
    `/orders/public/${orderId}/invoice.pdf`,
  ];

  let lastStatus = 0;
  while (Date.now() - start < timeoutMs) {
    for (const p of candidates) {
      const res = await api.head(p);
      lastStatus = res.status();
      if (res.ok()) return p;
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(
    `Invoice not ready for ${orderId}; lastStatus=${lastStatus} (tried ${candidates.join(', ')})`,
  );
}

test.describe('Invoice PDF generation', () => {
  test.setTimeout(120_000);

  test('create → webhook → download invoice PDF', async (_, testInfo) => {
    const paypalOrderId = `E2ETEST${Date.now()}`;
    const api = await request.newContext({ baseURL: API });

    await triggerPayPalCaptureCompleted(api, paypalOrderId, 'e2e@example.com');

    const invoicePath = await waitForInvoiceReady(api, paypalOrderId);

    const res = await api.get(invoicePath);
    expect(res.ok(), `GET ${invoicePath} => ${res.status()}`).toBeTruthy();

    const buf = await res.body();
    expect((res.headers()['content-type'] || '').toLowerCase()).toContain(
      'pdf',
    );
    expect(buf.byteLength).toBeGreaterThan(1024);

    const out = path.join(testInfo.outputDir, `invoice_${paypalOrderId}.pdf`);
    await fs.promises.writeFile(out, buf);
    testInfo.attach('invoice', { body: buf, contentType: 'application/pdf' });
    console.log('Saved:', out);
  });
});

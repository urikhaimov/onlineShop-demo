import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InvoiceService } from '../src/invoice/invoice.service';
import { OrdersService } from '../src/orders/orders.service';

describe('InvoiceService.generatePdfBuffer (smoke)', () => {
  let invoices: InvoiceService;

  // Minimal, fake order the PDF can render from
  const fakeOrder = {
    id: 'smoke-order-001',
    userId: 'test-user',
    items: [{ id: 'sku_1', name: 'Test Item', qty: 1, price: 49.9 }],
    total: 49.9,
    currency: 'ils',
    status: 'paid',
    paymentIntentId: 'pi_test_123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InvoiceService,
        // Mock any deps InvoiceService expects.
        // Adjust or add more if your actual service has more constructor deps.
        {
          provide: OrdersService,
          useValue: {
            // handy if your service fetches order details internally
            getOrderDoc: jest.fn().mockResolvedValue(fakeOrder),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => undefined), // default to undefined; override if your service reads config
          },
        },
      ],
    }).compile();

    invoices = moduleRef.get(InvoiceService);
  });

  it('returns a non-empty Buffer/Uint8Array', async () => {
    // Support either signature:
    //   generatePdfBuffer(order: any)
    //   or generatePdfBuffer(orderId: string)
    const maybeAny = invoices as any;

    let pdfOut: unknown;

    if (typeof maybeAny.generatePdfBuffer === 'function') {
      // Most common: accept an order object
      try {
        pdfOut = await maybeAny.generatePdfBuffer(fakeOrder);
      } catch {
        // Some implementations expect an id and look up the order themselves
        pdfOut = await maybeAny.generatePdfBuffer(fakeOrder.id);
      }
    } else {
      throw new Error('InvoiceService.generatePdfBuffer is not a function');
    }

    // Normalize to Node Buffer for size assertions
    const buf = Buffer.isBuffer(pdfOut)
      ? (pdfOut as Buffer)
      : Buffer.from(pdfOut as Uint8Array);

    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.byteLength).toBeGreaterThan(256); // lenient threshold for smoke test
  }, 20000); // allow a little time if PDF generation does some I/O
});

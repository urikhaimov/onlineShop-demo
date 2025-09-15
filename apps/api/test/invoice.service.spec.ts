/// <reference types="jest" />
// apps/api/test/invoice.service.spec.ts

import { InvoiceService, InvoiceInput } from '../src/invoice/invoice.service';

// Mock Firebase Storage before importing anything that might use it
jest.mock('firebase-admin/storage', () => ({ getStorage: jest.fn() }));
import { getStorage } from 'firebase-admin/storage';

describe('InvoiceService', () => {
  let svc: InvoiceService;

  beforeEach(() => {
    svc = new InvoiceService();
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // generatePdfBuffer
  // ────────────────────────────────────────────────────────────────────────────

  it('generatePdfBuffer: outputs a PDF with key text (items + VAT)', async () => {
    const input: InvoiceInput = {
      orderId: 'order_123',
      createdAt: new Date('2025-09-15T10:00:00Z'),
      amountCents: 10000,
      currency: 'ils',
      email: 'buyer@example.com',
      items: [
        { id: 'p1', name: 'Product 1', qty: 2, priceCents: 2500 },
        { id: 'p2', name: 'Product 2', qty: 1, priceCents: 5000 },
      ],
      vatRate: 0.17,
      storeName: 'Bunder Shop',
    };

    const buf = await svc.generatePdfBuffer(input);

    // basic PDF sanity checks
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(400); // should be non-trivial in size
    expect(buf.slice(0, 4).toString()).toBe('%PDF'); // pdf header

    // the text strings we write with pdfkit should be present in the buffer
    const s = buf.toString('utf8');
    expect(s).toContain('INVOICE');
    expect(s).toContain('Invoice #: order_123');
    expect(s).toContain('VAT (17%)');
    expect(s).toContain('Bunder Shop');
    // do not assert exact currency symbol (locale dependent)
  });

  it('generatePdfBuffer: works without line items (single total row)', async () => {
    const input: InvoiceInput = {
      orderId: 'order_2',
      createdAt: new Date('2025-09-15T10:00:00Z'),
      amountCents: 5000,
      currency: 'usd',
      email: 'x@y.z',
    };

    const buf = await svc.generatePdfBuffer(input);
    const s = buf.toString('utf8');

    expect(s).toContain('INVOICE');
    expect(s).toContain('Invoice #: order_2');
    expect(s).toContain('Order items'); // placeholder row when no per-item prices
  });

  // ────────────────────────────────────────────────────────────────────────────
  // uploadBuffer
  // ────────────────────────────────────────────────────────────────────────────

  it('uploadBuffer: uploads to storage and returns signed URL', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const getSignedUrl = jest
      .fn()
      .mockResolvedValue(['https://example.com/signed.pdf']);

    (getStorage as jest.Mock).mockReturnValue({
      bucket: () => ({
        file: (path: string) => ({ save, getSignedUrl }),
      }),
    });

    process.env.FIREBASE_STORAGE_BUCKET = 'test-bucket';

    const pdf = Buffer.from('%PDF-fake%');
    const out = await svc.uploadBuffer('order_abc', pdf);

    // saved with correct options
    expect(save).toHaveBeenCalledWith(
      pdf,
      expect.objectContaining({
        contentType: 'application/pdf',
        resumable: false,
        public: false,
        metadata: expect.objectContaining({
          cacheControl: 'public, max-age=31536000',
        }),
      }),
    );

    expect(out.path).toBe('invoices/order_abc.pdf');
    expect(out.url).toBe('https://example.com/signed.pdf');
    expect(out.buffer).toBe(pdf);
  });

  it('uploadBuffer: handles signed-url failure gracefully (url undefined)', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const getSignedUrl = jest.fn().mockRejectedValue(new Error('nope'));

    (getStorage as jest.Mock).mockReturnValue({
      bucket: () => ({
        file: (_path: string) => ({ save, getSignedUrl }),
      }),
    });

    const out = await svc.uploadBuffer('order_xyz', Buffer.from('%PDF%'));
    expect(out.path).toBe('invoices/order_xyz.pdf');
    expect(out.url).toBeUndefined();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // generateAndUpload
  // ────────────────────────────────────────────────────────────────────────────

  it('generateAndUpload: pipes generate → upload', async () => {
    const pdf = Buffer.from('%PDF-fake%');

    const genSpy = jest.spyOn(svc, 'generatePdfBuffer').mockResolvedValue(pdf);
    const upSpy = jest.spyOn(svc, 'uploadBuffer').mockResolvedValue({
      buffer: pdf,
      path: 'invoices/order_9.pdf',
      url: 'https://u',
    });

    const input: InvoiceInput = {
      orderId: 'order_9',
      createdAt: '2025-09-15T10:00:00Z',
      amountCents: 111,
      currency: 'eur',
    };

    const res = await svc.generateAndUpload(input);

    expect(genSpy).toHaveBeenCalledWith(input);
    expect(upSpy).toHaveBeenCalledWith('order_9', pdf);
    expect(res.url).toBe('https://u');
    expect(res.path).toBe('invoices/order_9.pdf');
  });
});

import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit'; // If you see TS error, enable esModuleInterop or: import * as PDFDocument from 'pdfkit';
import { adminBucket } from '../firebase/admin'; // ✅ uses storageBucket set at initializeApp; bypasses emulator if configured
import { adminDb } from '@common/firebase'; // ✅ Firestore handle used across the app

export type InvoiceItem = {
  id: string;
  name?: string;
  qty: number;
  priceCents?: number;
};

export type InvoiceInput = {
  orderId: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  amountCents: number; // total in cents
  currency: string; // e.g. 'ILS'
  email?: string | null;
  items?: InvoiceItem[];
  vatRate?: number; // e.g. 0.17
  storeName?: string;
};

export type InvoiceUpload = {
  buffer: Buffer;
  path: string;
  url?: string;
  sizeBytes?: number;
  contentType?: string;
  updatedAt?: string;
};

type InvoiceStoredMeta = {
  path: string;
  generatedAt: string;
  sizeBytes?: number;
  contentType?: string;
};

@Injectable()
export class InvoiceService {
  // ---- formatting -----------------------------------------------------------
  private formatMoney(cents: number, currency: string) {
    const value = (cents ?? 0) / 100;
    try {
      return new Intl.NumberFormat('en-IL', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(value);
    } catch {
      return `${value.toFixed(2)} ${String(currency || '').toUpperCase()}`;
    }
  }

  private invoicesPath(orderId: string) {
    // Flat path keeps test simple and URLs short; easy to change later
    return `invoices/${orderId}.pdf`;
  }

  // ---- PDF generation -------------------------------------------------------
  async generatePdfBuffer(data: InvoiceInput): Promise<Buffer> {
    return await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (d) => chunks.push(d));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text(data.storeName ?? 'Your Store', { align: 'right' });
      doc.moveDown(0.5);
      doc.fontSize(28).text('INVOICE', { align: 'left' });
      doc.moveDown();

      const created = new Date(data.createdAt);
      doc
        .fontSize(11)
        .text(`Invoice #: ${data.orderId}`)
        .text(`Date: ${created.toLocaleDateString('en-IL')}`)
        .text(`Bill to: ${data.email ?? '-'}`);

      doc.moveDown();

      // Table header
      doc
        .fontSize(12)
        .text('Item', 50)
        .text('Qty', 330)
        .text('Price', 390)
        .text('Total', 470);
      doc
        .moveTo(50, doc.y + 5)
        .lineTo(550, doc.y + 5)
        .stroke();

      // Rows
      let subtotalCents = 0;
      const rows = (data.items ?? []).map((it) => {
        const price = it.priceCents ?? 0;
        const line = price * (it.qty ?? 1);
        subtotalCents += line;
        return { label: it.name || it.id, qty: it.qty, price, total: line };
      });

      const startY = doc.y + 10;
      let y = startY;
      const lineH = 18;

      if (rows.length) {
        for (const r of rows) {
          doc.text(r.label, 50, y);
          doc.text(String(r.qty), 330, y);
          doc.text(this.formatMoney(r.price, data.currency), 390, y);
          doc.text(this.formatMoney(r.total, data.currency), 470, y);
          y += lineH;
        }
      } else {
        // No line-level prices — single row
        doc.text('Order items', 50, y);
        doc.text('-', 330, y);
        doc.text('-', 390, y);
        doc.text(this.formatMoney(data.amountCents, data.currency), 470, y);
        y += lineH;
      }

      y += 10;
      doc.moveTo(350, y).lineTo(550, y).stroke();
      y += 10;

      const computedSubtotal = rows.length ? subtotalCents : data.amountCents;
      doc
        .fontSize(12)
        .text('Subtotal:', 350, y)
        .text(this.formatMoney(computedSubtotal, data.currency), 470, y);
      y += lineH;

      let vatCents = 0;
      if (typeof data.vatRate === 'number' && data.vatRate > 0) {
        vatCents = Math.round(computedSubtotal * data.vatRate);
        doc
          .text(`VAT (${Math.round(data.vatRate * 100)}%):`, 350, y)
          .text(this.formatMoney(vatCents, data.currency), 470, y);
        y += lineH;
      }

      const totalCents = rows.length
        ? computedSubtotal + vatCents
        : data.amountCents;
      doc
        .fontSize(13)
        .text('Total:', 350, y)
        .text(this.formatMoney(totalCents, data.currency), 470, y);

      doc.end();
    });
  }

  // ---- Storage helpers ------------------------------------------------------
  private async getSignedUrlForPath(path: string, days = 7) {
    const bucket = adminBucket();
    const file = bucket.file(path);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * days);
    const [signed] = await file.getSignedUrl({ action: 'read', expires });
    return signed as string;
  }

  private async persistInvoiceRef(
    orderId: string,
    meta: InvoiceStoredMeta,
  ): Promise<void> {
    try {
      await adminDb
        .collection('orders')
        .doc(orderId)
        .set(
          {
            invoice: meta,
            invoicePath: meta.path, // convenience field for quick lookups
            updatedAt: new Date().toISOString(),
          } as any,
          { merge: true },
        );
    } catch {
      // Not fatal
    }
  }

  async uploadBuffer(orderId: string, buffer: Buffer): Promise<InvoiceUpload> {
    const bucket = adminBucket();
    const path = this.invoicesPath(orderId);
    const file = bucket.file(path);

    const contentType = 'application/pdf';
    const contentDisposition = `attachment; filename="invoice-${orderId}.pdf"`;

    await file.save(buffer, {
      contentType,
      resumable: false,
      public: false,
      metadata: {
        cacheControl: 'public, max-age=31536000',
        contentDisposition,
        contentLanguage: 'en',
      },
    });

    let url: string | undefined;
    try {
      url = await this.getSignedUrlForPath(path, 7);
    } catch {
      // Signed URLs might fail in emulator; ignore.
    }

    // Try to grab size/updated metadata
    let sizeBytes: number | undefined;
    let updatedAt: string | undefined;
    try {
      const [meta] = await file.getMetadata();
      sizeBytes = Number(meta.size || 0) || undefined;
      updatedAt = meta.updated;
      // Persist a pointer on the order for fast invoice discovery
      await this.persistInvoiceRef(orderId, {
        path,
        generatedAt: new Date().toISOString(),
        sizeBytes,
        contentType,
      });
    } catch {
      // ignore
    }

    return { buffer, path, url, sizeBytes, contentType, updatedAt };
  }

  async generateAndUpload(data: InvoiceInput): Promise<InvoiceUpload> {
    const buffer = await this.generatePdfBuffer(data);
    return this.uploadBuffer(data.orderId, buffer);
  }

  // ---- Public helpers used by webhooks/controllers/tests --------------------
  /**
   * ✅ Loads the order from Firestore, builds an InvoiceInput,
   * generates the PDF, uploads it to Storage, and persists a reference on the order.
   */
  async generateAndStorePdf(orderId: string): Promise<InvoiceUpload> {
    const snap = await adminDb.collection('orders').doc(orderId).get();
    if (!snap.exists) throw new Error(`Order ${orderId} not found`);

    const o = snap.data() as any;

    const createdAt = o?.createdAt ?? new Date().toISOString();
    const updatedAt = o?.updatedAt ?? createdAt;
    const amountCents: number =
      typeof o?.totalAmount === 'number' ? o.totalAmount : 0;

    // Currency: prefer payment.currency; fallback to env (ILS default)
    const currency =
      (o?.payment?.currency as string) || process.env.DEFAULT_CURRENCY || 'ILS';

    // Line items (optional; falls back to single-row total if no price info)
    const items: InvoiceItem[] | undefined = Array.isArray(o?.items)
      ? o.items
          .map((it: any) => ({
            id: String(it.productId ?? it.id ?? 'item'),
            name: it.name,
            qty: Number(it.quantity ?? it.qty ?? 1),
            // try common fields; if missing, we’ll render single-row total
            priceCents:
              typeof it.priceCents === 'number'
                ? it.priceCents
                : typeof it.price_minor === 'number'
                  ? it.price_minor
                  : typeof it.priceMinor === 'number'
                    ? it.priceMinor
                    : undefined,
          }))
          .filter((r: InvoiceItem) => r.qty > 0)
      : undefined;

    const vatRate =
      typeof o?.vatRate === 'number'
        ? o.vatRate
        : process.env.VAT_RATE
          ? Number(process.env.VAT_RATE)
          : undefined;

    const data: InvoiceInput = {
      orderId,
      createdAt,
      updatedAt,
      amountCents,
      currency: String(currency).toUpperCase(),
      email: o?.email ?? null,
      items,
      vatRate,
      storeName:
        process.env.STORE_NAME || process.env.SHOP_NAME || 'Online Shop',
    };

    return this.generateAndUpload(data);
  }

  /**
   * Returns existing file metadata if a PDF already exists in Storage.
   */
  async getExistingFileMeta(orderId: string): Promise<InvoiceUpload | null> {
    const bucket = adminBucket();
    const path = this.invoicesPath(orderId);
    const file = bucket.file(path);
    try {
      const [exists] = await file.exists();
      if (!exists) return null;

      let url: string | undefined;
      try {
        url = await this.getSignedUrlForPath(path, 7);
      } catch {
        // Signed URLs might fail in emulator; ignore.
      }

      const [meta] = await file.getMetadata();
      return {
        buffer: Buffer.alloc(0), // not downloaded here
        path,
        url,
        sizeBytes: Number(meta.size || 0) || undefined,
        contentType: meta.contentType,
        updatedAt: meta.updated,
      };
    } catch {
      return null;
    }
  }

  /**
   * Ensures there is a stored invoice for an order. If one already exists and
   * `force` is false, it returns current metadata instead of regenerating.
   */
  async ensureInvoice(
    orderId: string,
    opts?: { force?: boolean },
  ): Promise<InvoiceUpload> {
    if (!opts?.force) {
      const existing = await this.getExistingFileMeta(orderId);
      if (existing) return existing;
    }
    return this.generateAndStorePdf(orderId);
  }

  /**
   * Convenience for controllers: get a fresh signed URL to the stored PDF.
   * (Does not regenerate if missing—use ensureInvoice first if needed.)
   */
  async getSignedUrl(orderId: string, days = 7): Promise<string> {
    const path = this.invoicesPath(orderId);
    return this.getSignedUrlForPath(path, days);
  }
}

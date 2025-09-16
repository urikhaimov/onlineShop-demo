import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit'; // If you see TS error, enable esModuleInterop or: import * as PDFDocument from 'pdfkit';
import { getBucket } from '../firebase/admin'; // <-- uses storageBucket set at initializeApp

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
};

@Injectable()
export class InvoiceService {
  private formatMoney(cents: number, currency: string) {
    const value = (cents ?? 0) / 100;
    try {
      return new Intl.NumberFormat('en-IL', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(value);
    } catch {
      return `${value.toFixed(2)} ${currency.toUpperCase()}`;
    }
  }

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

  async uploadBuffer(orderId: string, buffer: Buffer): Promise<InvoiceUpload> {
    // ✅ Use the default bucket configured in initializeApp({ storageBucket: ... })
    const bucket = getBucket();
    const path = `invoices/${orderId}.pdf`;
    const file = bucket.file(path);

    await file.save(buffer, {
      contentType: 'application/pdf',
      resumable: false,
      public: false,
      metadata: { cacheControl: 'public, max-age=31536000' },
    });

    let url: string | undefined;
    try {
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
      const [signed] = await file.getSignedUrl({ action: 'read', expires });
      url = signed;
    } catch {
      // Signed URLs might fail in emulator; ignore.
    }

    return { buffer, path, url };
  }

  async generateAndUpload(data: InvoiceInput): Promise<InvoiceUpload> {
    const buffer = await this.generatePdfBuffer(data);
    return this.uploadBuffer(data.orderId, buffer);
  }
}

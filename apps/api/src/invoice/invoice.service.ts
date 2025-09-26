import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import 'fontkit';
import * as path from 'path';
import * as fs from 'fs';
import { adminBucket } from '../firebase/admin';
import { adminDb } from '@common/firebase';

type PdfKitDoc = InstanceType<typeof PDFDocument>;

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
  amountCents: number;
  currency: string;
  email?: string | null;
  items?: InvoiceItem[];
  vatRate?: number;
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

function toInt(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v) : 0;
}
function toCentsFromMajor(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) : 0;
}
function asQty(n: any) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 1;
}
const HEBREW_RE = /[\u0590-\u05FF]/;
const RLM = '\u200F'; // keeps colon position correct in RTL

@Injectable()
export class InvoiceService {
  private formatMoney(cents: number, currency: string, locale = 'he-IL') {
    const value = (cents ?? 0) / 100;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${value.toFixed(2)} ${String(currency || '').toUpperCase()}`;
    }
  }

  private invoicesPath(orderId: string) {
    return `invoices/${orderId}.pdf`;
  }

  private detectLocale(data: InvoiceInput) {
    if (process.env.INVOICE_LOCALE) return process.env.INVOICE_LOCALE;
    const hasHeb =
      (data.items ?? []).some((i) => HEBREW_RE.test(i.name ?? '')) ||
      HEBREW_RE.test(data.storeName ?? '') ||
      HEBREW_RE.test(data.email ?? '');
    return hasHeb ? 'he-IL' : 'en-IL';
  }

  private t(key: string, locale: string) {
    if (locale.startsWith('he')) {
      const HE: Record<string, string> = {
        INVOICE: 'חשבונית',
        'Invoice #': 'מס׳ חשבונית',
        Date: 'תאריך',
        'Bill to': 'לחיוב',
        Item: 'פריט',
        Qty: 'כמות',
        Price: 'מחיר',
        Total: 'סה״כ',
        Subtotal: 'סיכום ביניים',
        VAT: 'מע״מ',
        'Order payment': 'תשלום הזמנה',
      };
      return HE[key] ?? key;
    }
    return key;
  }

  // ---------- fonts ----------
  private resolveAsset(...segments: string[]) {
    const candidates = [
      path.join(__dirname, ...segments),
      path.join(process.cwd(), 'dist', 'apps', 'api', ...segments),
      path.join(process.cwd(), 'apps', 'api', 'src', ...segments),
    ];
    for (const p of candidates) if (fs.existsSync(p)) return p;
    return null;
  }
  private registerFonts(doc: PdfKitDoc) {
    // return loaded names
    const load = (name: string, ...rel: string[]) => {
      try {
        const p = this.resolveAsset(...rel);
        if (p) {
          (doc as any).registerFont(name, fs.readFileSync(p));
          return name;
        }
      } catch {
        // ignore
      }
      return undefined;
    };
    const heb = load(
      'NotoHeb',
      'invoice',
      'fonts',
      'NotoSansHebrew-Regular.ttf',
    );
    const base = load('Noto', 'invoice', 'fonts', 'NotoSans-Regular.ttf');
    return { base, heb };
  }

  // ---------- PDF ----------
  async generatePdfBuffer(data: InvoiceInput): Promise<Buffer> {
    return await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 56 });
      const chunks: Buffer[] = [];
      doc.on('data', (d) => chunks.push(d));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { base, heb } = this.registerFonts(doc as PdfKitDoc);
      const locale = this.detectLocale(data);
      const rtl = locale.startsWith('he');
      const FACE = rtl && heb ? heb : (base ?? undefined);
      if (FACE) doc.font(FACE);

      const pageRight = 550,
        pageLeft = 50;

      // Header
      if (rtl && heb) doc.font(heb);
      doc.fontSize(22).text(data.storeName ?? 'Your Store', {
        align: rtl ? 'left' : 'right',
      });
      doc.moveDown(0.3);
      doc
        .fontSize(32)
        .text(this.t('INVOICE', locale), { align: rtl ? 'right' : 'left' });
      if (FACE) doc.font(FACE);
      doc.moveDown(0.6);

      const created = new Date(data.createdAt);
      const headerLines = [
        `${this.t('Invoice #', locale)}: ${data.orderId}`,
        `${this.t('Date', locale)}: ${created.toLocaleDateString(locale)}`,
        `${this.t('Bill to', locale)}: ${data.email ?? '-'}`,
      ];
      headerLines.forEach((line) =>
        doc.fontSize(11).text(line, { align: rtl ? 'right' : 'left' }),
      );
      doc.moveDown(0.6);

      // Columns (flip for RTL)
      const colW = { item: 300, qty: 50, price: 80, total: 80 };
      const x = (name: 'item' | 'qty' | 'price' | 'total') => {
        if (!rtl) {
          if (name === 'item') return pageLeft;
          if (name === 'qty') return pageLeft + colW.item + 10;
          if (name === 'price')
            return pageLeft + colW.item + 10 + colW.qty + 10;
          return pageLeft + colW.item + 10 + colW.qty + 10 + colW.price + 10;
        } else {
          if (name === 'total') return pageRight - colW.total;
          if (name === 'price')
            return pageRight - (colW.total + 10 + colW.price);
          if (name === 'qty')
            return pageRight - (colW.total + 10 + colW.price + 10 + colW.qty);
          return (
            pageRight -
            (colW.total + 10 + colW.price + 10 + colW.qty + 10 + colW.item)
          );
        }
      };

      // === Table header (single baseline) ===
      doc.fontSize(12);
      if (rtl && heb) doc.font(heb);
      const headerY = doc.y; // lock y for all header cells

      doc.text(this.t('Item', locale), x('item'), headerY, {
        width: colW.item,
        align: rtl ? 'right' : 'left',
      });
      if (FACE) doc.font(FACE);
      doc.text(this.t('Qty', locale), x('qty'), headerY, {
        width: colW.qty,
        align: 'right',
      });
      doc.text(this.t('Price', locale), x('price'), headerY, {
        width: colW.price,
        align: 'right',
      });
      doc.text(this.t('Total', locale), x('total'), headerY, {
        width: colW.total,
        align: 'right',
      });

      const headerLineY = headerY + doc.currentLineHeight() + 2;
      doc
        .moveTo(pageLeft, headerLineY)
        .lineTo(pageRight, headerLineY)
        .lineWidth(0.5)
        .strokeColor('#777')
        .stroke();

      // start rows just below the header underline
      let y = headerLineY + 10;

      // Rows
      type Row = { label: string; qty: number; price?: number; total?: number };
      const rows: Row[] = (data.items ?? []).map((it) => {
        const price = Number.isFinite(it.priceCents as any)
          ? toInt(it.priceCents)
          : undefined;
        const qty = asQty(it.qty);
        const total = typeof price === 'number' ? price * qty : undefined;
        const label = (it.name?.toString().trim() ||
          it.id?.toString() ||
          'Item') as string;
        return { label, qty, price, total };
      });

      const hasRows = rows.length > 0;
      const hasPrices = rows.some((r) => typeof r.price === 'number');
      const computedSubtotal = hasPrices
        ? rows.reduce((s, r) => s + (r.total ?? 0), 0)
        : data.amountCents;

      const lineH = 20;

      // reprint header on page-break, again on a single baseline
      const ensureSpace = () => {
        if (y > doc.page.height - 140) {
          doc.addPage();
          const hY = 56; // top margin we used
          doc.fontSize(12);
          if (rtl && heb) doc.font(heb);
          doc.text(this.t('Item', locale), x('item'), hY, {
            width: colW.item,
            align: rtl ? 'right' : 'left',
          });
          if (FACE) doc.font(FACE);
          doc.text(this.t('Qty', locale), x('qty'), hY, {
            width: colW.qty,
            align: 'right',
          });
          doc.text(this.t('Price', locale), x('price'), hY, {
            width: colW.price,
            align: 'right',
          });
          doc.text(this.t('Total', locale), x('total'), hY, {
            width: colW.total,
            align: 'right',
          });

          const lh = hY + doc.currentLineHeight() + 2;
          doc
            .moveTo(pageLeft, lh)
            .lineTo(pageRight, lh)
            .lineWidth(0.5)
            .strokeColor('#777')
            .stroke();
          y = lh + 10;
        }
      };

      if (hasRows) {
        for (const r of rows) {
          ensureSpace();
          const useHeb = rtl && heb && HEBREW_RE.test(r.label);
          if (useHeb) doc.font(heb);
          doc.text(r.label, x('item'), y, {
            width: colW.item,
            align: rtl ? 'right' : 'left',
          });
          if (FACE) doc.font(FACE);
          doc.text(String(r.qty), x('qty'), y, {
            width: colW.qty,
            align: 'right',
          });
          doc.text(
            typeof r.price === 'number'
              ? this.formatMoney(r.price, data.currency, locale)
              : '-',
            x('price'),
            y,
            { width: colW.price, align: 'right' },
          );
          doc.text(
            typeof r.total === 'number'
              ? this.formatMoney(r.total, data.currency, locale)
              : '-',
            x('total'),
            y,
            { width: colW.total, align: 'right' },
          );
          y += lineH;
        }
      } else {
        if (rtl && heb) doc.font(heb);
        doc.text(this.t('Order payment', locale), x('item'), y, {
          width: colW.item,
          align: rtl ? 'right' : 'left',
        });
        if (FACE) doc.font(FACE);
        doc.text('-', x('qty'), y, { width: colW.qty, align: 'right' });
        doc.text('-', x('price'), y, { width: colW.price, align: 'right' });
        doc.text(
          this.formatMoney(data.amountCents, data.currency, locale),
          x('total'),
          y,
          { width: colW.total, align: 'right' },
        );
        y += lineH;
      }

      // Subtotal / VAT / Total
      y += 6;
      doc
        .moveTo(pageLeft, y)
        .lineTo(pageRight, y)
        .lineWidth(0.5)
        .strokeColor('#777')
        .stroke();
      y += 10;

      const label = (k: string) =>
        rtl ? `${this.t(k, locale)}:${RLM}` : `${this.t(k, locale)}:`;
      const rightBlockX = rtl ? x('price') : 350;

      doc.fontSize(12);
      doc.text(label('Subtotal'), rightBlockX, y, {
        width: 120,
        align: 'left',
      });
      doc.text(
        this.formatMoney(computedSubtotal, data.currency, locale),
        x('total'),
        y,
        { width: colW.total, align: 'right' },
      );
      y += lineH;

      let vatCents = 0;
      if (typeof data.vatRate === 'number' && data.vatRate > 0) {
        vatCents = Math.round(computedSubtotal * data.vatRate);
        const vatLabel = `${this.t('VAT', locale)} (${Math.round(
          data.vatRate * 100,
        )}%)`;
        doc.text(rtl ? `${vatLabel}:${RLM}` : `${vatLabel}:`, rightBlockX, y, {
          width: 120,
        });
        doc.text(
          this.formatMoney(vatCents, data.currency, locale),
          x('total'),
          y,
          { width: colW.total, align: 'right' },
        );
        y += lineH;
      }

      const totalCents = computedSubtotal + vatCents;
      doc.fontSize(13);
      doc.text(label('Total'), rightBlockX, y, { width: 120 });
      doc.text(
        this.formatMoney(totalCents, data.currency, locale),
        x('total'),
        y,
        { width: colW.total, align: 'right' },
      );

      doc.end();
    });
  }

  // ---------- Storage ----------
  private async getSignedUrlForPath(pathStr: string, days = 7) {
    const file = adminBucket().file(pathStr);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * days);
    const [signed] = await file.getSignedUrl({ action: 'read', expires });
    return signed as string;
  }
  private async persistInvoiceRef(orderId: string, meta: InvoiceStoredMeta) {
    try {
      await adminDb
        .collection('orders')
        .doc(orderId)
        .set(
          {
            invoice: meta,
            invoicePath: meta.path,
            updatedAt: new Date().toISOString(),
          } as any,
          { merge: true },
        );
    } catch {
      // ignore
    }
  }

  async uploadBuffer(
    orderId: string,
    buffer: Buffer,
    locale?: string,
  ): Promise<InvoiceUpload> {
    const bucket = adminBucket();
    const pathStr = this.invoicesPath(orderId);
    const file = bucket.file(pathStr);

    const contentType = 'application/pdf';
    const contentDisposition = `attachment; filename="invoice-${orderId}.pdf"`;

    await file.save(buffer, {
      contentType,
      resumable: false,
      public: false,
      metadata: {
        cacheControl: 'public, max-age=31536000',
        contentDisposition,
        contentLanguage: locale ? locale.slice(0, 2) : undefined,
      },
    });

    let url: string | undefined;
    try {
      url = await this.getSignedUrlForPath(pathStr, 7);
    } catch {
      // ignore
    }

    let sizeBytes: number | undefined;
    let updatedAt: string | undefined;
    try {
      const [meta] = await file.getMetadata();
      sizeBytes = Number(meta.size || 0) || undefined;
      updatedAt = meta.updated;
      await this.persistInvoiceRef(orderId, {
        path: pathStr,
        generatedAt: new Date().toISOString(),
        sizeBytes,
        contentType,
      });
    } catch {
      // ignore
    }

    return { buffer, path: pathStr, url, sizeBytes, contentType, updatedAt };
  }

  async generateAndUpload(data: InvoiceInput) {
    const locale = this.detectLocale(data);
    const buffer = await this.generatePdfBuffer(data);
    return this.uploadBuffer(data.orderId, buffer, locale);
  }

  // ---------- Public helpers ----------
  async generateAndStorePdf(orderId: string) {
    const snap = await adminDb.collection('orders').doc(orderId).get();
    if (!snap.exists) throw new Error(`Order ${orderId} not found`);
    const o = snap.data() as any;

    const createdAt = o?.createdAt ?? new Date().toISOString();
    const updatedAt = o?.updatedAt ?? createdAt;

    const amountCents =
      toInt(o?.totalMinor) ||
      toInt(o?.payment?.totalMinor) ||
      toCentsFromMajor(o?.total ?? o?.totalMajor) ||
      0;

    const currency =
      (o?.currency as string) ||
      (o?.payment?.currency as string) ||
      process.env.DEFAULT_CURRENCY ||
      'ILS';

    const items: InvoiceItem[] | undefined = Array.isArray(o?.items)
      ? o.items
          .map((it: any) => ({
            id: String(it.productId ?? it.id ?? 'item'),
            name: String(
              it.name ??
                it.title ??
                it.productTitle ??
                it.product?.name ??
                it.productId ??
                it.id ??
                'Item',
            ),
            qty: asQty(it.quantity ?? it.qty ?? 1),
            priceCents:
              toInt(it.priceCents) ||
              toInt(it.unitPriceMinor) ||
              toInt(it.price_minor) ||
              toInt(it.priceMinor) ||
              toCentsFromMajor(it.priceMajor ?? it.price) ||
              undefined,
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
      email:
        o?.email ?? o?.customer?.email ?? o?.payment?.receipt_email ?? null,
      items,
      vatRate,
      storeName:
        process.env.STORE_NAME || process.env.SHOP_NAME || 'Online Shop',
    };

    return this.generateAndUpload(data);
  }

  async getExistingFileMeta(orderId: string) {
    const file = adminBucket().file(this.invoicesPath(orderId));
    try {
      const [exists] = await file.exists();
      if (!exists) return null;
      let url: string | undefined;
      try {
        url = await this.getSignedUrlForPath(file.name, 7);
      } catch {
        // ignore
      }
      const [meta] = await file.getMetadata();
      return {
        buffer: Buffer.alloc(0),
        path: file.name,
        url,
        sizeBytes: Number(meta.size || 0) || undefined,
        contentType: meta.contentType,
        updatedAt: meta.updated,
      };
    } catch {
      return null;
    }
  }

  async ensureInvoice(orderId: string, opts?: { force?: boolean }) {
    if (!opts?.force) {
      const existing = await this.getExistingFileMeta(orderId);
      if (existing) return existing;
    }
    return this.generateAndStorePdf(orderId);
  }

  async getSignedUrl(orderId: string, days = 7) {
    return this.getSignedUrlForPath(this.invoicesPath(orderId), days);
  }
}

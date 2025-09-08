// src/products/products.service.ts
import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { adminDb } from '@common/firebase';
import type { SaveProductDto } from './dto/save-product.dto';
import type { ListProductsDto } from './dto/list-products.dto';

type TS = admin.firestore.Timestamp | admin.firestore.FieldValue;

type UserRef = {
  uid: string;
  uidNum: number;
  name: string;
};

type ProductDoc = {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  images: string[];
  imageUrl?: string | null;
  order: number; // persisted sort position
  metadata: {
    createdBy: UserRef;
    updatedBy: UserRef;
    createdAt: TS;
    updatedAt: TS;
  };
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  constructor(private readonly _config: ConfigService) {}

  private st() {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  private numericUid(uid: string): number {
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  private actor(uid: string, name?: string): UserRef {
    return { uid, uidNum: this.numericUid(uid), name: name ?? '' };
  }

  private pickDefined<T extends object>(obj: Partial<T>) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).filter(
        ([, v]) => v !== undefined,
      ),
    ) as Partial<T>;
  }

  /** Compute next order value (max + 1). */
  private async getNextOrder(): Promise<number> {
    const snap = await adminDb
      .collection('products')
      .orderBy('order', 'desc')
      .limit(1)
      .get();
    const top = snap.docs[0]?.data() as Partial<ProductDoc> | undefined;
    const currentMax = typeof top?.order === 'number' ? top.order : -1;
    return currentMax + 1;
  }

  // ---------------- list (fixed types) ----------------
  async list(
    q: ListProductsDto,
  ): Promise<{ items: Array<Record<string, any>>; total: number }> {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(q.limit ?? 20)));

    // Base ref
    let ref: admin.firestore.Query = adminDb.collection('products');

    // Equality filter
    if (q.categoryId) ref = ref.where('categoryId', '==', q.categoryId);

    // Only one inequality field per Firestore query
    const wantsPrice =
      typeof q.priceMin === 'number' || typeof q.priceMax === 'number';
    const wantsStock =
      typeof q.stockMin === 'number' || typeof q.stockMax === 'number';
    const rangeField = wantsPrice
      ? 'price'
      : wantsStock
        ? 'stock'
        : (undefined as 'price' | 'stock' | undefined);

    if (rangeField === 'price') {
      if (typeof q.priceMin === 'number')
        ref = ref.where('price', '>=', q.priceMin);
      if (typeof q.priceMax === 'number')
        ref = ref.where('price', '<=', q.priceMax);
    } else if (rangeField === 'stock') {
      if (typeof q.stockMin === 'number')
        ref = ref.where('stock', '>=', q.stockMin);
      if (typeof q.stockMax === 'number')
        ref = ref.where('stock', '<=', q.stockMax);
    }

    // Sort field/dir
    const [sortFieldRaw, sortDirRaw] = String(q.sort ?? '').split(':');
    let sortField =
      (sortFieldRaw?.trim() as keyof ProductDoc | undefined) ??
      rangeField ??
      'order';
    const sortDir: admin.firestore.OrderByDirection =
      sortDirRaw === 'desc' ? 'desc' : 'asc';

    if (rangeField && sortField !== rangeField) sortField = rangeField;

    ref = ref.orderBy(sortField as string, sortDir);

    // Offset/Limit pagination (fine for emulator/dev)
    const offset = (page - 1) * limit;

    // Fetch page
    const snap = await ref.offset(offset).limit(limit).get();
    let pageDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Optional in-page text search
    const needle = (q.q ?? '').toString().trim().toLowerCase();
    if (needle) {
      pageDocs = pageDocs.filter((p: any) => {
        const name = (p?.name ?? '').toString().toLowerCase();
        const id = (p?.id ?? '').toString().toLowerCase();
        const desc = (p?.description ?? '').toString().toLowerCase();
        return (
          name.includes(needle) || id.includes(needle) || desc.includes(needle)
        );
      });
    }

    // Total using aggregation; fallback to page length if not available
    let total = pageDocs.length;
    try {
      const agg = await ref.count().get();
      total = typeof agg.data().count === 'number' ? agg.data().count : total;
    } catch (e) {
      this.logger.debug(
        `count() fallback: ${String((e as any)?.message || e)}`,
      );
    }

    return { items: pageDocs, total };
  }

  // ---------------- create ----------------
  async create(
    uid: string,
    actorName: string | undefined,
    dto: SaveProductDto,
  ) {
    const ref = adminDb.collection('products').doc();
    const actor = this.actor(uid, actorName);

    const rawImages = dto.images ?? [];
    const images = Array.from(
      new Set(
        rawImages
          .map((s) => (typeof s === 'string' ? s.trim() : ''))
          .filter((s) => s.length > 0)
          .filter((s) => s.startsWith('https://') || s.startsWith('http://')),
      ),
    );

    const provided = dto.imageUrl;
    const imageUrl =
      provided === ''
        ? null
        : provided !== undefined
          ? provided
          : (images[0] ?? null);

    const baseDoc = {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      categoryId: dto.categoryId,
      images,
      imageUrl,
      metadata: {
        createdBy: actor,
        updatedBy: actor,
        createdAt: this.st(),
        updatedAt: this.st(),
      },
    } as const;

    await adminDb.runTransaction(async (tx) => {
      const q = adminDb
        .collection('products')
        .orderBy('order', 'desc')
        .limit(1);
      const last = await tx.get(q);
      const currentMax =
        typeof last.docs[0]?.data()?.order === 'number'
          ? (last.docs[0].data() as any).order
          : -1;
      const nextOrder = currentMax + 1;

      tx.set(ref, { id: ref.id, ...baseDoc, order: nextOrder });
    });

    const snap = await ref.get();
    this.logger.log(`Created product ${ref.id}`);
    return { id: ref.id, ...snap.data() };
  }

  // ---------------- update ----------------
  async update(
    uid: string,
    actorName: string | undefined,
    id: string,
    dto: SaveProductDto,
  ) {
    const ref = adminDb.collection('products').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException('Product not found');

    const prev = snap.data() as ProductDoc | undefined;
    const actor = this.actor(uid, actorName);

    const metadata: ProductDoc['metadata'] = {
      createdBy: prev?.metadata?.createdBy ?? actor,
      createdAt: prev?.metadata?.createdAt ?? this.st(),
      updatedBy: actor,
      updatedAt: this.st(),
    };

    const patch = this.pickDefined<ProductDoc>({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      categoryId: dto.categoryId,
      metadata,
    });

    if (Array.isArray((dto as any).images)) {
      patch.images = dto.images!;
      if ('imageUrl' in (dto as any)) {
        patch.imageUrl = dto.imageUrl ?? null;
      } else {
        patch.imageUrl = dto.images![0] ?? null;
      }
    } else if ('imageUrl' in (dto as any)) {
      patch.imageUrl = dto.imageUrl ?? null;
    }

    await ref.update(patch as admin.firestore.UpdateData<ProductDoc>);

    this.logger.log(
      `Updated product ${id} (images: ${
        Array.isArray((dto as any).images) ? dto.images!.length : 'UNCHANGED'
      }, imageUrl: ${
        'imageUrl' in (dto as any)
          ? JSON.stringify(dto.imageUrl ?? null)
          : 'UNCHANGED'
      })`,
    );

    const after = (await ref.get()).data();
    return { id, ...after };
  }

  // ---------------- queries ----------------
  async getAll() {
    const { items } = await this.list({
      page: 1,
      limit: 100,
      sort: 'order:asc',
    } as any);
    return items;
  }

  async getById(id: string) {
    const snap = await adminDb.collection('products').doc(id).get();
    if (!snap.exists) throw new NotFoundException('Product not found');
    return { id: snap.id, ...snap.data() };
  }

  async remove(id: string) {
    await adminDb.collection('products').doc(id).delete();
    return { ok: true };
  }

  // ---------------- reorder ----------------
  async reorder(
    uid: string,
    actorName: string | undefined,
    orderList: Array<{ id: string; order: number }>,
  ) {
    if (!Array.isArray(orderList) || orderList.length === 0) {
      throw new BadRequestException('orderList must be a non-empty array');
    }
    const ids = new Set(orderList.map((i) => i.id));
    if (ids.size !== orderList.length) {
      throw new BadRequestException('orderList contains duplicate ids');
    }

    const actor = this.actor(uid, actorName);
    const batch = adminDb.batch();

    for (const item of orderList) {
      const ref = adminDb.collection('products').doc(item.id);
      batch.update(ref, {
        order: item.order,
        'metadata.updatedBy': actor,
        'metadata.updatedAt': this.st(),
      } as admin.firestore.UpdateData<ProductDoc>);
    }

    await batch.commit();
    this.logger.log(`Reordered ${orderList.length} products`);

    const ss = await adminDb
      .collection('products')
      .orderBy('order', 'asc')
      .get();
    return ss.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

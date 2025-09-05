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

  // ---------------- create ----------------
  async create(
    uid: string,
    actorName: string | undefined,
    dto: SaveProductDto,
  ) {
    const ref = adminDb.collection('products').doc();
    const actor = this.actor(uid, actorName);

    // --- sanitize / normalize images (same as before) ---
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
      // order will be set inside the transaction
      metadata: {
        createdBy: actor,
        updatedBy: actor,
        createdAt: this.st(),
        updatedAt: this.st(),
      },
    } as const;

    // ---- ATOMIC PART: read current max order & write new product ----
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

    // Optional: re-read to return fresh data
    const snap = await ref.get();
    this.logger.log(`Created product ${ref.id}`);
    return { id: ref.id, ...snap.data() };
  }

  // ---------------- update ----------------
  // src/products/products.service.ts  (inside ProductsService)
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

    // Start with scalar fields that may be present
    const patch = this.pickDefined<ProductDoc>({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      categoryId: dto.categoryId,
      // images & imageUrl handled below
      metadata,
    });

    // If the client provided `images`, update them (including empty array to clear)
    if (Array.isArray((dto as any).images)) {
      patch.images = dto.images!;

      // If imageUrl is also provided, honor it (null means clear).
      // Otherwise, derive primary from the first image in the new list.
      if ('imageUrl' in (dto as any)) {
        patch.imageUrl = dto.imageUrl ?? null;
      } else {
        patch.imageUrl = dto.images![0] ?? null;
      }
    } else if ('imageUrl' in (dto as any)) {
      // Client wants to change/clear primary image without touching the list
      patch.imageUrl = dto.imageUrl ?? null;
    }

    await ref.update(patch as admin.firestore.UpdateData<ProductDoc>);

    this.logger.log(
      `Updated product ${id} (images: ${
        Array.isArray((dto as any).images) ? dto.images!.length : 'UNCHANGED'
      }, imageUrl: ${'imageUrl' in (dto as any) ? JSON.stringify(dto.imageUrl ?? null) : 'UNCHANGED'})`,
    );

    const after = (await ref.get()).data();
    return { id, ...after };
  }

  // ---------------- queries ----------------
  async getAll() {
    try {
      const ss = await adminDb
        .collection('products')
        .orderBy('order', 'asc')
        .get();
      return ss.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e: any) {
      this.logger.warn(
        `getAll() falling back to name ordering: ${e?.code || e?.message}`,
      );
      const ss = await adminDb
        .collection('products')
        .orderBy('name', 'asc')
        .get();
      return ss.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
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

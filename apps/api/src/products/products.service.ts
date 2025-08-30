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
  /** persisted sort position */
  order: number;
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

    const nextOrder = await this.getNextOrder();

    const doc: ProductDoc = {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      categoryId: dto.categoryId,
      images: dto.images ?? [],
      imageUrl: dto.imageUrl ?? null,
      order: nextOrder,
      metadata: {
        createdBy: actor,
        updatedBy: actor,
        createdAt: this.st(),
        updatedAt: this.st(),
      },
    };

    await ref.set({ id: ref.id, ...doc });

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
      images: dto.images,
      imageUrl: dto.imageUrl ?? null,
      metadata,
      // NOTE: we do not accept "order" via update() — use reorder()
    });

    await ref.update(patch as admin.firestore.UpdateData<ProductDoc>);

    this.logger.log(`Updated product ${id}`);
    const after = (await ref.get()).data();
    return { id, ...after };
  }

  // ---------------- queries ----------------

  // src/products/products.service.ts — replace ONLY getAll()
  async getAll() {
    try {
      // Primary: sort by persisted 'order'
      const ss = await adminDb
        .collection('products')
        .orderBy('order', 'asc')
        .get();

      return ss.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e: any) {
      // If order field/index isn't available yet, fall back to name
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

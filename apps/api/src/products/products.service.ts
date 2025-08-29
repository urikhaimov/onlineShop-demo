import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { adminDb } from '@common/firebase';
import type { SaveProductDto } from './dto/save-product.dto';

type TS = admin.firestore.Timestamp | admin.firestore.FieldValue;

type UserRef = {
  uid: string; // string UID for frontend/types
  uidNum: number; // numeric hash (optional, useful for analytics)
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

  private pickDefined<T extends Record<string, any>>(obj: T) {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as Partial<T>;
  }

  // ---------------- create ----------------
  async create(
    uid: string,
    actorName: string | undefined,
    dto: SaveProductDto,
  ) {
    const ref = adminDb.collection('products').doc();
    const actor = this.actor(uid, actorName);

    const doc: ProductDoc = {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      categoryId: dto.categoryId,
      images: dto.images ?? [],
      imageUrl: dto.imageUrl ?? null,
      metadata: {
        createdBy: actor,
        updatedBy: actor,
        createdAt: this.st(),
        updatedAt: this.st(),
      },
    };

    await ref.set({ id: ref.id, ...doc });

    // Re-read so serverTimestamp() resolves to a concrete Timestamp
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

    // Build a full metadata object (avoid dotted keys)
    const metadata: ProductDoc['metadata'] = {
      createdBy: prev?.metadata?.createdBy ?? actor,
      createdAt: prev?.metadata?.createdAt ?? this.st(),
      updatedBy: actor,
      updatedAt: this.st(),
    };

    // Only include defined fields so we don't wipe others
    const patch = this.pickDefined<ProductDoc>({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      categoryId: dto.categoryId,
      images: dto.images, // send only if provided
      imageUrl: dto.imageUrl ?? null, // allow explicit null to clear
      metadata, // replace metadata atomically
    });

    // Type the update for Firestore
    await ref.update(patch as admin.firestore.UpdateData<ProductDoc>);

    this.logger.log(`Updated product ${id}`);
    const after = (await ref.get()).data();
    return { id, ...after };
  }

  // ---------------- queries ----------------
  async getAll() {
    const ss = await adminDb.collection('products').orderBy('name').get();
    return ss.docs.map((d) => ({ id: d.id, ...d.data() }));
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
}

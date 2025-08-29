// src/products/products.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { adminDb } from '@common/firebase';
import type { SaveProductDto } from './dto/save-product.dto';

type ProductDoc = {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  images: string[];
  imageUrl?: string;
  metadata: {
    createdBy: { uid: number; name: string };
    updatedBy: { uid: number; name: string };
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
  };
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  constructor(private readonly _config: ConfigService) {}

  private now() {
    return admin.firestore.Timestamp.now();
  }

  private numericUid(uid: string): number {
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  async create(
    uid: string,
    actorName: string | undefined,
    dto: SaveProductDto,
  ) {
    const now = this.now();
    const uidNum = this.numericUid(uid);
    const doc: ProductDoc = {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      categoryId: dto.categoryId,
      images: dto.images ?? [],
      imageUrl: dto.imageUrl,
      metadata: {
        createdBy: { uid: uidNum, name: actorName ?? '' },
        updatedBy: { uid: uidNum, name: actorName ?? '' },
        createdAt: now,
        updatedAt: now,
      },
    };

    const ref = adminDb.collection('products').doc();
    await ref.set({ id: ref.id, ...doc });
    this.logger.log(`Created product ${ref.id}`);
    return { id: ref.id, ...doc };
  }

  async update(
    uid: string,
    actorName: string | undefined,
    id: string,
    dto: SaveProductDto,
  ) {
    const ref = adminDb.collection('products').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException('Product not found');

    const prev = snap.data() as any;
    const now = this.now();
    const uidNum = this.numericUid(uid);

    const patch = {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      categoryId: dto.categoryId,
      images: dto.images ?? [],
      imageUrl: dto.imageUrl ?? null,
      'metadata.updatedAt': now,
      'metadata.updatedBy': { uid: uidNum, name: actorName ?? '' },
    };

    // if doc somehow had no metadata (legacy), seed it
    if (!prev?.metadata?.createdAt) {
      Object.assign(patch, {
        'metadata.createdAt': prev?.createdAt ?? now,
        'metadata.createdBy': { uid: uidNum, name: actorName ?? '' },
      });
    }

    await ref.update(patch);
    this.logger.log(`Updated product ${id}`);
    const after = (await ref.get()).data();
    return { id, ...after };
  }

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

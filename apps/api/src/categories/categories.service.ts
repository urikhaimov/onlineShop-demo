// src/categories/categories.service.ts
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { adminDb } from '@common/firebase';
import type { ListCategoriesDto } from './dto/list-categories.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private categoriesRef = adminDb.collection('categories');

  /** New: queryable list with pagination, sorting, and simple search */
  async list(
    q: ListCategoriesDto,
  ): Promise<{ items: Array<Record<string, any>>; total: number }> {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.max(1, Math.min(500, Number(q.limit ?? 100)));

    // sort like "order:asc" or "name:asc" (default by name)
    const [sf, sdRaw] = String(q.sort ?? 'name:asc').split(':');
    const sortField = (sf?.trim() || 'name') as string;
    const sortDir: admin.firestore.OrderByDirection =
      sdRaw === 'desc' ? 'desc' : 'asc';

    const ref: admin.firestore.Query = this.categoriesRef.orderBy(
      sortField,
      sortDir,
    );

    const offset = (page - 1) * limit;
    const snap = await ref.offset(offset).limit(limit).get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // In-page substring search on name (keeps server simple in emulator)
    const needle = (q.q ?? '').toString().trim().toLowerCase();
    if (needle) {
      items = items.filter((c: any) =>
        (c?.name ?? '').toString().toLowerCase().includes(needle),
      );
    }

    // Total via aggregation; fallback to page length if not available
    let total = items.length;
    try {
      const agg = await ref.count().get();
      total = typeof agg.data().count === 'number' ? agg.data().count : total;
    } catch (e) {
      this.logger.debug(
        `count() fallback: ${String((e as any)?.message || e)}`,
      );
    }

    return { items, total };
  }

  /** Back-compat: use list() under the hood */
  async findAll() {
    const { items } = await this.list({
      page: 1,
      limit: 500,
      sort: 'name:asc',
    } as any);
    return items;
  }

  async create(name: string) {
    if (!name.trim()) {
      throw new ConflictException('Name is required');
    }

    // Simple uniqueness check (case-sensitive to match your original behavior)
    const existing = await this.categoriesRef
      .where('name', '==', name.trim())
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new ConflictException('Category already exists');
    }

    const docRef = await this.categoriesRef.add({ name: name.trim() });
    return { id: docRef.id, name: name.trim() };
  }

  async updateCategory(id: string, name: string) {
    if (!name || !name.trim()) {
      throw new ConflictException('Name is required');
    }

    // Prevent rename to an existing category name (excluding this id)
    const dup = await this.categoriesRef
      .where('name', '==', name.trim())
      .limit(1)
      .get();
    if (!dup.empty && dup.docs[0].id !== id) {
      throw new ConflictException('Category already exists');
    }

    const ref = this.categoriesRef.doc(id);
    await ref.update({ name: name.trim() });
    return { id, name: name.trim() };
  }

  async remove(id: string) {
    await this.categoriesRef.doc(id).delete();
    return { message: 'Category deleted' };
  }

  async getById(id: string) {
    const doc = await this.categoriesRef.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }
}

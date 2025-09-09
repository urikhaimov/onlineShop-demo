// src/categories/categories.service.ts
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { adminDb } from '@common/firebase';
import type { ListCategoriesDto } from './dto/list-categories.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private categoriesRef = adminDb.collection('categories');

  /** Queryable list with pagination, sorting, and simple search */
  async list(
    q: ListCategoriesDto,
  ): Promise<{ items: Array<Record<string, any>>; total: number }> {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.max(1, Math.min(500, Number(q.limit ?? 100)));

    // sort like "name:asc" (default) or "order:asc|desc"
    const [sf, sdRaw] = String(q.sort ?? 'name:asc').split(':');
    const sortField = (sf?.trim() || 'name') as string;
    const sortDir: admin.firestore.OrderByDirection =
      sdRaw === 'desc' ? 'desc' : 'asc';

    let ref: admin.firestore.Query = this.categoriesRef.orderBy(
      sortField,
      sortDir,
    );

    // Firestore-friendly prefix search (on 'name')
    const needle = (q.q ?? '').toString().trim();
    if (needle) {
      // If sorting by 'name', we can do server-side prefix filter
      if (sortField === 'name') {
        ref = ref
          .where('name', '>=', needle)
          .where('name', '<=', needle + '\uf8ff');
      }
    }

    // Total via aggregation; fallback gracefully if unavailable
    let total = 0;
    try {
      const agg = await this.categoriesRef.count().get();
      total = Number(agg.data().count ?? 0);
    } catch (e) {
      this.logger.debug(
        `count() unsupported, falling back. ${String((e as any)?.message || e)}`,
      );
      const all = await this.categoriesRef.get();
      total = all.size;
    }

    // Pagination
    const offset = (page - 1) * limit;
    const snap = await ref.offset(offset).limit(limit).get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Client-like substring search if we couldn't use server-side filter
    if (needle && sortField !== 'name') {
      const low = needle.toLowerCase();
      items = items.filter((c: any) =>
        String(c?.name ?? '')
          .toLowerCase()
          .includes(low),
      );
    }

    return { items, total };
  }

  /** Back-compat: list all (up to 500) sorted by name */
  async findAll() {
    const { items } = await this.list({
      page: 1,
      limit: 500,
      sort: 'name:asc',
    } as any);
    return items;
  }

  async create(name: string) {
    const trimmed = String(name ?? '').trim();
    if (!trimmed) throw new ConflictException('Name is required');

    // Uniqueness (case-sensitive to match current behavior)
    const dup = await this.categoriesRef
      .where('name', '==', trimmed)
      .limit(1)
      .get();
    if (!dup.empty) throw new ConflictException('Category already exists');

    const docRef = await this.categoriesRef.add({ name: trimmed });
    return { id: docRef.id, name: trimmed };
  }

  async updateCategory(id: string, name: string) {
    const trimmed = String(name ?? '').trim();
    if (!trimmed) throw new ConflictException('Name is required');

    const dup = await this.categoriesRef
      .where('name', '==', trimmed)
      .limit(1)
      .get();
    if (!dup.empty && dup.docs[0].id !== id) {
      throw new ConflictException('Category already exists');
    }

    await this.categoriesRef.doc(id).update({ name: trimmed });
    return { id, name: trimmed };
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

// src/categories/categories.service.ts
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { adminDb } from '@common/firebase';
import type { ListCategoriesDto } from './dto/list-categories.dto';

type OrderByDirection = admin.firestore.OrderByDirection;
type Query = admin.firestore.Query;

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

    // sort like "name:asc" (default) or "createdAt:desc" etc.
    const [sf, sdRaw] = String(q.sort ?? 'name:asc').split(':');
    const sortField = (sf?.trim() || 'name') as string;
    const sortDir: OrderByDirection = sdRaw === 'desc' ? 'desc' : 'asc';

    let ref: Query = this.categoriesRef.orderBy(sortField, sortDir);

    const needle = (q.q ?? '').toString().trim();

    // Server-side prefix search ONLY when sorting by the same field ('name')
    if (needle && sortField === 'name') {
      ref = ref
        .where('name', '>=', needle)
        .where('name', '<=', needle + '\uf8ff');
    }

    // Count (use filtered ref if possible, else whole collection)
    let total = 0;
    try {
      const agg = await (
        needle && sortField === 'name' ? ref : this.categoriesRef
      )
        .count()
        .get();
      total = Number(agg.data().count ?? 0);
    } catch (e) {
      this.logger.debug(
        `count() unsupported; falling back. ${String((e as any)?.message || e)}`,
      );
      const snapAll = await (
        needle && sortField === 'name' ? ref : this.categoriesRef
      ).get();
      total = snapAll.size;
    }

    // Pagination (offset ok for admin; cursors can be added later)
    const offset = (page - 1) * limit;
    const pageSnap = await ref.offset(offset).limit(limit).get();

    // Map docs → objects with id
    let items = pageSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // If we couldn't server-filter (because sortField !== 'name'), do client-side filter for UX
    if (needle && sortField !== 'name') {
      const low = needle.toLowerCase();
      const filtered = items.filter((c: any) =>
        String(c?.name ?? '')
          .toLowerCase()
          .includes(low),
      );
      total = filtered.length; // reflect filtered result
      items = filtered;
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

    const docRef = this.categoriesRef.doc(trimmed);
    const existing = await docRef.get();
    if (existing.exists) throw new ConflictException('Category already exists');

    const now = admin.firestore.FieldValue.serverTimestamp();
    await docRef.set({
      name: trimmed,
      description: '',
      imageUrl: '',
      createdAt: now,
      updatedAt: now,
      __marker: 'created_via_doc_set_name_as_id', // 👈 fingerprint
    });

    this.logger.log(`[create] created category id=${docRef.id}`);
    return { id: trimmed, name: trimmed, description: '', imageUrl: '' };
  }
  async updateCategory(id: string, name: string) {
    const trimmed = String(name ?? '').trim();
    if (!trimmed) throw new ConflictException('Name is required');

    // Uniqueness check on 'name'
    const dup = await this.categoriesRef
      .where('name', '==', trimmed)
      .limit(1)
      .get();
    if (!dup.empty && dup.docs[0].id !== id) {
      throw new ConflictException('Category already exists');
    }

    await this.categoriesRef.doc(id).update({
      name: trimmed,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

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

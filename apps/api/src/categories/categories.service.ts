import { ConflictException, Injectable } from '@nestjs/common';
import { adminDb } from '@common/firebase';

@Injectable()
export class CategoriesService {
  private categoriesRef = adminDb.collection('categories');

  async findAll() {
    const snapshot = await this.categoriesRef.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async create(name: string) {
    if (!name.trim()) {
      throw new ConflictException('Name is required');
    }

    const existing = await this.categoriesRef
      .where('name', '==', name.trim())
      .get();

    if (!existing.empty) {
      throw new ConflictException('Category already exists');
    }

    const docRef = await this.categoriesRef.add({ name: name.trim() });
    return { id: docRef.id, name };
  }

  async remove(id: string) {
    await this.categoriesRef.doc(id).delete();
    return { message: 'Category deleted' };
  }
  async updateCategory(id: string, name: string) {
    if (!name || !name.trim()) {
      throw new ConflictException('Name is required');
    }

    const ref = this.categoriesRef.doc(id);
    await ref.update({ name: name.trim() });
    return { id, name };
  }
}

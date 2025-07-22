import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { adminDb } from '@common/firebase';

export interface ProductWithOrder {
  id: string;
  order?: number;
  [key: string]: any;
}

@Injectable()
export class ProductsService {
  private productsRef = adminDb.collection('products');

  async findById(id: string) {
    const doc = await this.productsRef.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Product not found');
    }
    return { id: doc.id, ...doc.data() };
  }

  async findAll() {
    const snapshot = await this.productsRef.get();
    const products: ProductWithOrder[] = snapshot.docs.map((doc) => ({
      ...(doc.data() as ProductWithOrder),
      id: doc.id,
    }));

    return products.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
  }

  async create(product: { name: string; price: number; stock: number }) {
    const existing = await this.productsRef
      .where('name', '==', product.name)
      .get();

    if (!existing.empty) {
      throw new ConflictException('Product already exists');
    }

    const all = await this.productsRef.get();
    const maxOrder = all.empty
      ? 0
      : Math.max(...all.docs.map((doc) => doc.data().order ?? 0));

    const docRef = await this.productsRef.add({
      ...product,
      order: maxOrder + 1,
    });
    return { id: docRef.id, ...product, order: maxOrder + 1 };
  }

  async update(
    id: string,
    updateData: Partial<{ name: string; price: number; stock: number }>,
  ) {
    const ref = this.productsRef.doc(id);

    const doc = await ref.get();
    if (!doc.exists) {
      throw new NotFoundException('Product not found');
    }

    await ref.update(updateData);
    return { id, ...updateData };
  }

  async remove(id: string) {
    const ref = this.productsRef.doc(id);
    await ref.delete();
    return { message: 'Product deleted' };
  }

  async reorder(
    orderList: { id: string; order: number }[],
  ): Promise<{ success: boolean }> {
    if (!orderList.length) return { success: true };

    try {
      const batch = this.productsRef.firestore.batch();

      for (const { id, order } of orderList) {
        const ref = this.productsRef.doc(id);
        batch.update(ref, { order });
      }

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('🔥 Failed to reorder products:', error);
      throw new InternalServerErrorException('Failed to reorder products');
    }
  }
}

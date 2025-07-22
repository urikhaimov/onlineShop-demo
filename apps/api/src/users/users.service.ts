import { Injectable } from '@nestjs/common';
import { adminDb } from '@common/firebase';

@Injectable()
export class UsersService {
  async getById(uid: string) {
    const doc = await adminDb.collection('users').doc(uid).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async update(uid: string, dto: any) {
    await adminDb.collection('users').doc(uid).update(dto);
    return { success: true };
  }

  async setRole(uid: string, role: 'user' | 'admin' | 'superadmin') {
    await adminDb.collection('users').doc(uid).update({ role });
    return { success: true };
  }

  async delete(uid: string) {
    await adminDb.collection('users').doc(uid).delete();
    return { success: true };
  }

  async getAllUsers() {
    const snapshot = await adminDb.collection('users').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
}

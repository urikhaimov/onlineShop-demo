// apps/client/src/api/orderSettings.ts
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  DocumentData,
  SnapshotOptions,
  FirestoreDataConverter,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { TOrderSettings } from '@common/types';

// Optional converter to keep runtime data shape tidy
const orderSettingsConverter: FirestoreDataConverter<TOrderSettings> = {
  toFirestore(model: TOrderSettings): DocumentData {
    return model;
  },
  fromFirestore(snapshot, _options: SnapshotOptions): TOrderSettings {
    const d = snapshot.data() as DocumentData | undefined;
    return {
      shipping: Number(d?.shipping ?? 0),
      taxRate: Number(d?.taxRate ?? 0),
      discount: Number(d?.discount ?? 0),
      updatedAt: d?.updatedAt,
      updatedBy: d?.updatedBy ?? null,
    };
  },
};

const ORDER_SETTINGS_ID = 'default';
const ORDER_SETTINGS_REF = doc(
  db,
  'order-settings',
  ORDER_SETTINGS_ID,
).withConverter(orderSettingsConverter);

const SEED: TOrderSettings = {
  shipping: 5.99,
  taxRate: 0.17,
  discount: 3.0,
  updatedBy: null,
};

export async function fetchOrderSettings(): Promise<TOrderSettings> {
  const snap = await getDoc(ORDER_SETTINGS_REF);

  if (snap.exists()) {
    return snap.data(); // strictly TOrderSettings via converter
  }

  // Seed if missing (once)
  await setDoc(ORDER_SETTINGS_REF, {
    ...SEED,
    updatedAt: serverTimestamp(),
  });

  // read back to ensure we return a fully typed object incl. serverTimestamp
  const seeded = await getDoc(ORDER_SETTINGS_REF);
  return seeded.data()!;
}

export async function saveOrderSettings(
  data: Pick<TOrderSettings, 'shipping' | 'taxRate' | 'discount'>,
  user?: { uid: string; name?: string | null },
): Promise<void> {
  await updateDoc(ORDER_SETTINGS_REF, {
    shipping: Number(data.shipping),
    taxRate: Number(data.taxRate),
    discount: Number(data.discount),
    updatedAt: serverTimestamp(),
    updatedBy: user ? { uid: user.uid, name: user.name ?? null } : null,
  });
}

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { TOrderSettings } from '@common/types';

const ORDER_SETTINGS_REF = doc(db, 'order-settings', 'default');

export async function fetchOrderSettings(): Promise<TOrderSettings> {
  const snap = await getDoc(ORDER_SETTINGS_REF);
  if (snap.exists()) return snap.data() as TOrderSettings;

  // seed once if missing (defaults from your constants)
  const seed: TOrderSettings = { shipping: 5.99, taxRate: 0.17, discount: 3.0 };
  await setDoc(
    ORDER_SETTINGS_REF,
    { ...seed, updatedAt: serverTimestamp(), updatedBy: null },
    { merge: true },
  );
  return seed;
}

export async function saveOrderSettings(
  data: Pick<TOrderSettings, 'shipping' | 'taxRate' | 'discount'>,
  user?: { uid: string; name?: string | null },
) {
  await updateDoc(ORDER_SETTINGS_REF, {
    shipping: Number(data.shipping),
    taxRate: Number(data.taxRate),
    discount: Number(data.discount),
    updatedAt: serverTimestamp(),
    updatedBy: user ? { uid: user.uid, name: user.name ?? null } : null,
  });
}

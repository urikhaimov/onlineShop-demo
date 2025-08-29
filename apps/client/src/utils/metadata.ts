// src/utils/metadata.ts
import { Timestamp } from 'firebase/firestore';
import type { IMetadata, IUser } from '@common/types';

export type OrderMetadata = IMetadata & {
  createdBy: { uid: number; name: string };
  updatedBy: { uid: number; name: string };
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function toNumericUid(uid: string): number {
  if (/^\d+$/.test(uid)) {
    const n = Number(uid);
    if (Number.isSafeInteger(n)) return n;
  }
  let hash = 0;
  for (let i = 0; i < uid.length; i += 1) {
    hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getDisplayName(user: IUser): string {
  const name = user.displayName?.trim();
  return name && name.length > 0
    ? name
    : ((user as { email?: string }).email ?? 'User');
}

export function createMetadata(user: IUser): OrderMetadata {
  const now = Timestamp.now();
  const uidNum = toNumericUid(user.uid); // assumes IUser.uid: string
  const name = getDisplayName(user);
  return {
    createdBy: { uid: uidNum, name },
    updatedBy: { uid: uidNum, name },
    createdAt: now,
    updatedAt: now,
  };
}

export function updateMetadata(
  user: IUser,
): Pick<OrderMetadata, 'updatedBy' | 'updatedAt'> {
  const uidNum = toNumericUid(user.uid);
  const name = getDisplayName(user);
  return {
    updatedBy: { uid: uidNum, name },
    updatedAt: Timestamp.now(),
  };
}

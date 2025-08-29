import type { Timestamp, FieldValue } from 'firebase/firestore';
export type FirestoreTime = Timestamp | Date | FieldValue;

export interface IMetadata {
  createdBy: { uid: string; name: string };
  updatedBy: { uid: string; name: string };
  createdAt: FirestoreTime; // was Date
  updatedAt: FirestoreTime; // was Date
}

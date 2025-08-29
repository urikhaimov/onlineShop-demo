// src/utils/metadata.ts
import type { IUser, ProductMetadata } from '@common/types';

// Patch type used on EDIT (server merges it)
export type ProductMetaUpdate = Pick<
  ProductMetadata,
  'updatedBy' | 'updatedAt'
>;

function displayName(user: IUser): string {
  const local = user.email?.split('@')[0]?.trim();
  return local || 'User';
}

// Create: full metadata, all JSON-serializable
export function createMetadata(user: IUser): ProductMetadata {
  const now = new Date(); // serializes to ISO string in JSON
  const name = displayName(user);
  return {
    createdBy: { uid: user.id, name }, // uid is STRING
    updatedBy: { uid: user.id, name }, // uid is STRING
    createdAt: now, // Date, not Firestore Timestamp
    updatedAt: now,
  };
}

// Update: only the patch (server should set/merge created*)
export function updateMetadata(user: IUser): ProductMetaUpdate {
  const name = displayName(user);
  return {
    updatedBy: { uid: user.id, name }, // uid is STRING
    updatedAt: new Date(), // Date → ISO string in JSON
  };
}

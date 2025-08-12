import type { User } from 'firebase/auth';
import type { IMetadata } from '@common/types';

export const createMetadata = (user: User): IMetadata => ({
  createdBy: { uid: user.uid, name: user.displayName as string },
  updatedBy: { uid: user.uid, name: user.displayName as string },
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const updateMetadata = (user: User): Partial<IMetadata> => ({
  updatedBy: { uid: user.uid, name: user.displayName as string },
  updatedAt: new Date(),
});

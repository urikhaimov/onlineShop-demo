import { Timestamp } from 'firebase/firestore';
import { IMetadata, IUser } from '@common/types';

export const createMetadata = (user: IUser): IMetadata => ({
  createdBy: { uid: user.uid, name: user.displayName as string },
  updatedBy: { uid: user.uid, name: user.displayName as string },
  createdAt: Timestamp.fromDate(new Date()),
  updatedAt: Timestamp.fromDate(new Date()),
});

export const updateMetadata = (user: IUser): Partial<IMetadata> => ({
  updatedBy: { uid: user.uid, name: user.displayName as string },
  updatedAt: Timestamp.fromDate(new Date()),
});

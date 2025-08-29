import { IMetadata } from './common.type';
import { Timestamp } from 'firebase/firestore';

export type TCategory = {
  id: string;
  name: string;
  metadata?: IMetadata;
  description: string;
  imageUrl?: string; // ✅ Add this line
};

export type ProductMetadata = IMetadata & {
  createdBy: { uid: number; name: string };
  updatedBy: { uid: number; name: string };
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export interface IProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: TCategory['id'];
  images: string[];
  order?: number;
  metadata?: ProductMetadata;
  imageUrl?: string;
}

export type TUpdateProduct = {
  data: Partial<
    Omit<IProduct, 'id' | 'images' | 'createdAt' | 'updatedAt' | 'createdBy'>
  >;
  keepImageUrls: string[];
  newImageFiles?: File[];
};

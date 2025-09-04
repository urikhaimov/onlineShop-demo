import { IMetadata } from './common.type';
export type CategoryMetadata = IMetadata;
export type TCategory = {
  id: string;
  name: string;
  metadata?: CategoryMetadata;
  description: string;
  imageUrl?: string; // ✅ Add this line
};

export type ProductMetadata = IMetadata;

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

import { IMetadata } from './common.type';

export type TCategory = {
  id: string;
  name: string;
  metadata?: IMetadata;
  description: string;
  imageUrl?: string; // ✅ Add this line
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
  metadata?: IMetadata;
  imageUrl?: string;
}

export type TUpdateProduct = {
  data: Partial<
    Omit<IProduct, 'id' | 'images' | 'createdAt' | 'updatedAt' | 'createdBy'>
  >;
  keepImageUrls: string[];
  newImageFiles?: File[];
};

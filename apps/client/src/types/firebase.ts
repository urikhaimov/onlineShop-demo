// src/types/firebase.ts
export type Category = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId?: string;
  images: string[];
  createdAt?: string | Date; // make optional
  updatedAt?: string | Date;
  createdBy?: string;
  order?: number; // ✅ optional, for sorting
  imageUrl?: string; // ✅ Add this line
};
// export type NewProduct = {
//   name: string;
//   description: string;
//   price: number;
//   stock: number;
//   categoryId: string;
//   createdBy: string;
//   images: string[]; // ✅ URLs
// };

// export type UpdateProductPayload = {
//   data: Partial<
//     Omit<Product, 'id' | 'images' | 'createdAt' | 'updatedAt' | 'createdBy'>
//   >;
//   keepImageUrls: string[];
//   newImageFiles?: File[]; // ✅ Files to upload
// };
//
// export type ProductOrderItem = {
//   id: string;
//   order: number;
// };

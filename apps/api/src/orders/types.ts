// Domain types kept close to the feature

export type PlainItem = {
  productId: string;
  name: string;
  price: number; // MAJOR units
  image?: string | null;
  quantity: number;
};

export type CompactCartItem = {
  productId?: string;
  id?: string;
  quantity?: number;
  price?: number; // MAJOR
};

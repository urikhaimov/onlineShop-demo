export enum ProductCardVariant {
  Standard = 'standard',
  Compact = 'compact',
  Elevated = 'elevated',
  ImageOnly = 'imageOnly',
}

export const PRODUCT_CARD_VARIANTS = Object.values(ProductCardVariant);

export const PRODUCT_CARD_VARIANT_LABELS: Record<ProductCardVariant, string> = {
  [ProductCardVariant.Standard]: 'Standard',
  [ProductCardVariant.Compact]: 'Compact',
  [ProductCardVariant.Elevated]: 'Elevated',
  [ProductCardVariant.ImageOnly]: 'Image Only',
};

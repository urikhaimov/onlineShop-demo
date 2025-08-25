import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ProductAdminCard from './ProductAdminCard';
import { IProduct } from '@common/types';
import React from 'react';

type Props = {
  product: IProduct;
  onConfirmDelete: (id: string) => void;
  disabled?: boolean;
};

export default function SortableProductCard({
  product,
  onConfirmDelete,
  disabled = false,
}: Props) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'manipulation',
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    willChange: 'transform', // 🔥 ensures smoothness
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ProductAdminCard
        product={product}
        onConfirmDelete={onConfirmDelete}
        disabled={disabled}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
      />
    </div>
  );
}

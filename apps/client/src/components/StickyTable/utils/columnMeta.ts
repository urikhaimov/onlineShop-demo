// Shared shape for columnDef.meta across all StickyTable usages
export type ColumnMeta = {
  sticky?: 'left' | 'right';
  hiddenOnMobile?: boolean;
  align?: 'left' | 'center' | 'right';
  filterVariant?: 'text' | 'number' | 'select' | 'date';
  selectOptions?: { label: string; value: string }[];
};

// src/types/table.d.ts
import '@tanstack/react-table';

declare module '@tanstack/react-table' {
  interface ColumnMeta<_TData, _TValue> {
    filterVariant?: 'text' | 'number' | 'date';
    sticky?: 'left' | 'right';
  }
}

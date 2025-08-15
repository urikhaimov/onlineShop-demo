// Keep this file where your tsconfig includes it (e.g. "src/types/**/*.d.ts")
import type { RowData } from '@tanstack/react-table';

export type FilterVariant = 'text' | 'number' | 'date' | 'select';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Align cell + header text */
    align?: 'left' | 'right' | 'center';
    /** Pin to edges in your sticky table */
    sticky?: 'left' | 'right';
    /** Hide this column on xs screens */
    hiddenOnMobile?: boolean;
    /** Which filter UI to render for this column */
    filterVariant?: FilterVariant;
    /** Options for 'select' filter */
    selectOptions?: readonly { label: string; value: string }[];
    /** Bounds for number range filter UI */
    numberRange?: { min?: number; max?: number; step?: number }; // <-- NEW
  }

  interface TableMeta<TData extends RowData> {
    denseMode?: boolean;
    customTitle?: string;
  }
}

// Make sure this file is included by tsconfig ("include": ["src", ...])
import type { RowData } from '@tanstack/table-core';

declare module '@tanstack/table-core' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Sticky placement for cells/headers */
    sticky?: 'left' | 'right';
    /** Text alignment hint used by your table */
    align?: 'left' | 'right' | 'center';

    /** Legacy helper to hide on mobile (xs only) */
    hiddenOnMobile?: boolean;

    /** Hide column below this breakpoint (xs/sm/md/lg). Shown at and above. */
    hideBelow?: 'sm' | 'md' | 'lg' | 'xl';

    /** Filter UI hints your table reads */
    filterVariant?: 'text' | 'number' | 'date' | 'select';
    numberRange?: { min: number; max: number; step?: number };
    selectOptions?: { label: string; value: string }[];
  }
}

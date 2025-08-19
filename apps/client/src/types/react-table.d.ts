// src/types/react-table.d.ts
import '@tanstack/react-table';

declare module '@tanstack/react-table' {
  // Extend the column meta we use across the app
  interface ColumnMeta<TData, TValue> {
    /** Pin a column to the left or right (StickyTable reads this) */
    sticky?: 'left' | 'right';
    /** Desired text alignment for this column */
    align?: 'left' | 'right' | 'center';

    /** Legacy flag: hide on xs only (kept for backward compat) */
    hiddenOnMobile?: boolean;

    /**
     * Hide the column below a breakpoint.
     * - 'md' -> show from md up
     * - 'lg' -> show from lg up
     * - 'xl' -> show from xl up
     */
    hideBelow?: 'sm' | 'md' | 'lg' | 'xl';

    /** Force the column to be visible at all sizes (overrides hideBelow) */
    alwaysVisible?: boolean;

    /** Filter UI hints StickyTable/renderColumnFilter use */
    filterVariant?: 'text' | 'number' | 'select' | 'date';
    numberRange?: { min: number; max: number; step?: number };
    selectOptions?: Array<{ label: string; value: string } | string>;
  }
}

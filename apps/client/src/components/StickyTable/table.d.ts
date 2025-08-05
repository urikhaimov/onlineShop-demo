import '@tanstack/react-table';
import { type FilterFn } from '@tanstack/react-table';

declare module '@tanstack/react-table' {
  interface FilterFns {
    betweenNumberRange: FilterFn<unknown>;
    betweenDateRange: FilterFn<unknown>;
    statusEquals: FilterFn<unknown>;
  }
}

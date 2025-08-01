import { ColumnDef } from '@tanstack/react-table';

/**
 * defineColumns is a typed helper that returns a strongly typed ColumnDef[].
 * Use: defineColumns<T>()([...column definitions...])
 */
export function defineColumns<T>() {
  return (columns: ColumnDef<T>[]): ColumnDef<T>[] => columns;
}

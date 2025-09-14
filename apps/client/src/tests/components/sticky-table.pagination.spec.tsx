// apps/client/src/tests/components/sticky-table.pagination.spec.tsx
import { render, screen } from '@testing-library/react';
import user from '@testing-library/user-event';
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import StickyTable from '../../components/StickyTable';

type Row = { id: string; status: string };

const makeData = (n = 25): Row[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `ORD-${String(i + 1).padStart(4, '0')}`,
    status: i % 2 ? 'confirmed' : 'pending',
  }));

test('StickyTable — controlled pagination clicks next and reports page change', async () => {
  const data = makeData(25);
  const onPageChange = vi.fn();

  render(
    <StickyTable<Row>
      columns={[
        { header: 'ID', accessorKey: 'id' },
        { header: 'Status', accessorKey: 'status' },
      ]}
      data={data.slice(0, 10)} // 👈 only current page rows
      enablePagination
      rowsPerPage={10}
      pageIndex={0} // controlled
      totalRows={data.length} // 👈 total dataset size
      onPageChange={onPageChange}
      enableSorting={false}
      enableColumnFilters={false}
      // required controlled-state props (even if unused)
      sorting={[]}
      onSortingChange={() => {
        //todo
      }}
      columnFilters={[]}
      onColumnFiltersChange={() => {
        //todo
      }}
      tableTestId="orders-table"
    />,
  );

  const rowsFirst = screen
    .getAllByRole('row')
    .filter((r) => r.closest('tbody'));
  expect(rowsFirst.length).toBeGreaterThan(0);
  expect(rowsFirst.length).toBeLessThanOrEqual(10);

  await user.click(screen.getByLabelText(/go to next page/i));
  expect(onPageChange).toHaveBeenCalledWith(1); // 0-based
});

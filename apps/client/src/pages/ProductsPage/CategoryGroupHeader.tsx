import * as React from 'react';
import { Avatar, Chip, Stack, Typography } from '@mui/material';

export type Category = { id: string; name: string; imageUrl?: string };

// Must match StickyTable's renderGroupHeader signature.
export type GroupHeaderArgs<T> = {
  value: unknown; // group value (categoryId)
  rows: T[]; // rows in this group
  expanded: boolean;
  toggle: () => void;
};

function pickCategory(categories: Category[], id: unknown) {
  const key = id === null ? '' : String(id);
  return categories.find((c) => c.id === key);
}

export function CategoryGroupHeader<T>(
  props: GroupHeaderArgs<T> & { categories: Category[] },
) {
  const { value, rows, categories } = props;
  const cat = pickCategory(categories, value);
  const name = cat?.name ?? '—';
  const img = cat?.imageUrl;

  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Avatar
        variant="rounded"
        src={img || undefined}
        alt={name}
        sx={{ width: 26, height: 26, fontSize: 12 }}
      >
        {!img
          ? typeof name === 'string'
            ? name.charAt(0).toUpperCase()
            : '•'
          : null}
      </Avatar>
      <Typography variant="subtitle1" fontWeight={700}>
        {name}
      </Typography>
      <Chip
        size="small"
        variant="outlined"
        label={`(${rows.length})`}
        sx={{ ml: 0.5 }}
      />
    </Stack>
  );
}

/** Factory that closes over `categories` and returns the function StickyTable expects. */
export function createCategoryGroupHeader<T>(categories: Category[]) {
  return (args: GroupHeaderArgs<T>) => (
    <CategoryGroupHeader<T> {...args} categories={categories} />
  );
}

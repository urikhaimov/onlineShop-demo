// src/pages/admin/CategoryExpandedRow.tsx
import * as React from 'react';
import { Box, Stack, Typography, Divider, Avatar } from '@mui/material';
import type { TCategory as Category } from '@common/types';
import DOMPurify from 'dompurify';

type Props = { category: Category };

export default function CategoryExpandedRow({ category }: Props) {
  const { id, name, imageUrl, description } = category ?? {};

  // Sanitize HTML from the editor (React Quill output)
  const safeHtml = React.useMemo(() => {
    const raw = (description ?? '').trim();
    if (!raw) return '<em style="opacity:.7">No description</em>';
    // You can tweak options to allow/disallow specific tags/attributes
    return DOMPurify.sanitize(raw, {
      USE_PROFILES: { html: true }, // balanced defaults
    });
  }, [description]);

  return (
    <Box sx={{ px: 2, py: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        {imageUrl ? (
          <Box
            component="img"
            src={imageUrl}
            alt={name ?? 'Category'}
            loading="lazy"
            decoding="async"
            sx={{
              width: 80,
              height: 80,
              objectFit: 'cover',
              borderRadius: 1.5,
              border: 1,
              borderColor: 'divider',
            }}
          />
        ) : (
          <Avatar sx={{ width: 64, height: 64, fontWeight: 600 }}>
            {(name ?? '?').charAt(0).toUpperCase()}
          </Avatar>
        )}
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {name ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ID: {id ?? '—'}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        Description
      </Typography>
      <Box
        sx={{
          p: 1.5,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.default',
          color: 'text.primary',
          '& :where(h1,h2,h3,h4,h5,h6)': { mt: 1, mb: 0.5 },
          '& p': { my: 1 },
          '& ul, & ol': { pl: 3, my: 1 },
        }}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </Box>
  );
}

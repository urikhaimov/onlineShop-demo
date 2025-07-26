import { Box } from '@mui/material';
import { useState } from 'react';

export default function ImageGallery({ images }: { images: string[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || images.length === 0) return null;

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {/* Main Image */}
      <Box
        component="img"
        src={images[selectedIndex]}
        alt={`Main image ${selectedIndex}`}
        sx={{
          width: '100%',
          maxHeight: 500,
          objectFit: 'contain',
          borderRadius: 2,
          backgroundColor: '#111',
        }}
      />

      {/* Thumbnails */}
      <Box
        display="flex"
        gap={1}
        overflow="auto"
        sx={{
          px: 1,
          py: 1,
          backgroundColor: '#222',
          borderRadius: 1,
        }}
      >
        {images.map((url, i) => (
          <Box
            key={i}
            component="img"
            src={url}
            alt={`Thumbnail ${i}`}
            onClick={() => setSelectedIndex(i)}
            sx={{
              width: 60,
              height: 60,
              borderRadius: 1,
              objectFit: 'cover',
              cursor: 'pointer',
              border:
                i === selectedIndex ? '2px solid #1976d2' : '1px solid #444',
              transition: 'border 0.2s',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

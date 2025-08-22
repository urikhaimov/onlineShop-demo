// components/landing/LogoMarquee.tsx
import React from 'react';
import { Box } from '@mui/material';

export default function LogoMarquee({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ overflow: 'hidden', py: 2 }}>
      <Box
        sx={{
          display: 'inline-flex',
          gap: 4,
          whiteSpace: 'nowrap',
          animation: 'marquee 28s linear infinite',
          '@keyframes marquee': {
            from: { transform: 'translateX(0)' },
            to: { transform: 'translateX(-50%)' },
          },
        }}
      >
        {children}
        {/* duplicate for seamless loop */}
        {children}
      </Box>
    </Box>
  );
}

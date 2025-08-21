import * as React from 'react';
import { Container } from '@mui/material';

type Props = {
  children: React.ReactNode;
};

export default function AdminPageContainer({ children }: Props) {
  return (
    <Container
      maxWidth="xl"
      disableGutters
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        py: 4,
        mx: 'auto',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflowX: 'clip',
      }}
    >
      {children}
    </Container>
  );
}

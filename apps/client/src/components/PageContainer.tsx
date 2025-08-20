import * as React from 'react';
import { Container, type ContainerProps } from '@mui/material';

type Props = ContainerProps & {
  /** symmetric horizontal padding per breakpoint */
  gutters?: { xs?: number; sm?: number; md?: number };
};

export default function PageContainer({
  children,
  sx,
  gutters = { xs: 2, sm: 3, md: 4 },
  maxWidth = 'xl',
  disableGutters = true,
  ...rest
}: Props) {
  return (
    <Container
      maxWidth={maxWidth}
      disableGutters={disableGutters}
      sx={{
        px: gutters,
        py: 4,
        mx: 'auto',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflowX: 'clip',
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Container>
  );
}

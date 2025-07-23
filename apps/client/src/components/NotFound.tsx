// src/components/NotFound.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';

type Props = {
  message?: string;
};

const NotFound: React.FC<Props> = ({ message = 'Nothing found.' }) => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      flexDirection="column"
      height="100%"
      p={4}
    >
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

export default NotFound;

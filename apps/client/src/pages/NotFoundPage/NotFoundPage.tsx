// src/pages/NotFoundPage.tsx

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 2,
        py: 6,
      }}
    >
      {/* Icon */}
      <SentimentVeryDissatisfiedIcon
        sx={{ fontSize: '6rem', mb: 2 }}
        color="primary"
      />

      {/* Main Message */}
      <Typography variant="h4" component="h1" gutterBottom>
        404: Page Not Found
      </Typography>

      {/* Description */}
      <Typography variant="body1" color="text.secondary" paragraph>
        Oops! The page you&apos;re looking for doesn’t exist.
      </Typography>

      {/* Back to Home Button */}
      <Button variant="contained" color="primary" onClick={() => navigate('/')}>
        Back to Home
      </Button>
    </Box>
  );
};

export default NotFoundPage;

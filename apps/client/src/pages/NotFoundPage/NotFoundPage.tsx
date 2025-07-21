import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import { useNavigate } from 'react-router-dom';
import PageWithStickyFilters from '../../layouts/PageWithStickyFilters';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageWithStickyFilters
      title="Not Found"
      sidebar={<Box />} // placeholder
    >
      {/* Icon or Image */}
      <SentimentVeryDissatisfiedIcon
        sx={{ fontSize: '6rem', mb: 2 }}
        color="primary"
      />

      {/* Main 404 Message */}
      <Typography variant="h4" component="h1" gutterBottom>
        404: Page Not Found
      </Typography>

      {/* Friendly description */}
      <Typography variant="body1" color="textSecondary" paragraph>
        Oops! The page you&#39;re looking for doesn’t exist.
      </Typography>

      {/* Home button to navigate back */}
      <Button variant="contained" color="primary" onClick={() => navigate('/')}>
        Back to Home
      </Button>
    </PageWithStickyFilters>
  );
};

export default NotFoundPage;

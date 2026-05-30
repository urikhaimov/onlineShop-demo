import { Box, Button, Container, Stack, Typography } from '@mui/material';

interface Props {
  error: unknown;
  resetError?: () => void;
}

/**
 * Top-level fallback rendered by Sentry's ErrorBoundary when the app
 * throws during render. Keeps the user on a real page (not a white
 * screen) and gives them a way to recover.
 */
export default function ErrorFallback({ error, resetError }: Props) {
  const message =
    (typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '') || 'An unexpected error occurred.';

  const reload = () => {
    try {
      resetError?.();
    } finally {
      window.location.reload();
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{ py: { xs: 8, md: 12 }, textAlign: 'center' }}
    >
      <Stack spacing={3} alignItems="center">
        <Typography variant="h3" component="h1">
          Something went wrong
        </Typography>
        <Typography color="text.secondary">
          The page hit an unexpected error. Our team has been notified.
        </Typography>
        {import.meta.env.DEV && (
          <Box
            component="pre"
            sx={{
              maxWidth: '100%',
              overflowX: 'auto',
              textAlign: 'left',
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 1,
              fontSize: 12,
              whiteSpace: 'pre-wrap',
            }}
          >
            {message}
          </Box>
        )}
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={reload}>
            Reload page
          </Button>
          <Button variant="outlined" href="/">
            Go home
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}

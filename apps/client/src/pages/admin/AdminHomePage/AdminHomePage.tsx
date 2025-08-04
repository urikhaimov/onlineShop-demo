// src/pages/admin/AdminDashboardPage/AdminHomePage.tsx

import {
  Typography,
  Paper,
  useMediaQuery,
  Box,
  Stack,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';

export default function AdminHomePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const metrics = [
    { label: 'Total Users', value: 123 },
    { label: 'Total Orders', value: 456 },
    { label: 'Total Products', value: 789 },
  ];

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          px: 2,
          py: 4,
          maxWidth: '1600px',
          mx: 'auto',
        }}
      >
        {/* Sidebar Replacement */}
        <Box
          sx={{
            minWidth: { md: 250 },
            maxWidth: { md: 300 },
            flexShrink: 0,
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold" mb={1}>
            Quick Info
          </Typography>
          {metrics.map(({ label, value }) => (
            <Box key={label} mb={2}>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h6">{value}</Typography>
              <Divider sx={{ mt: 1 }} />
            </Box>
          ))}

          <Typography variant="subtitle2" color="text.secondary" mt={3}>
            Use this panel for shortcuts, summaries, or quick filters.
          </Typography>
        </Box>

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, maxWidth: 1000, mx: 'auto' }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Admin Dashboard
          </Typography>

          <Stack
            direction={isMobile ? 'column' : 'row'}
            spacing={2}
            justifyContent="space-between"
            mb={3}
          >
            {metrics.map(({ label, value }) => (
              <Paper
                key={label}
                elevation={3}
                sx={{ p: 2, flex: 1, textAlign: 'center' }}
              >
                <Typography variant="h6">{label}</Typography>
                <Typography variant="h4" sx={{ mt: 1 }}>
                  {value}
                </Typography>
              </Paper>
            ))}
          </Stack>

          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Latest Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Placeholder for recent orders, new users, or system logs.
            </Typography>
          </Paper>
        </Box>
      </Box>
    </PageLayout>
  );
}

// src/pages/admin/AdminLogsPage.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material';
import { useLogs } from '../../../hooks/useLogs';
import type { SecurityLog } from '../../../api/logs';
import LoadingProgress from '../../../components/LoadingProgress';
import { isDemoAdmin } from '../../../lib/demo-mode';
import NotFound from '../../../components/NotFound';

const CATEGORY_OPTIONS = [
  { id: '', label: 'All' },
  { id: 'category1', label: 'Category 1' },
  { id: 'category2', label: 'Category 2' },
  { id: 'category3', label: 'Category 3' },
];

const AdminLogsPage: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const { data: logs, isLoading, error } = useLogs(categoryFilter);

  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    setCategoryFilter(event.target.value);
  };

  const logsArray: SecurityLog[] = logs ?? [];

  if (isDemoAdmin()) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto', px: 2, py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Admin Logs
        </Typography>
        <NotFound message="Logs are not available in demo mode." />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 1000,
        mx: 'auto',
        px: 2,
        py: 4,
      }}
    >
      <Typography variant="h4" gutterBottom>
        Admin Logs
      </Typography>

      <FormControl sx={{ mb: 3, minWidth: 240 }}>
        <InputLabel>Filter by Category</InputLabel>
        <Select
          value={categoryFilter}
          onChange={handleCategoryChange}
          displayEmpty
          label="Filter by Category"
        >
          {CATEGORY_OPTIONS.map(({ id, label }) => (
            <MenuItem key={id} value={id}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {isLoading ? (
        <LoadingProgress />
      ) : error ? (
        <Typography color="error">
          Failed to load logs: {error.message}
        </Typography>
      ) : logsArray.length > 0 ? (
        <Paper>
          <List>
            {logsArray.map((log: SecurityLog) => (
              <React.Fragment key={log.id}>
                <ListItem>
                  <ListItemText
                    primary={`${log.type || log.action || 'Unknown action'} (Admin: ${
                      log.email || log.uid || 'Unknown'
                    })`}
                    secondary={new Date(log.timestamp).toLocaleString()}
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </Paper>
      ) : (
        <Typography sx={{ p: 2 }} align="center">
          No logs found.
        </Typography>
      )}
    </Box>
  );
};

export default AdminLogsPage;

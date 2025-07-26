import React from 'react';
import { Button, Stack } from '@mui/material';
import { ThemeSettings } from '../../../../api/theme';

interface Props {
  watch: () => ThemeSettings;
  reset: (values: ThemeSettings) => void;
}

export default function ThemeImportExportPanel({ watch, reset }: Props) {
  const handleExport = () => {
    const settings = watch();
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: unknown) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const parsed = JSON.parse(text);
        reset(parsed);
      } catch (err) {
        console.error('Invalid JSON:', err);
      }
    };
    input.click();
  };

  return (
    <Stack direction="row" spacing={2}>
      <Button onClick={handleExport}>Export Theme</Button>
      <Button onClick={handleImport}>Import Theme</Button>
    </Stack>
  );
}

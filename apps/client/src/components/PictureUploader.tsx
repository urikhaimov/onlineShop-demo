// src/components/PictureUploader.tsx
import React, { useEffect, useRef } from 'react';
import { Alert, Avatar, Box, Paper, Snackbar, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useDropzone } from 'react-dropzone';

interface PictureUploaderProps {
  avatarUrl: string | null;
  onDrop: (file: File) => void;
  errorMessage?: string;
  showSnackbar: boolean;
  onCloseSnackbar: () => void;
}

const MAX_FILE_SIZE_MB = 5;

export default function PictureUploader({
  avatarUrl,
  onDrop,
  errorMessage,
  showSnackbar,
  onCloseSnackbar,
}: PictureUploaderProps) {
  const previewRef = useRef<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      const file = accepted[0];
      if (file) {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = URL.createObjectURL(file);
        onDrop(file);
      }
    },
    onDropRejected: () => {
      onCloseSnackbar();
      alert(
        `❌ File rejected. Only images up to ${MAX_FILE_SIZE_MB}MB allowed.`,
      );
    },
    accept: { 'image/*': [] },
    multiple: false,
    maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  });

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} mb={1}>
        Upload Avatar
      </Typography>

      <Box display="flex" justifyContent="center" mb={2}>
        <Avatar
          src={previewRef.current || avatarUrl || undefined}
          alt="Avatar"
          sx={{ width: 100, height: 100 }}
        />
      </Box>

      <Paper
        {...getRootProps()}
        elevation={3}
        sx={{
          py: 2,
          px: 2,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.400',
          textAlign: 'center',
          cursor: 'pointer',
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon fontSize="large" />
        <Typography mt={1}>
          {isDragActive
            ? 'Drop file here...'
            : `Drag or click to upload (max ${MAX_FILE_SIZE_MB}MB)`}
        </Typography>
      </Paper>

      {errorMessage && (
        <Snackbar
          open={showSnackbar}
          autoHideDuration={4000}
          onClose={onCloseSnackbar}
        >
          <Alert severity="error" onClose={onCloseSnackbar}>
            {errorMessage}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
}

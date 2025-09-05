// src/components/ImageUploader.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Paper, Snackbar, Alert } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useDropzone } from 'react-dropzone';
import ReorderComponent from './ReorderComponent';

export interface CombinedImage {
  id: string;
  url: string;
  type: 'existing' | 'new';
  file?: File;
  progress?: number;
}

export interface ImageUploaderProps {
  images: CombinedImage[];
  onDrop: (files: File[]) => void;
  onRemove: (id: string) => void;
  onReorderAll: (newOrder: CombinedImage[]) => void;
  errorMessage?: string;
  showSnackbar: boolean;
  onCloseSnackbar: () => void;
}

const MAX_IMAGES = 10;
const MAX_FILE_SIZE_MB = 5;

export default function ImageUploader({
  images,
  onDrop,
  onRemove,
  onReorderAll,
  errorMessage,
  showSnackbar,
  onCloseSnackbar,
}: ImageUploaderProps) {
  // Track active blob: preview URLs so we can revoke them as soon as they disappear
  const activeBlobsRef = useRef<Set<string>>(new Set());

  const disabled = images.length >= MAX_IMAGES;
  const remainingSlots = Math.max(0, MAX_IMAGES - images.length);

  const handleDropRejected = useCallback(() => {
    onCloseSnackbar();
    alert(
      `❌ Some files were rejected. Only image files up to ${MAX_FILE_SIZE_MB}MB are allowed.`,
    );
  }, [onCloseSnackbar]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: handleDropRejected,
    accept: { 'image/*': [] },
    multiple: true,
    maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    maxFiles: remainingSlots || undefined, // prevent selecting more than allowed
    disabled,
  });

  // Keep active blob previews in sync with props; revoke removed ones immediately
  useEffect(() => {
    const currentBlobs = new Set(
      images
        .filter((img) => img.type === 'new' && img.url.startsWith('blob:'))
        .map((img) => img.url),
    );

    // Revoke previews that are no longer present
    for (const url of activeBlobsRef.current) {
      if (!currentBlobs.has(url)) {
        URL.revokeObjectURL(url);
      }
    }

    activeBlobsRef.current = currentBlobs;
  }, [images]);

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      for (const url of activeBlobsRef.current) {
        URL.revokeObjectURL(url);
      }
      activeBlobsRef.current.clear();
    };
  }, []);

  return (
    <Box>
      <ReorderComponent
        images={images}
        onReorder={onReorderAll}
        onRemove={onRemove}
      />

      <Paper
        {...getRootProps()}
        elevation={3}
        sx={{
          py: 3,
          px: 2,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.400',
          textAlign: 'center',
          color: isDragActive ? 'primary.main' : 'grey.600',
          cursor: disabled ? 'not-allowed' : 'pointer',
          mt: 2,
          opacity: disabled ? 0.45 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
          transition: 'border-color 120ms ease',
        }}
        aria-disabled={disabled}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon fontSize="large" />
        <Typography mt={1}>
          {isDragActive
            ? 'Drop files here...'
            : disabled
              ? `Upload limit reached (${MAX_IMAGES})`
              : `Drag or click to upload (max ${MAX_FILE_SIZE_MB}MB each)`}
        </Typography>
        {!disabled && remainingSlots < MAX_IMAGES && (
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mt={0.5}
          >
            {`${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} remaining`}
          </Typography>
        )}
      </Paper>

      {errorMessage && (
        <Snackbar
          open={showSnackbar}
          autoHideDuration={5000}
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

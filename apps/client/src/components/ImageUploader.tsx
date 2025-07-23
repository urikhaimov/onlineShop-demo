// src/components/ImageUploader.tsx
import React, { useEffect, useRef } from 'react';
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
  const createdPreviewsRef = useRef<string[]>([]);

  const handleDropRejected = () => {
    onCloseSnackbar();
    alert(
      `❌ Some files were rejected. Only images up to ${MAX_FILE_SIZE_MB}MB are allowed.`,
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: handleDropRejected,
    accept: { 'image/*': [] },
    multiple: true,
    maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    disabled: images.length >= MAX_IMAGES,
  });

  // Track new preview blobs
  useEffect(() => {
    const newBlobUrls = images
      .filter((img) => img.type === 'new' && img.url.startsWith('blob:'))
      .map((img) => img.url)
      .filter((url) => !createdPreviewsRef.current.includes(url));

    createdPreviewsRef.current.push(...newBlobUrls);
  }, [images]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      createdPreviewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} mb={1}>
        Product Images
      </Typography>

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
          cursor: images.length >= MAX_IMAGES ? 'not-allowed' : 'pointer',
          mt: 2,
          opacity: images.length >= MAX_IMAGES ? 0.4 : 1,
          pointerEvents: images.length >= MAX_IMAGES ? 'none' : 'auto',
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon fontSize="large" />
        <Typography mt={1}>
          {isDragActive
            ? 'Drop files here...'
            : images.length >= MAX_IMAGES
              ? `Upload limit reached (${MAX_IMAGES})`
              : `Drag or click to upload (max ${MAX_FILE_SIZE_MB}MB each)`}
        </Typography>
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

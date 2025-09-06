import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  SxProps,
  Theme,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useDropzone } from 'react-dropzone';
import { useSnackbar } from 'notistack';
import ReorderComponent from './ReorderComponent';

// Define CombinedImage type if not already defined
export type CombinedImage = {
  id: string;
  url: string;
  type: 'existing' | 'new';
};

// Define ImageUploaderProps
export type ImageUploaderProps = {
  images: CombinedImage[];
  onDrop: (acceptedFiles: File[], rejectedFiles: File[]) => void;
  onRemove: (id: string) => void;
  onReorderAll: (images: CombinedImage[]) => void;

  /** Deprecated: use notistack; kept for compatibility */
  errorMessage?: string;
  showSnackbar?: boolean;
  onCloseSnackbar?: () => void;

  maxImages?: number;
  maxFileSizeMB?: number;
  singleHeight?: number;
  withinCard?: boolean;
  containerSx?: SxProps<Theme>;
  dashedSx?: SxProps<Theme>;
};

type RootContainerProps = {
  /** when true: render Box; else: Paper with elevation */
  withinCard: boolean;
  elevation?: number;
  sx?: SxProps<Theme>;
  children?: React.ReactNode;
} & React.ComponentProps<'div'>; // DOM props so getRootProps() spreads cleanly

const RootContainer = React.forwardRef<HTMLDivElement, RootContainerProps>(
  function RootContainer(
    { withinCard, elevation = 3, sx, children, ...rest },
    ref,
  ) {
    return withinCard ? (
      <Box ref={ref} sx={sx} {...rest}>
        {children}
      </Box>
    ) : (
      <Paper ref={ref} elevation={elevation} sx={sx} {...rest}>
        {children}
      </Paper>
    );
  },
);

export default function ImageUploader({
  images,
  onDrop,
  onRemove,
  onReorderAll,
  errorMessage,
  showSnackbar,
  onCloseSnackbar,
  maxImages = 10,
  maxFileSizeMB = 5,
  singleHeight = 220,
  withinCard = false,
  containerSx,
  dashedSx,
}: ImageUploaderProps) {
  const { enqueueSnackbar } = useSnackbar();

  const isSingle = maxImages === 1;
  const disabled = !isSingle && images.length >= maxImages;
  const remainingSlots = Math.max(0, maxImages - images.length);

  const activeBlobsRef = useRef<Set<string>>(new Set());

  const handleDropRejected = useCallback(() => {
    // Replaces alert() with app-wide snackbar
    enqueueSnackbar(
      `❌ Some files were rejected. Only image files up to ${maxFileSizeMB}MB are allowed.`,
      { variant: 'error', autoHideDuration: 4000 },
    );
    onCloseSnackbar?.();
  }, [enqueueSnackbar, maxFileSizeMB, onCloseSnackbar]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles, fileRejections) => {
      onDrop(
        acceptedFiles,
        fileRejections.map((rej) => rej.file),
      );
    },
    onDropRejected: handleDropRejected,
    accept: { 'image/*': [] },
    multiple: !isSingle,
    maxSize: maxFileSizeMB * 1024 * 1024,
    maxFiles: isSingle ? 1 : remainingSlots || undefined,
    disabled,
  });

  // Show external error via snackbar if provided
  useEffect(() => {
    if (errorMessage && showSnackbar) {
      enqueueSnackbar(errorMessage, {
        variant: 'error',
        autoHideDuration: 5000,
      });
      onCloseSnackbar?.();
    }
  }, [errorMessage, showSnackbar, enqueueSnackbar, onCloseSnackbar]);

  useEffect(() => {
    const currentBlobs = new Set<string>(
      images
        .filter((i) => i.type === 'new' && i.url.startsWith('blob:'))
        .map((i) => i.url),
    );
    for (const url of activeBlobsRef.current)
      if (!currentBlobs.has(url)) URL.revokeObjectURL(url);
    activeBlobsRef.current = currentBlobs;
  }, [images]);

  useEffect(() => {
    return () => {
      for (const url of activeBlobsRef.current) URL.revokeObjectURL(url);
      activeBlobsRef.current.clear();
    };
  }, []);

  const borderColor = useMemo(
    () => (isDragActive ? 'primary.main' : 'divider'),
    [isDragActive],
  );

  // ---------- SINGLE IMAGE ----------
  if (isSingle) {
    const img = images[0];
    return (
      <RootContainer
        {...getRootProps()}
        withinCard={withinCard}
        sx={{
          m: 0,
          borderRadius: withinCard ? 1 : 2,
          bgcolor: withinCard ? 'transparent' : 'background.paper',
          overflow: 'hidden',
          border: '2px dashed',
          borderColor,
          ...containerSx,
        }}
      >
        <input {...getInputProps()} />
        <Box
          sx={{
            height: singleHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            p: 2,
            ...dashedSx,
          }}
        >
          {img ? (
            <>
              <Box
                component="img"
                src={img.url}
                alt="preview"
                sx={{
                  maxHeight: '100%',
                  maxWidth: '100%',
                  objectFit: 'cover',
                  borderRadius: 1,
                  boxShadow: 1,
                }}
              />
              <Tooltip title="Remove">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove(img.id);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    insetInlineEnd: 8,
                    bgcolor: 'rgba(0,0,0,0.45)',
                    color: '#fff',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
                  }}
                >
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  opacity: 0.85,
                  px: 1,
                }}
              >
                Click or drop to replace
              </Typography>
            </>
          ) : (
            <Box
              sx={{
                textAlign: 'center',
                color: isDragActive ? 'primary.main' : 'text.secondary',
              }}
            >
              <CloudUploadIcon fontSize="large" />
              <Typography mt={1}>
                Drag an image here or click to upload
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mt={0.5}
              >
                Max {maxFileSizeMB}MB
              </Typography>
            </Box>
          )}
        </Box>
      </RootContainer>
    );
  }

  // ---------- MULTI IMAGE ----------
  return (
    <Box sx={{ m: 0 }}>
      <ReorderComponent
        images={images}
        onReorder={onReorderAll}
        onRemove={onRemove}
      />

      <RootContainer
        {...getRootProps()}
        withinCard={withinCard}
        sx={{
          py: 3,
          px: 2,
          m: 0,
          border: '2px dashed',
          borderColor,
          textAlign: 'center',
          color: isDragActive ? 'primary.main' : 'text.secondary',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.45 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
          transition: 'border-color 120ms ease',
          borderRadius: withinCard ? 1 : 2,
          bgcolor: withinCard ? 'transparent' : 'background.paper',
          ...containerSx,
        }}
        aria-disabled={disabled}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon fontSize="large" />
        <Typography mt={1}>
          {disabled
            ? `Upload limit reached (${maxImages})`
            : `Drag or click to upload (max ${maxFileSizeMB}MB each)`}
        </Typography>
        {!disabled && remainingSlots < maxImages && (
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mt={0.5}
          >
            {`${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} remaining`}
          </Typography>
        )}
      </RootContainer>
    </Box>
  );
}

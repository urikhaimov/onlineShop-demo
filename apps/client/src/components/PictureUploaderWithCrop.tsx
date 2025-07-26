// ✅ PictureUploaderWithCrop.tsx
import React, { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  IconButton,
  Slider,
  Stack,
} from '@mui/material';
import { Delete, PhotoCamera } from '@mui/icons-material';
import { getCroppedImg } from '../utils/cropUtils';

interface Props {
  avatarUrl: string | null;
  onCropUpload: (file: File) => Promise<void>;
  onDeleteAvatar: () => void;
  disabled?: boolean;
}

export default function PictureUploaderWithCrop({
  avatarUrl,
  onCropUpload,
  onDeleteAvatar,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarFadeIn, setAvatarFadeIn] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: any, cropped: any) => {
    setCroppedAreaPixels(cropped);
  }, []);

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([blob], 'avatar.jpeg', { type: 'image/jpeg' });
      await onCropUpload(file);
      setAvatarFadeIn(false);
      setTimeout(() => setAvatarFadeIn(true), 50);
      setOpen(false);
    } catch (err) {
      console.error('❌ Crop upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Stack alignItems="center" spacing={1}>
      <Fade in={avatarFadeIn} timeout={300}>
        <Box position="relative">
          <Avatar
            src={avatarUrl ?? undefined}
            sx={{ width: 100, height: 100 }}
          />
          {uploading && (
            <CircularProgress
              size={40}
              sx={{ position: 'absolute', top: 30, left: 30 }}
            />
          )}
        </Box>
      </Fade>

      <Stack direction="row" spacing={1} alignItems="center">
        <label htmlFor="avatar-upload">
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />
          <IconButton
            component="span"
            color="primary"
            disabled={disabled || uploading}
          >
            <PhotoCamera />
          </IconButton>
        </label>
        <IconButton onClick={onDeleteAvatar} disabled={disabled || uploading}>
          <Delete />
        </IconButton>
      </Stack>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Crop Avatar</DialogTitle>
        <DialogContent>
          <Box position="relative" width="100%" height={300}>
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </Box>
          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(_, z) => setZoom(z as number)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

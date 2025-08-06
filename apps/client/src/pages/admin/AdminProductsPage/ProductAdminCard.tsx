import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useNavigate } from 'react-router-dom';
import React from 'react';

import { IProduct } from '@common/types';
import { deleteProduct } from '../../../hooks/useProducts';
import { useCardDialogStore } from '../../../stores/useCardDialogStore';

export type Props = {
  product: IProduct;
  onConfirmDelete: (id: string) => void;
  disabled?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
};

export default function ProductAdminCard({
  product,
  onConfirmDelete,
  disabled = false,
  dragHandleProps,
}: Props) {
  const navigate = useNavigate();
  const { dialogOpenId, loadingId, openDialog, closeDialog, setLoading } =
    useCardDialogStore();

  const isDialogOpen = dialogOpenId === product.id;
  const isLoading = loadingId === product.id;

  const handleDeleteClick = () => {
    openDialog(product.id);
  };

  const handleConfirm = async () => {
    setLoading(product.id);
    try {
      await deleteProduct(product.id);
      onConfirmDelete(product.id);
    } catch (err) {
      console.error('❌ Failed to delete product:', err);
      alert('Failed to delete product.');
    } finally {
      setLoading(null);
      closeDialog();
    }
  };

  const formattedPrice = Number(product.price).toFixed(2);

  return (
    <>
      <Card
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          p: 1,
          gap: 1,
        }}
      >
        <CardMedia
          component="img"
          sx={{
            width: 80,
            height: 80,
            borderRadius: 1,
            objectFit: 'cover',
            mx: { xs: 'auto', sm: 0 },
          }}
          image={
            product.images?.[0] || 'https://picsum.photos/seed/fallback/100/100'
          }
          alt={product.name}
        />

        <CardContent
          sx={{
            flex: 1,
            textAlign: { xs: 'center', sm: 'left' },
            px: 1,
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            {product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ${formattedPrice} • Stock: {product.stock ?? 'N/A'}
          </Typography>
        </CardContent>

        <CardActions
          sx={{
            display: 'flex',
            flexDirection: { xs: 'row', sm: 'row' },
            justifyContent: { xs: 'center', sm: 'flex-end' },
            flexWrap: 'wrap',
            ml: { sm: 'auto' },
            px: 1,
            gap: 1,
          }}
        >
          <span {...dragHandleProps}>
            <IconButton disabled={disabled} size="small">
              <DragIndicatorIcon fontSize="small" />
            </IconButton>
          </span>
          <IconButton
            onClick={() => navigate(`/admin/products/edit/${product.id}`)}
            disabled={disabled}
            size="small"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            color="error"
            onClick={handleDeleteClick}
            disabled={disabled}
            size="small"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </CardActions>
      </Card>

      <Dialog open={isDialogOpen} onClose={closeDialog} fullWidth>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{product.name}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            color="error"
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

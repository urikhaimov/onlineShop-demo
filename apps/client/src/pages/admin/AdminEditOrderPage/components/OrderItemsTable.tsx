// src/pages/admin/orders/components/OrderItemsTable.tsx
import React from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Paper,
  TableContainer,
  Avatar,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
}

interface Props {
  items?: OrderItem[];
}

export default function OrderItemsTable({ items = [] }: Props) {
  const { t } = useTranslation();

  const total = items.reduce((sum, item) => {
    const price = Number(item.price || 0);
    const qty = Number(item.quantity || 0);
    return sum + price * qty;
  }, 0);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('orderItems.title', { defaultValue: 'Order Items' })}
      </Typography>

      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('orderItems.empty', { defaultValue: 'No items in this order.' })}
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  {t('orderItems.image', { defaultValue: 'Image' })}
                </TableCell>
                <TableCell>
                  {t('orderItems.name', { defaultValue: 'Name' })}
                </TableCell>
                <TableCell align="right">
                  {t('orderItems.qty', { defaultValue: 'Qty' })}
                </TableCell>
                <TableCell align="right">
                  {t('orderItems.price', { defaultValue: 'Price' })}
                </TableCell>
                <TableCell align="right">
                  {t('orderItems.subtotal', { defaultValue: 'Subtotal' })}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell>
                    <Avatar
                      src={item.image || ''}
                      alt={
                        item.name ||
                        t('orderItems.noImage', { defaultValue: 'No image' })
                      }
                      variant="rounded"
                    />
                  </TableCell>
                  <TableCell>
                    {item.name ||
                      t('orderItems.unnamed', {
                        defaultValue: 'Unnamed Product',
                      })}
                  </TableCell>
                  <TableCell align="right">{item.quantity ?? 0}</TableCell>
                  <TableCell align="right">
                    ${Number(item.price).toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    ${(item.price * item.quantity).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} align="right">
                  <strong>
                    {t('orderItems.total', { defaultValue: 'Total' })}
                  </strong>
                </TableCell>
                <TableCell align="right">
                  <strong>${total.toFixed(2)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

// src/pages/OrderExpandedRow.tsx
import * as React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import type { TOrder } from '@common/types';
import { useTranslation } from 'react-i18next';
import { DASH, asDate } from '../../utils/columns.util';
import { useLocaleFormatters } from '../../hooks/useLocale';
import { useThemeStore } from '../../stores/useThemeStore';

type Props = { order: TOrder };

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

const OrderExpandedRow: React.FC<Props> = ({ order }) => {
  const { t, i18n } = useTranslation();
  const mui = useTheme();
  const { themeSettings } = useThemeStore();

  // Theme-aware controls
  const isDark =
    themeSettings?.darkMode ?? (mui.palette.mode === 'dark' ? true : false);
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const baseRadius =
    (themeSettings?.borderRadius as number | undefined) ??
    (mui.shape.borderRadius as number);
  const radius = clamp(baseRadius, 6, 16);

  // Grid gap derived from spacing scale
  const unit = Math.max(1, Math.round(2 * spacingScale));
  const gap = mui.spacing(unit);

  // Per-section padding (inside each section)
  const sectionPadX = {
    xs: mui.spacing(1.25 * spacingScale),
    sm: mui.spacing(1.5 * spacingScale),
  };
  const sectionPadY = {
    xs: mui.spacing(1 * spacingScale),
    sm: mui.spacing(1.25 * spacingScale),
  };

  // Per-section outer margins (around each section)
  const sectionMarginX = {
    xs: mui.spacing(0.75 * spacingScale),
    sm: mui.spacing(1 * spacingScale),
  };

  const sectionMarginY = {
    xs: mui.spacing(0.75 * spacingScale),
    sm: mui.spacing(1 * spacingScale),
  };
  console.log('spacingScale', spacingScale);
  console.log('sectionMarginX', sectionMarginX);

  const sectionBorder = `1px solid ${mui.palette.divider}`;
  const sectionShadow = isDark ? mui.shadows[2] : mui.shadows[1];

  // Locale-aware formatters
  const { formatCurrency, formatDateTime } = useLocaleFormatters(
    i18n.resolvedLanguage || i18n.language,
    'USD',
  );

  // Data
  const addr = order?.shippingAddress;
  const items = order?.items ?? [];
  const amount = typeof order?.amount === 'number' ? order.amount : undefined;

  const created =
    asDate(order?.createdAt as any) ??
    asDate(order?.metadata?.createdAt as any);
  const updated =
    asDate(order?.updatedAt as any) ??
    asDate(order?.metadata?.updatedAt as any);

  const etaRaw = order?.delivery?.eta as unknown;
  const etaDate = asDate(etaRaw as any);
  const etaLabel = etaDate
    ? formatDateTime(etaDate)
    : typeof etaRaw === 'string' || typeof etaRaw === 'number'
      ? String(etaRaw)
      : DASH;

  const keyForItem = (it: TOrder['items'][number], idx: number) =>
    `${it.productId || 'no-id'}::${it.name || 'no-name'}::${idx}`;

  // Reusable Section wrapper (inner padding + outer margins)
  const Section: React.FC<
    React.PropsWithChildren<{ title: React.ReactNode; gridSpan?: any }>
  > = ({ title, gridSpan, children }) => (
    <Box
      sx={{
        gridColumn: gridSpan,
        // OUTER MARGIN
        mx: sectionMarginX,
        my: sectionMarginY,
        // INNER PADDING
        px: sectionPadX,
        py: sectionPadY,

        border: sectionBorder,
        bgcolor: 'background.paper',
        boxShadow: sectionShadow,

        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        wordBreak: 'break-word',
        '& *': { minWidth: 0 },
      }}
    >
      <Typography variant="subtitle2">{title}</Typography>
      <Box sx={{ mt: 1 }}>{children}</Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'grid',
        gap,
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      <Section title={t('orderDetails.customer', { defaultValue: 'Customer' })}>
        <Typography variant="body2">{order?.ownerName ?? DASH}</Typography>
        <Typography variant="body2">{order?.email ?? DASH}</Typography>
      </Section>

      <Section
        title={t('orderDetails.shippingAddress', {
          defaultValue: 'Shipping address',
        })}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {addr?.fullName ?? DASH}
          {'\n'}
          {[addr?.street, addr?.city].filter(Boolean).join(', ') || DASH}
          {'\n'}
          {[addr?.postalCode, addr?.country].filter(Boolean).join(', ') || DASH}
          {'\n'}
          {addr?.phone ?? DASH}
        </Typography>
      </Section>

      <Section
        title={t('orderDetails.items', { defaultValue: 'Items' })}
        gridSpan={{ xs: 'auto', sm: '1 / span 2' }}
      >
        {items.length > 0 ? (
          <Box component="ul" sx={{ pl: 3, my: 0 }}>
            {items.map((it, idx) => {
              const name = it.name ?? DASH;
              const qty = it.quantity ?? 0;
              const price =
                typeof it.price === 'number' ? formatCurrency(it.price) : DASH;
              return (
                <li key={keyForItem(it, idx)}>
                  <Typography variant="body2">
                    {t('orderDetails.line', {
                      defaultValue: '{{name}} × {{qty}} — Price: {{price}}',
                      name,
                      qty,
                      price,
                    })}
                  </Typography>
                </li>
              );
            })}
          </Box>
        ) : (
          <Typography variant="body2">{DASH}</Typography>
        )}

        <Typography variant="body2" sx={{ mt: 0.75 }}>
          <strong>{t('orderDetails.total', { defaultValue: 'Total' })}:</strong>{' '}
          {amount !== undefined ? formatCurrency(amount) : DASH}
        </Typography>
      </Section>

      <Section title={t('orderDetails.payment', { defaultValue: 'Payment' })}>
        <Typography variant="body2">
          {t('orderDetails.method', { defaultValue: 'Method' })}:{' '}
          {order?.payment?.method ?? DASH}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.status', { defaultValue: 'Status' })}:{' '}
          {order?.payment?.status ?? DASH}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.transaction', { defaultValue: 'Transaction' })}:{' '}
          {order?.payment?.transactionId ?? DASH}
        </Typography>
      </Section>

      <Section title={t('orderDetails.delivery', { defaultValue: 'Delivery' })}>
        <Typography variant="body2">
          {t('orderDetails.provider', { defaultValue: 'Provider' })}:{' '}
          {order?.delivery?.provider ?? DASH}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.tracking', { defaultValue: 'Tracking' })}:{' '}
          {order?.delivery?.trackingNumber ?? DASH}
        </Typography>
        <Typography variant="body2">
          {t('orderDetails.eta', { defaultValue: 'ETA' })}: {etaLabel}
        </Typography>
      </Section>

      <Section title={t('orderDetails.created', { defaultValue: 'Created' })}>
        <Typography variant="body2">
          {created ? formatDateTime(created) : DASH}
        </Typography>
      </Section>

      <Section title={t('orderDetails.updated', { defaultValue: 'Updated' })}>
        <Typography variant="body2">
          {updated ? formatDateTime(updated) : DASH}
        </Typography>
      </Section>

      <Section
        title={t('orderDetails.notes', { defaultValue: 'Notes' })}
        gridSpan={{ xs: 'auto', sm: '1 / span 2' }}
      >
        <Typography variant="body2">{order?.notes ?? DASH}</Typography>
      </Section>
    </Box>
  );
};

export default OrderExpandedRow;

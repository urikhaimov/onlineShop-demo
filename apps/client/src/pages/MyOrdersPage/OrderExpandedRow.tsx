// src/pages/OrderExpandedRow.tsx
import * as React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import type { TOrder } from '@common/types';
import { useTranslation } from 'react-i18next';
import { asDate, DASH } from '../../utils/columns.util';
import { useLocaleFormatters } from '../../hooks/useLocale';
import { useThemeStore } from '../../stores/useThemeStore';

type Props = { order: TOrder };

// Optional block that may exist on the document but not in TOrder
type MaybeCustomer =
  | { name?: string; email?: string; phone?: string }
  | null
  | undefined;

// Responsive value for gridColumn without using `any`
type GridSpan =
  | string
  | number
  | {
      xs?: string | number;
      sm?: string | number;
      md?: string | number;
      lg?: string | number;
      xl?: string | number;
    };

const coalesce = (...xs: ReadonlyArray<unknown>): string => {
  for (const x of xs) {
    if (typeof x === 'string') {
      const trimmed = x.trim();
      if (trimmed) return trimmed;
    }
  }
  return DASH;
};

// Safely extract a `customer` object if present on the order doc
function extractCustomer(order: TOrder): MaybeCustomer {
  const rec = order as unknown as Record<string, unknown>;
  const c = rec['customer'];
  if (!c || typeof c !== 'object') return undefined;

  const crecord = c as Record<string, unknown>;
  const name =
    typeof crecord['name'] === 'string' ? crecord['name'] : undefined;
  const email =
    typeof crecord['email'] === 'string' ? crecord['email'] : undefined;
  const phone =
    typeof crecord['phone'] === 'string' ? crecord['phone'] : undefined;
  return { name, email, phone };
}

const OrderExpandedRow: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const mui = useTheme();
  const { themeSettings } = useThemeStore();

  // Theme-aware controls
  const isDark = themeSettings?.darkMode ?? mui.palette.mode === 'dark';
  const spacingScale = Number(themeSettings?.spacingScale ?? 1);
  const baseRadius =
    (themeSettings?.borderRadius as number | undefined) ??
    (mui.shape.borderRadius as number);

  // Grid gap derived from spacing scale
  const unit = Math.max(1, Math.round(2 * spacingScale));
  const gap = mui.spacing(unit);

  // Per-section padding (inside each section)
  const sectionPadX = {
    xs: mui.spacing(1.25 * spacingScale),
    sm: mui.spacing(1.5 * spacingScale),
  };
  const sectionPadY = {
    xs: mui.spacing(spacingScale),
    sm: mui.spacing(1.25 * spacingScale),
  };

  // Per-section outer margins (around each section)
  const sectionMarginX = {
    xs: mui.spacing(0.75 * spacingScale),
    sm: mui.spacing(spacingScale),
  };
  const sectionMarginY = {
    xs: mui.spacing(0.75 * spacingScale),
    sm: mui.spacing(spacingScale),
  };

  const sectionBorder = `1px solid ${mui.palette.divider}`;
  const sectionShadow = isDark ? mui.shadows[2] : mui.shadows[1];

  // Locale-aware formatters
  const { formatCurrency, formatDateTime } = useLocaleFormatters();

  // Data
  const addr = order?.shippingAddress;
  const items = (order?.items ?? []) as ReadonlyArray<
    Partial<{
      productId: string;
      name: string;
      price: number; // MAJOR
      quantity: number;
    }>
  >;

  // totalAmount stored as MINOR (cents) → display MAJOR
  const amountMajor =
    typeof order?.totalAmount === 'number'
      ? order.totalAmount / 100
      : undefined;

  // Customer fallbacks (support both new and legacy shapes)
  const customer = extractCustomer(order);
  const customerName = coalesce(
    customer?.name,
    (order as unknown as Record<string, unknown>)['ownerName'],
    addr?.fullName,
  );
  const customerEmail = coalesce(
    customer?.email,
    (order as unknown as Record<string, unknown>)['email'],
  );
  const customerPhone = coalesce(customer?.phone, addr?.phone);

  const created = asDate(
    order?.metadata?.createdAt as string | number | Date | undefined,
  );
  const updated = asDate(
    order?.metadata?.updatedAt as string | number | Date | undefined,
  );

  const etaRaw = (order as unknown as { delivery?: { eta?: unknown } }).delivery
    ?.eta;
  const etaDate = asDate(etaRaw as string | number | Date | undefined);
  const etaLabel = etaDate
    ? formatDateTime(etaDate)
    : typeof etaRaw === 'string' || typeof etaRaw === 'number'
      ? String(etaRaw)
      : DASH;

  const keyForItem = (it: TOrder['items'][number], idx: number) => {
    const x = it as unknown as Record<string, unknown>;
    const pid = typeof x['productId'] === 'string' ? x['productId'] : 'no-id';
    const nm = typeof x['name'] === 'string' ? x['name'] : 'no-name';
    return `${pid}::${nm}::${idx}`;
  };

  // Reusable Section wrapper (inner padding + outer margins)
  const Section: React.FC<
    React.PropsWithChildren<{ title: React.ReactNode; gridSpan?: GridSpan }>
  > = ({ title, gridSpan, children }) => (
    <Box
      sx={{
        gridColumn: gridSpan as unknown,
        // OUTER MARGIN
        mx: sectionMarginX,
        my: sectionMarginY,
        // INNER PADDING
        px: sectionPadX,
        py: sectionPadY,

        border: sectionBorder,
        bgcolor: 'background.paper',
        boxShadow: sectionShadow,
        borderRadius: baseRadius,

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
        <Typography variant="body2">{customerName}</Typography>
        <Typography variant="body2" color="text.secondary">
          {customerEmail}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {customerPhone}
        </Typography>
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
              const rec = it as Record<string, unknown>;
              const name =
                typeof rec['name'] === 'string'
                  ? (rec['name'] as string)
                  : DASH;
              const qty =
                typeof rec['quantity'] === 'number'
                  ? (rec['quantity'] as number)
                  : 0;
              const price =
                typeof rec['price'] === 'number'
                  ? formatCurrency(rec['price'] as number)
                  : DASH;

              return (
                <li key={keyForItem(it as TOrder['items'][number], idx)}>
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
          {amountMajor !== undefined ? formatCurrency(amountMajor) : DASH}
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
        <Typography variant="body2">
          {'notes' in (order as unknown as Record<string, unknown>) &&
          typeof (order as unknown as Record<string, unknown>)['notes'] ===
            'string'
            ? ((order as unknown as Record<string, unknown>)['notes'] as string)
            : DASH}
        </Typography>
      </Section>
    </Box>
  );
};

export default OrderExpandedRow;

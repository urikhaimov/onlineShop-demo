import * as React from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TOrder } from '@common/types';
import OrderSection from './OrderSection';
import { recProp } from '../../utils/orderSafe';
import { DASH } from '../../utils/columns.util';
import { useLocaleFormatters } from '../../hooks/useLocale';

type Props = { order: TOrder };
type AnyRec = Record<string, unknown>;

const OrderDelivery: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const { formatDateTime } = useLocaleFormatters();

  // delivery is optional; keep types strict
  const delivery = React.useMemo<AnyRec | undefined>(
    () =>
      recProp(order as unknown as AnyRec, ['delivery']) as AnyRec | undefined,
    [order],
  );

  // helpers
  const isNumericString = (v: unknown): v is string =>
    typeof v === 'string' && /^\d+$/.test(v);

  const getStr = (obj: AnyRec | undefined, key: string): string | undefined => {
    const v = obj?.[key];
    return typeof v === 'string' && v.trim() ? v : undefined;
  };

  const etaRaw: unknown = delivery?.['eta'];

  const etaLabel = React.useMemo(() => {
    // Date instance
    if (etaRaw instanceof Date && !isNaN(etaRaw.getTime())) {
      return formatDateTime(etaRaw);
    }
    // Number (seconds or millis)
    if (typeof etaRaw === 'number') {
      const d = new Date(etaRaw > 1e12 ? etaRaw : etaRaw * 1000);
      if (!isNaN(d.getTime())) return formatDateTime(d);
    }
    // String: try ISO, then numeric string (sec/ms), else show as-is
    if (typeof etaRaw === 'string') {
      const iso = new Date(etaRaw);
      if (!isNaN(iso.getTime())) return formatDateTime(iso);

      if (isNumericString(etaRaw)) {
        const n = Number(etaRaw);
        const d = new Date(etaRaw.length >= 13 ? n : n * 1000);
        if (!isNaN(d.getTime())) return formatDateTime(d);
      }
      return etaRaw.trim() || DASH;
    }
    return DASH;
  }, [etaRaw, formatDateTime]);

  const provider = getStr(delivery, 'provider');
  const trackingNumber = getStr(delivery, 'trackingNumber');

  return (
    <OrderSection
      title={t('orderDetails.delivery', { defaultValue: 'Delivery' })}
    >
      <Typography variant="body2">
        {t('orderDetails.provider', { defaultValue: 'Provider' })}:{' '}
        {provider || DASH}
      </Typography>
      <Typography variant="body2">
        {t('orderDetails.tracking', { defaultValue: 'Tracking' })}:{' '}
        {trackingNumber || DASH}
      </Typography>
      <Typography variant="body2">
        {t('orderDetails.eta', { defaultValue: 'ETA' })}: {etaLabel}
      </Typography>
    </OrderSection>
  );
};

export default OrderDelivery;

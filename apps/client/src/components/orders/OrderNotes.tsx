import * as React from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TOrder } from '@common/types';
import OrderSection from './OrderSection';
import { DASH } from '../../utils/columns.util';

type Props = { order: TOrder };
type AnyRec = Record<string, unknown>;

const OrderNotes: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();

  // Read raw value safely
  const raw: unknown = (order as unknown as AnyRec)?.['notes'];

  // Normalize to a trimmed string or undefined
  const note = React.useMemo<string | undefined>(() => {
    if (typeof raw === 'string') {
      const s = raw.trim();
      return s.length ? s : undefined;
    }
    return undefined;
  }, [raw]);

  return (
    <OrderSection
      title={t('orderDetails.notes', { defaultValue: 'Notes' })}
      gridSpan={{ xs: 'auto', sm: '1 / span 2' }}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {note || DASH}
      </Typography>
    </OrderSection>
  );
};

export default OrderNotes;

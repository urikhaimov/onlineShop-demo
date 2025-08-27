// src/components/CustomDateTimePicker.tsx
import * as React from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useForkRef } from '@mui/material/utils';
import Button from '@mui/material/Button';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import {
  DateTimePicker,
  DateTimePickerFieldProps,
} from '@mui/x-date-pickers/DateTimePicker';
import {
  useParsedFormat,
  usePickerContext,
  useSplitFieldProps,
} from '@mui/x-date-pickers';

type ButtonFieldProps = DateTimePickerFieldProps;

/** Button used as the field – it renders using the picker's current `format` */
function ButtonField(props: ButtonFieldProps) {
  // NOTE: For datetime pickers, the section is 'date-time'
  const { forwardedProps } = useSplitFieldProps(props, 'date-time');
  const picker = usePickerContext();
  const handleRef = useForkRef(picker.triggerRef, picker.rootRef);
  const parsedFormat = useParsedFormat();

  const val = picker.value as Dayjs | null;
  const valueStr =
    val === null
      ? parsedFormat
      : val.locale(dayjs.locale()).format(picker.fieldFormat);

  return (
    <Button
      {...forwardedProps}
      ref={handleRef}
      variant="outlined"
      size="small"
      startIcon={<CalendarTodayRoundedIcon fontSize="small" />}
      sx={{ minWidth: 'fit-content' }}
      onClick={() => picker.setOpen((prev) => !prev)}
    >
      {valueStr}
    </Button>
  );
}

export default function CustomDateTimePicker() {
  // Today (now). Use `.startOf('minute')` if you want to drop seconds.
  const [value, setValue] = React.useState<Dayjs | null>(() => dayjs());

  // Locale-aware display: Hebrew -> 24h DD/MM/YYYY; others -> MMM DD, YYYY 12/24h
  const locale = dayjs.locale();
  const isHebrew = locale?.startsWith('he');
  // Include seconds by using 'HH:mm:ss' (24h) or 'hh:mm:ss A' (12h)
  const displayFormat = isHebrew ? 'DD/MM/YYYY HH:mm' : 'MMM DD, YYYY hh:mm A';
  const ampm = !isHebrew; // 12h for en, 24h for he

  return (
    <DateTimePicker
      value={value}
      onChange={(newValue) => setValue(newValue)}
      format={displayFormat}
      ampm={ampm}
      minutesStep={5}
      slots={{ field: ButtonField }}
      slotProps={{
        nextIconButton: { size: 'small' },
        previousIconButton: { size: 'small' },
      }}
      // Pick views you want visible in the popup:
      views={['year', 'month', 'day', 'hours', 'minutes']}
      // Add 'seconds' above and use format with :ss if you want seconds:
      // views={['year','month','day','hours','minutes','seconds']}
    />
  );
}

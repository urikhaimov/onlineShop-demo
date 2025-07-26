import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Dayjs } from 'dayjs';
import { IconButton, InputAdornment, TextFieldProps } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';

interface Props {
  label?: string;
  value: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  fullWidth?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

export default function UserFilterDatePicker({
  label,
  value,
  onChange,
  fullWidth = false,
  clearable = false,
  onClear,
}: Props) {
  return (
    <DatePicker
      label={label}
      value={value}
      onChange={onChange}
      slotProps={{
        textField: {
          fullWidth,
          InputProps:
            clearable && value
              ? {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => onClear?.()}
                        size="small"
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              : undefined,
        } satisfies TextFieldProps,
      }}
    />
  );
}

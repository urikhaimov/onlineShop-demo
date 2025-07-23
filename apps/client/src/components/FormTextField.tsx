import React from 'react';
import {
  TextField,
  TextFieldProps,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import {
  FieldError,
  FieldErrorsImpl,
  Merge,
  UseFormRegisterReturn,
  Controller,
  Control,
} from 'react-hook-form';

interface Props extends Omit<TextFieldProps, 'defaultValue'> {
  label: string;
  register?: UseFormRegisterReturn;
  errorObject?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
  control?: Control<any>;
  name?: string;
  isSelect?: boolean;
  selectOptions?: { label: string; value: string }[];
  required?: boolean;
}

const FormTextField = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      label,
      register,
      errorObject,
      control,
      name,
      isSelect = false,
      selectOptions = [],
      required,
      ...rest
    },
    ref,
  ) => {
    if (isSelect && control && name) {
      return (
        <FormControl fullWidth error={!!errorObject}>
          <InputLabel shrink>{label}</InputLabel>
          <Controller
            control={control}
            name={name}
            rules={{ required: required ? `${label} is required` : false }}
            render={({ field }) => (
              <Select
                {...field}
                value={field.value ?? ''}
                displayEmpty
                disabled={selectOptions.length === 0}
                sx={{
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  '.MuiSvgIcon-root': {
                    color: 'text.primary',
                  },
                }}
              >
                <MenuItem value="">
                  <em>Select {label.toLowerCase()}</em>
                </MenuItem>
                {selectOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
          <FormHelperText>
            {typeof errorObject?.message === 'string'
              ? errorObject.message
              : ''}
          </FormHelperText>
        </FormControl>
      );
    }

    return (
      <TextField
        {...register}
        fullWidth
        label={label}
        variant="outlined"
        error={!!errorObject}
        helperText={
          typeof errorObject?.message === 'string' ? errorObject.message : ''
        }
        InputLabelProps={{ shrink: true }}
        inputRef={ref}
        sx={{
          '& .MuiInputBase-root': {
            color: 'text.primary',
          },
          '& .MuiInputLabel-root': {
            color: 'text.primary',
          },
        }}
        {...rest}
      />
    );
  },
);

export default FormTextField;

import React from 'react';
import {
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import type { TextFieldProps } from '@mui/material/TextField';
import {
  Controller,
  type FieldError,
  type FieldErrorsImpl,
  type Merge,
  type UseFormRegisterReturn,
  type Control,
} from 'react-hook-form';

type FormChangeEvent = React.SyntheticEvent | React.ChangeEvent<any>;

interface Props extends Omit<TextFieldProps, 'defaultValue'> {
  label: string;
  register?: UseFormRegisterReturn;
  errorObject?: FieldError | Merge<FieldError, FieldErrorsImpl<unknown>>;
  control?: Control<any>; // Prefer Control<ThemeSettings> where possible
  name?: string;
  isSelect?: boolean;
  selectOptions?: ReadonlyArray<{ label: string; value: string }>;
  required?: boolean;
  onChangeCustom?: (
    e: FormChangeEvent,
    onChange: (value: unknown) => void,
  ) => void;
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
      onChangeCustom,
      ...rest
    },
    ref,
  ) => {
    // Controlled <Select>
    if (isSelect && control && name) {
      return (
        <FormControl fullWidth error={!!errorObject}>
          <InputLabel shrink>{label}</InputLabel>
          <Controller
            control={control}
            name={name}
            rules={{ required: required ? `${label} is required` : false }}
            render={({ field, fieldState }) => (
              <>
                <Select
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const value = (e.target as HTMLInputElement).value;

                    if (onChangeCustom) {
                      onChangeCustom(e as FormChangeEvent, field.onChange);
                    } else {
                      field.onChange(value);
                    }
                  }}
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
                <FormHelperText>
                  {typeof fieldState.error?.message === 'string'
                    ? fieldState.error.message
                    : ''}
                </FormHelperText>
              </>
            )}
          />
        </FormControl>
      );
    }

    // Uncontrolled or registered input
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

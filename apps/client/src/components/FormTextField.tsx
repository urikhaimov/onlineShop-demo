// components/FormTextField.tsx
import * as React from 'react';
import { MenuItem, TextField, type TextFieldProps } from '@mui/material';
import {
  Controller,
  type Control,
  type FieldError,
  type FieldErrorsImpl,
  type FieldValues,
  type Merge,
  type Path,
  type RegisterOptions,
  type UseFormRegisterReturn,
} from 'react-hook-form';

export type FormChangeEvent =
  | React.SyntheticEvent
  | React.ChangeEvent<HTMLInputElement>;

type SelectOption = {
  label: React.ReactNode;
  value: string | number;
};

type BaseProps<T extends FieldValues> = Omit<
  TextFieldProps,
  'defaultValue' | 'name'
> & {
  label: string;

  /** Controlled mode (recommended): provide both control + name */
  control?: Control<T>;
  name?: Path<T>;
  rules?: RegisterOptions<T>;

  /** Optional transforms (e.g., string -> number, csv -> string[]) */
  parseValue?: (raw: unknown) => unknown;
  formatValue?: (value: unknown) => unknown;

  /** Legacy / fallback for uncontrolled mode */
  register?: UseFormRegisterReturn;
  errorObject?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;

  /** Optional hook before passing to RHF onChange */
  onChangeCustom?: (
    e: FormChangeEvent,
    onChange: (value: unknown) => void,
  ) => void;

  /** Alias for MUI's `select` prop */
  isSelect?: boolean;
  /** Auto-generate <MenuItem/> children from a simple option list */
  selectOptions?: ReadonlyArray<SelectOption>;

  children?: React.ReactNode; // for select MenuItems
};

function InnerFormTextField<T extends FieldValues>(
  {
    label,
    control,
    name,
    rules,
    parseValue,
    formatValue,
    register,
    errorObject,
    onChangeCustom,
    isSelect,
    selectOptions,
    children,
    ...rest
  }: BaseProps<T>,
  ref: React.Ref<HTMLInputElement>,
) {
  const selectMode = isSelect ?? rest.select;
  const renderedChildren =
    selectMode && selectOptions
      ? selectOptions.map((opt) => (
          <MenuItem key={String(opt.value)} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))
      : children;

  // Controlled path whenever control + name are present
  if (control && name) {
    return (
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field, fieldState }) => {
          const value = formatValue
            ? formatValue(field.value)
            : (field.value ?? (selectMode ? '' : ''));
          const helper =
            fieldState.error?.message ??
            (typeof rest.helperText === 'string' ? rest.helperText : undefined);

          return (
            <TextField
              {...rest}
              select={selectMode}
              label={label}
              value={value}
              error={!!fieldState.error}
              helperText={helper}
              onChange={(e) => {
                if (onChangeCustom)
                  return onChangeCustom(e as FormChangeEvent, field.onChange);
                const raw = (e.target as HTMLInputElement).value;
                const parsed = parseValue ? parseValue(raw) : raw;
                field.onChange(parsed);
              }}
              onBlur={field.onBlur}
              inputRef={(node) => {
                field.ref(node);
                if (typeof ref === 'function')
                  ref(node as HTMLInputElement | null);
                else if (ref)
                  (
                    ref as React.MutableRefObject<HTMLInputElement | null>
                  ).current = node;
              }}
              InputLabelProps={{ shrink: true }}
              fullWidth={rest.fullWidth ?? true}
            >
              {selectMode ? renderedChildren : undefined}
            </TextField>
          );
        }}
      />
    );
  }

  // Fallback: uncontrolled/registered (rarely needed now)
  return (
    <TextField
      {...rest}
      {...register}
      select={selectMode}
      label={label}
      error={!!errorObject}
      helperText={
        typeof errorObject?.message === 'string'
          ? errorObject.message
          : rest.helperText
      }
      InputLabelProps={{ shrink: true }}
      inputRef={ref}
      fullWidth={rest.fullWidth ?? true}
    >
      {selectMode ? renderedChildren : undefined}
    </TextField>
  );
}

const FormTextField = React.forwardRef(InnerFormTextField) as <
  T extends FieldValues,
>(
  p: BaseProps<T> & { ref?: React.Ref<HTMLInputElement> },
) => React.JSX.Element;

export default FormTextField;

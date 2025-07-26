import { Box } from '@mui/material';
import type { Control } from 'react-hook-form';
import FormTextField from '../../../../components/FormTextField';
import { ThemeSettings } from '../../../../api/theme';

interface Props {
  control: Control<ThemeSettings>;
}

export default function HomepageLayoutSelect({ control }: Props) {
  const layoutOptions = [
    { label: 'Hero', value: 'hero' },
    { label: 'Carousel', value: 'carousel' },
    { label: 'Grid', value: 'grid' },
  ];

  return (
    <Box>
      <FormTextField
        label="Homepage Layout"
        name="homepageLayout"
        control={control}
        isSelect
        selectOptions={layoutOptions}
      />
    </Box>
  );
}

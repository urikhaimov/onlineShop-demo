import * as React from 'react';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useTranslation } from 'react-i18next';
export default function Search() {
  const { t } = useTranslation();
  return (
    <FormControl sx={{ width: { xs: '100%', md: '25ch' } }} variant="outlined">
      <OutlinedInput
        size="small"
        id="search"
        placeholder={t('actions.searchPlaceholder')}
        sx={{ flexGrow: 1 }}
        startAdornment={
          <InputAdornment position="start" sx={{ color: 'text.primary' }}>
            <SearchRoundedIcon fontSize="small" />
          </InputAdornment>
        }
        inputProps={{
          'aria-label': 'search',
        }}
      />
    </FormControl>
  );
}

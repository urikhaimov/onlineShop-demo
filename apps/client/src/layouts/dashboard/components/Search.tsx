// src/components/Search.tsx
import * as React from 'react';
import { Autocomplete, TextField, InputAdornment } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// If you created the hook as suggested earlier, keep this import.
// Otherwise, temporarily return an empty array from here to avoid unresolved imports.
import { useSearchSuggestions } from '../../../hooks/useSearchSuggestions';

// ----- Types -----
export type ProductSuggestion = {
  type: 'product';
  id: string;
  title: string;
  slug: string;
};
export type CategorySuggestion = {
  type: 'category';
  id: string;
  name: string;
  slug: string;
};
export type Suggestion = ProductSuggestion | CategorySuggestion;

// Autocomplete option type: can be a server suggestion or a free-typed string
type SearchOption = Suggestion | string;

// Label helper (works for both union and free string)
function getLabel(opt: SearchOption): string {
  if (typeof opt === 'string') return opt;
  return opt.type === 'product' ? opt.title : opt.name;
}

// Equality helper (prevents MUI warnings about option equality)
function isOptionEqualToValue(opt: SearchOption, val: SearchOption): boolean {
  if (typeof opt === 'string' && typeof val === 'string') return opt === val;
  if (typeof opt !== 'string' && typeof val !== 'string') {
    return opt.type === val.type && opt.slug === val.slug;
  }
  return false;
}

export default function Search(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [input, setInput] = React.useState<string>('');

  // Fetch server-side suggestions (safe if hook is implemented)
  const { data = [], isLoading } = useSearchSuggestions(input.trim());

  // Navigate to results page
  const goToResults = (q: string) => {
    const query = q.trim();
    if (!query) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <Autocomplete<SearchOption, false, false, true>
      // Generics: <T=SearchOption, multiple=false, disableClearable=false, freeSolo=true>
      freeSolo
      options={data as Suggestion[]} // Suggestion[] is OK for (Suggestion|string)[]
      loading={isLoading}
      filterOptions={(x) => x} // server already filtered; no client re-filter
      getOptionLabel={getLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      onInputChange={(_, v) => setInput(v)}
      onChange={(_, value) => {
        if (value === null) return;
        if (typeof value === 'string') {
          goToResults(value);
        } else {
          // Navigate directly to entity page; adjust to your routes
          if (value.type === 'product') navigate(`/product/${value.slug}`);
          else navigate(`/category/${value.slug}`);
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={t('actions.searchPlaceholder')}
          size="small"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              goToResults((e.currentTarget as HTMLInputElement).value);
            }
          }}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start" sx={{ color: 'text.secondary' }}>
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      )}
      sx={(t) => ({
        width: { xs: '100%', md: 320 },
        '& .MuiAutocomplete-paper': {
          bgcolor: ((t as any).vars || t).palette.background.paper,
          border: `1px solid ${((t as any).vars || t).palette.divider}`,
        },
        '& .MuiAutocomplete-option': {
          '&[aria-selected="true"]': {
            backgroundColor: ((t as any).vars || t).palette.action.selected,
          },
          '&.Mui-focused': {
            backgroundColor: ((t as any).vars || t).palette.action.hover,
          },
        },
      })}
    />
  );
}

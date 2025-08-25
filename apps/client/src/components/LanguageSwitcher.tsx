// src/components/LanguageSwitcher.tsx
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Menu, MenuItem, ListItemText } from '@mui/material';

type Lng = 'en' | 'he';
const LABEL: Record<Lng, string> = { en: 'English', he: 'עברית' };

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current: Lng = i18n.language?.startsWith('he') ? 'he' : 'en';

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const close = () => setAnchorEl(null);

  const change = async (lng: Lng) => {
    await i18n.changeLanguage(lng); // AppProviders reacts: dir, dayjs, MUI theme
    close(); // i18next-browser-languagedetector persists in localStorage
  };

  return (
    <>
      <Button size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
        {LABEL[current]}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={close}>
        {(['en', 'he'] as Lng[]).map((lng) => (
          <MenuItem
            key={lng}
            selected={lng === current}
            onClick={() => change(lng)}
          >
            <ListItemText primary={LABEL[lng]} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

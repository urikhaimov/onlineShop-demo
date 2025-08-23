// src/pages/AccessDenied.tsx (or wherever this component lives)
import React from 'react';
import { useTranslation } from 'react-i18next';

export const AccessDenied = (): React.JSX.Element => {
  const { t } = useTranslation();
  return (
    <div className="flex h-screen w-full items-center justify-center">
      {t('accessDenied.message', { defaultValue: 'Access Denied' })}
    </div>
  );
};

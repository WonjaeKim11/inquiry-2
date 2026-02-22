'use client';

import { useEffect, type ReactNode } from 'react';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';
import '../i18n/client';

type I18nProviderProps = {
  children: ReactNode;
  lng: string;
};

export function I18nProvider({ children, lng }: I18nProviderProps) {
  useEffect(() => {
    if (!lng || i18next.resolvedLanguage === lng) return;
    i18next.changeLanguage(lng);
  }, [lng]);

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}

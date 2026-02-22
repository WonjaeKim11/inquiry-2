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
  // SSR/SSG에서도 올바른 언어로 렌더링하기 위해 동기적으로 언어 설정
  // 리소스가 static import로 이미 로드되어 있으므로 changeLanguage가 즉시 적용됨
  if (i18next.resolvedLanguage !== lng) {
    i18next.changeLanguage(lng);
  }

  // 클라이언트 사이드 라우트 변경 시 언어 동기화
  useEffect(() => {
    if (!lng || i18next.resolvedLanguage === lng) return;
    i18next.changeLanguage(lng);
  }, [lng]);

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}

'use client';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getOptions, languages } from './settings';
import koTranslation from './locales/ko/translation.json';
import enTranslation from './locales/en/translation.json';

const runsOnServerSide = typeof window === 'undefined';

// 서버가 렌더링한 <html lang="..."> 속성에서 동기적으로 언어 감지
function getInitialLng(): string | undefined {
  if (runsOnServerSide) return undefined;
  const htmlLang = document.documentElement.lang;
  if (htmlLang && languages.includes(htmlLang)) return htmlLang;
  return undefined;
}

i18next.use(initReactI18next).init({
  ...getOptions(),
  lng: getInitialLng(),
  resources: {
    ko: { translation: koTranslation },
    en: { translation: enTranslation },
  },
});

export default i18next;

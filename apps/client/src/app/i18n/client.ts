'use client';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { getOptions, languages } from './settings';

/** 서버/클라이언트 환경 판별 */
const runsOnServerSide = typeof window === 'undefined';

/**
 * 서버가 렌더링한 <html lang="..."> 속성에서 동기적으로 언어를 감지한다.
 * 클라이언트 측에서만 동작하며, 지원하는 언어가 아니면 undefined를 반환한다.
 */
function getInitialLng(): string | undefined {
  if (runsOnServerSide) return undefined;
  const htmlLang = document.documentElement.lang;
  if (htmlLang && languages.includes(htmlLang)) return htmlLang;
  return undefined;
}

/**
 * i18next 클라이언트 인스턴스.
 * 정적 임포트 대신 resourcesToBackend를 사용하여
 * 15개 언어의 번역 파일을 동적으로 로드한다.
 */
i18next
  .use(initReactI18next)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`./locales/${language}/${namespace}.json`)
    )
  )
  .init({
    ...getOptions(),
    lng: getInitialLng(),
    interpolation: {
      escapeValue: false,
    },
  });

export default i18next;

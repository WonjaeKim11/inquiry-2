'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES } from '@inquiry/shared-i18n';
import type { LocaleConfig } from '@inquiry/shared-i18n';

/** LanguageSelector 컴포넌트 props */
interface LanguageSelectorProps {
  /** 로케일 변경 시 호출되는 콜백 */
  onLocaleChange?: (locale: string) => void;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 언어 선택 드롭다운 컴포넌트.
 * 15개 지원 로케일 중 선택하여 i18next 언어를 변경한다.
 * 선택된 언어는 쿠키에 저장되어 다음 방문 시에도 유지된다.
 */
export function LanguageSelector({
  onLocaleChange,
  className,
}: LanguageSelectorProps) {
  const { i18n } = useTranslation();

  /** 언어 변경 핸들러: i18next 언어 변경 + 쿠키 저장 */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLocale = e.target.value;
      i18n.changeLanguage(newLocale);
      // 1년간 유효한 i18next 쿠키 설정
      document.cookie = `i18next=${newLocale};path=/;max-age=31536000`;
      onLocaleChange?.(newLocale);
    },
    [i18n, onLocaleChange]
  );

  return (
    <select
      value={i18n.language}
      onChange={handleChange}
      className={className}
      aria-label="Select language"
    >
      {SUPPORTED_LOCALES.map((locale: LocaleConfig) => (
        <option key={locale.code} value={locale.code}>
          {locale.nativeName}
        </option>
      ))}
    </select>
  );
}

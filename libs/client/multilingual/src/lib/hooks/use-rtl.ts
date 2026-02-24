'use client';

import { useMemo } from 'react';
import { isRtlLanguage } from '@inquiry/survey-builder-config';

/**
 * 언어 코드에 따른 RTL 여부와 방향성을 반환하는 훅.
 *
 * @param code - ISO 언어 코드 (예: "ar", "he")
 * @returns isRtl: RTL 여부, dir: HTML dir 속성 값
 */
export function useRtl(code: string) {
  return useMemo(() => {
    const rtl = isRtlLanguage(code);
    return { isRtl: rtl, dir: rtl ? ('rtl' as const) : ('ltr' as const) };
  }, [code]);
}

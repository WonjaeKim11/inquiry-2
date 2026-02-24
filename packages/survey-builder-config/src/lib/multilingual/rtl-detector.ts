import { RTL_LANGUAGE_CODES } from './constants';

/**
 * 언어 코드로 RTL 여부를 판별한다.
 * 지역 코드가 포함된 경우 (ar-SA 등) 기본 코드만 추출하여 비교한다.
 *
 * @param code - ISO 639-1 언어 코드 (예: "ar", "ar-SA", "he-IL")
 * @returns RTL 언어이면 true, 아니면 false
 */
export function isRtlLanguage(code: string): boolean {
  const baseCode = code.split('-')[0].toLowerCase();
  return (RTL_LANGUAGE_CODES as readonly string[]).includes(baseCode);
}

/**
 * Unicode Bidi 알고리즘을 사용하여 텍스트의 방향성을 감지한다.
 * RTL 문자 비율이 50% 이상이면 'rtl'로 판별.
 *
 * @param text - 방향성을 감지할 텍스트
 * @returns 'rtl' 또는 'ltr'
 */
export function detectTextDirection(text: string): 'rtl' | 'ltr' {
  if (!text || text.trim().length === 0) return 'ltr';

  // RTL 유니코드 범위: 아랍어, 히브리어, 시리아어, 타나, NKo, 기타 RTL 스크립트
  const rtlRegex =
    /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0780-\u07BF\u07C0-\u07FF\u0800-\u083F\u0840-\u085F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g;
  const rtlMatches = text.match(rtlRegex);
  const letterRegex = /\p{L}/gu;
  const allLetters = text.match(letterRegex);

  if (!allLetters || allLetters.length === 0) return 'ltr';
  if (!rtlMatches) return 'ltr';

  return rtlMatches.length / allLetters.length >= 0.5 ? 'rtl' : 'ltr';
}

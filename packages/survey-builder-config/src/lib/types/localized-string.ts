import { z } from 'zod';

/**
 * 다국어 문자열 (locale -> text 매핑).
 * 예: { "ko": "안녕하세요", "en": "Hello" }
 */
export type LocalizedString = Record<string, string>;

/**
 * 필수 LocalizedString Zod 스키마.
 * 최소 1개의 비어있지 않은 값이 존재해야 한다.
 */
export const localizedStringRequiredSchema = z
  .record(z.string(), z.string())
  .refine((obj) => Object.values(obj).some((v) => v.trim().length > 0), {
    message: '최소 1개 언어의 값이 필요합니다',
  });

/**
 * 선택적 LocalizedString Zod 스키마.
 * undefined 또는 null 허용.
 */
export const localizedStringOptionalSchema = z
  .record(z.string(), z.string())
  .optional()
  .nullable();

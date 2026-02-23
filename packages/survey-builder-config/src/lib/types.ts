import { z } from 'zod';

/** 다국어 문자열 (locale → text 매핑) */
export type I18nString = Record<string, string>;

/**
 * Welcome Card 타입.
 * 설문 시작 전 표시되는 환영 카드.
 */
export interface WelcomeCard {
  enabled: boolean;
  headline?: I18nString;
  html?: I18nString;
  fileUrl?: string;
  buttonLabel?: I18nString;
  timeToFinish?: boolean;
  showResponseCount?: boolean;
}

/**
 * Survey Ending 타입.
 * 설문 완료 후 표시되는 종료 카드.
 */
export interface SurveyEnding {
  id: string;
  type: 'endScreen' | 'redirectToUrl';
  headline?: I18nString;
  subheader?: I18nString;
  buttonLabel?: I18nString;
  buttonLink?: string;
  imageUrl?: string;
  redirectUrl?: string;
}

/**
 * Hidden Fields 타입.
 * URL 파라미터를 통해 전달되는 숨겨진 필드.
 */
export interface HiddenFields {
  enabled: boolean;
  fieldIds: string[];
}

/**
 * Survey Variable 타입.
 * 설문 내부에서 사용되는 변수.
 */
export interface SurveyVariable {
  id: string;
  name: string;
  type: 'number' | 'text';
  value: number | string;
}

/** Welcome Card Zod 스키마 */
export const WelcomeCardSchema = z.object({
  enabled: z.boolean(),
  headline: z.record(z.string(), z.string()).optional(),
  html: z.record(z.string(), z.string()).optional(),
  fileUrl: z.string().url().optional(),
  buttonLabel: z.record(z.string(), z.string()).optional(),
  timeToFinish: z.boolean().optional(),
  showResponseCount: z.boolean().optional(),
});

/** Survey Ending Zod 스키마 */
export const SurveyEndingSchema = z.object({
  id: z.string(),
  type: z.enum(['endScreen', 'redirectToUrl']),
  headline: z.record(z.string(), z.string()).optional(),
  subheader: z.record(z.string(), z.string()).optional(),
  buttonLabel: z.record(z.string(), z.string()).optional(),
  buttonLink: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  redirectUrl: z.string().url().optional(),
});

/** Hidden Fields Zod 스키마 */
export const HiddenFieldsSchema = z.object({
  enabled: z.boolean(),
  fieldIds: z.array(z.string()),
});

/** Survey Variable Zod 스키마 */
export const SurveyVariableSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(['number', 'text']),
  value: z.union([z.number(), z.string()]),
});

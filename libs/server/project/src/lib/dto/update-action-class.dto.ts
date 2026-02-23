import { z } from 'zod';
import {
  ACTION_CLASS_NAME_MIN_LENGTH,
  ACTION_CLASS_NAME_MAX_LENGTH,
  NO_CODE_ACTION_TYPES,
  URL_FILTER_RULES,
  URL_FILTER_CONNECTORS,
} from '../enums/project.enums.js';

/**
 * URL 필터 스키마 (업데이트용).
 */
const UrlFilterSchema = z.object({
  value: z.string().min(1),
  rule: z.enum(URL_FILTER_RULES),
});

/**
 * noCode 설정 스키마 (업데이트용).
 */
const NoCodeConfigSchema = z.object({
  type: z.enum(NO_CODE_ACTION_TYPES),
  urlFilters: z.array(UrlFilterSchema).optional(),
  urlFiltersConnector: z.enum(URL_FILTER_CONNECTORS).optional(),
  cssSelector: z.string().optional(),
  innerHtml: z.string().optional(),
});

/**
 * ActionClass 수정 DTO (Zod 스키마).
 * type은 변경 불가하며, 제공된 필드만 업데이트한다.
 */
export const UpdateActionClassSchema = z.object({
  /** 액션 클래스 이름 */
  name: z
    .string()
    .trim()
    .min(ACTION_CLASS_NAME_MIN_LENGTH)
    .max(ACTION_CLASS_NAME_MAX_LENGTH)
    .optional(),
  /** 코드 키 (code 타입 전용) */
  key: z.string().min(1).optional(),
  /** 설명 */
  description: z.string().nullable().optional(),
  /** noCode 설정 (noCode 타입 전용) */
  noCodeConfig: NoCodeConfigSchema.optional(),
});

export type UpdateActionClassDto = z.infer<typeof UpdateActionClassSchema>;

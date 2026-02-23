import { z } from 'zod';
import {
  ACTION_CLASS_TYPES,
  ACTION_CLASS_NAME_MIN_LENGTH,
  ACTION_CLASS_NAME_MAX_LENGTH,
  NO_CODE_ACTION_TYPES,
  URL_FILTER_RULES,
  URL_FILTER_CONNECTORS,
} from '../enums/project.enums.js';

/**
 * URL 필터 스키마.
 * noCode 타입 ActionClass에서 URL 기반 조건을 정의한다.
 */
const UrlFilterSchema = z.object({
  /** 필터 값 (URL 패턴) */
  value: z.string().min(1, { message: 'URL 필터 값은 필수입니다.' }),
  /** 매칭 규칙 */
  rule: z.enum(URL_FILTER_RULES),
});

/**
 * noCode 설정 스키마.
 * noCode 타입 ActionClass의 트리거 조건을 정의한다.
 */
const NoCodeConfigSchema = z.object({
  /** noCode 액션 유형 */
  type: z.enum(NO_CODE_ACTION_TYPES),
  /** URL 기반 필터 목록 */
  urlFilters: z.array(UrlFilterSchema).optional(),
  /** URL 필터 연결 방식 (or/and) */
  urlFiltersConnector: z.enum(URL_FILTER_CONNECTORS).optional(),
  /** CSS 셀렉터 (click 타입에서 사용) */
  cssSelector: z.string().optional(),
  /** innerHTML 매칭 값 (click 타입에서 사용) */
  innerHtml: z.string().optional(),
});

/**
 * ActionClass 생성 DTO (Zod 스키마).
 * code 타입은 key가 필수, noCode 타입은 noCodeConfig가 필수이다.
 */
export const CreateActionClassSchema = z
  .object({
    /** 액션 클래스 이름 (1~64자) */
    name: z
      .string()
      .trim()
      .min(ACTION_CLASS_NAME_MIN_LENGTH, {
        message: `액션 클래스 이름은 최소 ${ACTION_CLASS_NAME_MIN_LENGTH}자 이상이어야 합니다.`,
      })
      .max(ACTION_CLASS_NAME_MAX_LENGTH, {
        message: `액션 클래스 이름은 최대 ${ACTION_CLASS_NAME_MAX_LENGTH}자까지 가능합니다.`,
      }),
    /** 액션 클래스 유형 (code 또는 noCode) */
    type: z.enum(ACTION_CLASS_TYPES),
    /** 코드 키 (code 타입 시 필수) */
    key: z.string().min(1).optional(),
    /** 설명 */
    description: z.string().optional(),
    /** noCode 설정 (noCode 타입 시 필수) */
    noCodeConfig: NoCodeConfigSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'code') return !!data.key;
      if (data.type === 'noCode') return !!data.noCodeConfig;
      return true;
    },
    {
      message:
        'code 타입은 key가 필수이고, noCode 타입은 noCodeConfig가 필수입니다.',
    }
  );

export type CreateActionClassDto = z.infer<typeof CreateActionClassSchema>;

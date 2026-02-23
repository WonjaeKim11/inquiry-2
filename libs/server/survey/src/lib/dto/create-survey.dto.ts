import { z } from 'zod';
import {
  WelcomeCardSchema,
  SurveyEndingSchema,
  HiddenFieldsSchema,
  SurveyVariableSchema,
} from '@inquiry/survey-builder-config';

/**
 * 설문 생성 DTO (Zod 스키마).
 * name은 필수이며, 나머지 필드는 선택적이다.
 * 생성 시 기본 상태는 DRAFT이다.
 */
export const CreateSurveySchema = z.object({
  /** 설문 이름 (1~255자) */
  name: z
    .string()
    .trim()
    .min(1, { message: '설문 이름은 필수입니다.' })
    .max(255, { message: '설문 이름은 최대 255자까지 가능합니다.' }),
  /** 설문 유형 (link 또는 app) */
  type: z.enum(['link', 'app']).optional(),
  /** Builder 스키마 (질문 구조 JSON) */
  schema: z.unknown().optional(),
  /** Welcome Card 설정 */
  welcomeCard: WelcomeCardSchema.optional(),
  /** 종료 카드 목록 */
  endings: z.array(SurveyEndingSchema).optional(),
  /** Hidden Fields 설정 */
  hiddenFields: HiddenFieldsSchema.optional(),
  /** 설문 변수 목록 */
  variables: z.array(SurveyVariableSchema).optional(),
  /** 표시 옵션 */
  displayOption: z
    .enum(['displayOnce', 'displayMultiple', 'respondMultiple', 'displaySome'])
    .optional(),
  /** displaySome일 때 표시 횟수 제한 */
  displayLimit: z.number().int().min(1).optional(),
  /** displaySome일 때 표시 비율 (0~100) */
  displayPercentage: z.number().min(0).max(100).optional(),
  /** 설문 표시 지연 시간 (ms) */
  delay: z.number().int().min(0).optional(),
  /** 자동 닫기 시간 (초) */
  autoClose: z.number().int().min(1).nullable().optional(),
  /** 자동 완료 응답 수 */
  autoComplete: z.number().int().min(1).nullable().optional(),
  /** 재접촉 대기 일수 */
  recontactDays: z.number().int().min(0).nullable().optional(),
  /** PIN 코드 (4자리 숫자) */
  pin: z
    .string()
    .regex(/^\d{4}$/, { message: 'PIN은 4자리 숫자여야 합니다.' })
    .nullable()
    .optional(),
  /** Follow-ups (JSON) */
  followUps: z.unknown().optional(),
  /** Triggers (JSON) */
  triggers: z.unknown().optional(),
  /** 스타일 설정 (JSON) */
  styling: z.record(z.unknown()).nullable().optional(),
  /** 프로젝트 설정 덮어쓰기 (JSON) */
  projectOverwrites: z.record(z.unknown()).nullable().optional(),
  /** 설문 메타데이터 (JSON) */
  surveyMetadata: z.record(z.unknown()).nullable().optional(),
  /** 언어 설정 (JSON) */
  languages: z.unknown().optional(),
  /** 이메일 인증 활성화 */
  isVerifyEmailEnabled: z.boolean().optional(),
  /** 이메일 당 단일 응답 */
  isSingleResponsePerEmailEnabled: z.boolean().optional(),
  /** 뒤로가기 버튼 숨기기 */
  isBackButtonHidden: z.boolean().optional(),
  /** IP 수집 활성화 */
  isIpCollectionEnabled: z.boolean().optional(),
});

export type CreateSurveyDto = z.infer<typeof CreateSurveySchema>;

import { z } from 'zod';
import type { ConditionGroup } from '../logic/types/index';
import { conditionGroupSchema } from '../logic/types/index';

/** 쿼터 한도 초과 시 액션 */
export type QuotaAction = 'endSurvey' | 'continueSurvey';

/** 쿼터 정의 (설문 빌더에서 사용) */
export interface QuotaDefinition {
  id: string;
  name: string;
  limit: number;
  logic: ConditionGroup | Record<string, never>;
  action: QuotaAction;
  endingCardId: string | null;
  countPartialSubmissions: boolean;
}

/** 쿼터 평가 입력 */
export interface QuotaEvaluationInput {
  surveyId: string;
  responseId: string;
  responseData: Record<string, unknown>;
  variableData?: Record<string, string | number>;
  hiddenFieldData?: Record<string, string>;
  isFinished: boolean;
}

/** 쿼터 평가 결과 */
export interface QuotaEvaluationResult {
  shouldEndSurvey: boolean;
  quotaFull: boolean;
  quotaId: string | null;
  action: QuotaAction | null;
  endingCardId: string | null;
}

/** 쿼터 평가 기본 결과 (에러 시 반환) */
export const DEFAULT_EVALUATION_RESULT: QuotaEvaluationResult = {
  shouldEndSurvey: false,
  quotaFull: false,
  quotaId: null,
  action: null,
  endingCardId: null,
};

/** 쿼터 확인 요약 (여러 쿼터 평가 후) */
export interface QuotaCheckSummary {
  totalQuotas: number;
  passedQuotas: number;
  fullQuotas: number;
  result: QuotaEvaluationResult;
}

// ─── Zod 스키마 ──────────────────────────────────────────────

/** QuotaAction 검증 스키마 */
export const quotaActionSchema = z.enum(['endSurvey', 'continueSurvey']);

/** QuotaDefinition 검증 스키마 */
export const quotaDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  limit: z.number().int().min(1),
  logic: z.union([conditionGroupSchema, z.object({}).strict()]).default({}),
  action: quotaActionSchema,
  endingCardId: z.string().nullable().default(null),
  countPartialSubmissions: z.boolean().default(false),
});

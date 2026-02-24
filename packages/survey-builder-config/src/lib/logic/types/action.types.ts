import { z } from 'zod';
import type { CalculateOperator } from './operator.types';
import type { DynamicField } from './condition.types';
import { dynamicFieldSchema } from './condition.types';

/** 변수/hiddenField 값 계산 액션 */
export interface CalculateAction {
  id: string;
  objective: 'calculate';
  target: DynamicField;
  operator: CalculateOperator;
  value: string | number | DynamicField;
}

/** 필수 응답 강제 액션 */
export interface RequireAnswerAction {
  id: string;
  objective: 'requireAnswer';
  targetElementId: string;
}

/** 블록 점프 액션 */
export interface JumpToBlockAction {
  id: string;
  objective: 'jumpToBlock';
  targetBlockId: string;
}

/** 모든 액션의 유니온 */
export type Action = CalculateAction | RequireAnswerAction | JumpToBlockAction;

// ─── Zod 스키마 ──────────────────────────────────────────────

/**
 * 계산 연산자 7개를 검증하는 Zod enum 스키마.
 * CalculateOperator 타입과 동기화되어야 한다.
 */
export const calculateOperatorSchema = z.enum([
  'assign',
  'concat',
  'add',
  'subtract',
  'multiply',
  'divide',
  'isAnyOf',
]);

/** 계산 액션 검증 스키마 */
export const calculateActionSchema = z.object({
  id: z.string().min(1),
  objective: z.literal('calculate'),
  target: dynamicFieldSchema,
  operator: calculateOperatorSchema,
  value: z.union([z.string(), z.number(), dynamicFieldSchema]),
});

/** 필수 응답 강제 액션 검증 스키마 */
export const requireAnswerActionSchema = z.object({
  id: z.string().min(1),
  objective: z.literal('requireAnswer'),
  targetElementId: z.string().min(1),
});

/** 블록 점프 액션 검증 스키마 */
export const jumpToBlockActionSchema = z.object({
  id: z.string().min(1),
  objective: z.literal('jumpToBlock'),
  targetBlockId: z.string().min(1),
});

/** 모든 액션 유니온 검증 스키마 (objective 필드로 구분) */
export const actionSchema = z.discriminatedUnion('objective', [
  calculateActionSchema,
  requireAnswerActionSchema,
  jumpToBlockActionSchema,
]);

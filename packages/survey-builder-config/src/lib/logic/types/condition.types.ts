import { z } from 'zod';
import type { ConditionOperator } from './operator.types';

/** 좌/우 피연산자가 참조하는 동적 필드 */
export interface DynamicField {
  type: 'element' | 'variable' | 'hiddenField' | 'question';
  id: string;
}

/** 정적 우측 피연산자 */
export interface RightOperandStatic {
  type: 'static';
  value: string | number | boolean | string[];
}

/** 동적 우측 피연산자 */
export interface RightOperandDynamic {
  type: 'dynamic';
  field: DynamicField;
}

/** 우측 피연산자 유니온 */
export type RightOperand = RightOperandStatic | RightOperandDynamic;

/** 단일 조건 */
export interface SingleCondition {
  id: string;
  leftOperand: DynamicField;
  operator: ConditionOperator;
  rightOperand?: RightOperand;
}

/** 조건 그룹 (재귀 AND/OR) */
export interface ConditionGroup {
  id: string;
  connector: 'and' | 'or';
  conditions: Array<SingleCondition | ConditionGroup>;
}

/**
 * SingleCondition 타입 가드.
 * operator와 leftOperand 프로퍼티가 있으면 SingleCondition으로 판별한다.
 */
export function isSingleCondition(
  item: SingleCondition | ConditionGroup
): item is SingleCondition {
  return 'operator' in item && 'leftOperand' in item;
}

// ─── Zod 스키마 ──────────────────────────────────────────────

/** DynamicField 검증 스키마 */
export const dynamicFieldSchema = z.object({
  type: z.enum(['element', 'variable', 'hiddenField', 'question']),
  id: z.string().min(1),
});

/** 정적 우측 피연산자 검증 스키마 */
export const rightOperandStaticSchema = z.object({
  type: z.literal('static'),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});

/** 동적 우측 피연산자 검증 스키마 */
export const rightOperandDynamicSchema = z.object({
  type: z.literal('dynamic'),
  field: dynamicFieldSchema,
});

/** 우측 피연산자 유니온 검증 스키마 (type 필드로 구분) */
export const rightOperandSchema = z.discriminatedUnion('type', [
  rightOperandStaticSchema,
  rightOperandDynamicSchema,
]);

/**
 * 조건 비교 연산자 31개를 검증하는 Zod enum 스키마.
 * ConditionOperator 타입과 동기화되어야 한다.
 */
export const conditionOperatorSchema = z.enum([
  // 문자열 연산자 (12개)
  'equals',
  'doesNotEqual',
  'contains',
  'doesNotContain',
  'startsWith',
  'doesNotStartWith',
  'endsWith',
  'doesNotEndWith',
  'isEmpty',
  'isNotEmpty',
  'isSet',
  'isNotSet',
  // 숫자 연산자 (4개)
  'isGreaterThan',
  'isLessThan',
  'isGreaterThanOrEqual',
  'isLessThanOrEqual',
  // 다중 선택 연산자 (5개)
  'equalsOneOf',
  'includesAllOf',
  'includesOneOf',
  'doesNotIncludeOneOf',
  'doesNotIncludeAllOf',
  // 상태 확인 연산자 (8개)
  'isSubmitted',
  'isSkipped',
  'isClicked',
  'isNotClicked',
  'isAccepted',
  'isBooked',
  'isPartiallySubmitted',
  'isCompletelySubmitted',
  // 날짜 연산자 (2개)
  'isBefore',
  'isAfter',
]);

/** 단일 조건 검증 스키마 */
export const singleConditionSchema = z.object({
  id: z.string().min(1),
  leftOperand: dynamicFieldSchema,
  operator: conditionOperatorSchema,
  rightOperand: rightOperandSchema.optional(),
});

/**
 * 조건 그룹 검증 스키마 (재귀 구조).
 * ConditionGroup은 자기 자신을 포함할 수 있으므로 z.lazy를 사용한다.
 */
export const conditionGroupSchema: z.ZodType<ConditionGroup> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    connector: z.enum(['and', 'or']),
    conditions: z.array(z.union([singleConditionSchema, conditionGroupSchema])),
  })
);

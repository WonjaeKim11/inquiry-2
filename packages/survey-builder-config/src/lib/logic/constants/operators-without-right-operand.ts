import type { ConditionOperator } from '../types/operator.types';

/**
 * 우측 피연산자가 필요 없는 연산자 목록 (12개).
 * 상태 확인(8) + isEmpty(2) + isSet(2) 연산자.
 */
export const OPERATORS_WITHOUT_RIGHT_OPERAND: readonly ConditionOperator[] = [
  'isEmpty',
  'isNotEmpty',
  'isSet',
  'isNotSet',
  'isSubmitted',
  'isSkipped',
  'isClicked',
  'isNotClicked',
  'isAccepted',
  'isBooked',
  'isPartiallySubmitted',
  'isCompletelySubmitted',
] as const;

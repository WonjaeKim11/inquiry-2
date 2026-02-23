/**
 * 검증 규칙 디스패처.
 *
 * 24가지 ValidationRule 유형을 해당 평가 함수와 매핑하고,
 * evaluateRule을 통해 단일 규칙을 평가한다.
 * 서브 필드(field) 지정 시 복합 객체에서 해당 필드 값을 추출하여 평가한다.
 */
import type { ValidationRule, ValidationResult } from '../validation.types';

import {
  evaluateMinLength,
  evaluateMaxLength,
  evaluatePattern,
  evaluateEmail,
  evaluateUrl,
  evaluatePhone,
  evaluateEquals,
  evaluateDoesNotEqual,
  evaluateContains,
  evaluateDoesNotContain,
} from './text-rules';

import {
  evaluateMinValue,
  evaluateMaxValue,
  evaluateIsGreaterThan,
  evaluateIsLessThan,
} from './number-rules';

import {
  evaluateIsLaterThan,
  evaluateIsEarlierThan,
  evaluateIsBetween,
  evaluateIsNotBetween,
} from './date-rules';

import {
  evaluateMinSelections,
  evaluateMaxSelections,
} from './selection-rules';

import { evaluateMinRanked, evaluateRankAll } from './ranking-rules';

import { evaluateMinRowsAnswered, evaluateAnswerAllRows } from './matrix-rules';

import {
  evaluateFileExtensionIs,
  evaluateFileExtensionIsNot,
} from './file-rules';

/** 규칙 유형별 평가 함수 매핑 */
const RULE_EVALUATORS: Record<
  string,
  (value: unknown, params?: Record<string, unknown>) => ValidationResult
> = {
  // 텍스트 (10가지)
  minLength: evaluateMinLength,
  maxLength: evaluateMaxLength,
  pattern: evaluatePattern,
  email: evaluateEmail,
  url: evaluateUrl,
  phone: evaluatePhone,
  equals: evaluateEquals,
  doesNotEqual: evaluateDoesNotEqual,
  contains: evaluateContains,
  doesNotContain: evaluateDoesNotContain,
  // 숫자 (4가지)
  minValue: evaluateMinValue,
  maxValue: evaluateMaxValue,
  isGreaterThan: evaluateIsGreaterThan,
  isLessThan: evaluateIsLessThan,
  // 날짜 (4가지)
  isLaterThan: evaluateIsLaterThan,
  isEarlierThan: evaluateIsEarlierThan,
  isBetween: evaluateIsBetween,
  isNotBetween: evaluateIsNotBetween,
  // 선택 (2가지)
  minSelections: evaluateMinSelections,
  maxSelections: evaluateMaxSelections,
  // 순위 (2가지)
  minRanked: evaluateMinRanked,
  rankAll: evaluateRankAll,
  // 행렬 (2가지)
  minRowsAnswered: evaluateMinRowsAnswered,
  answerAllRows: evaluateAnswerAllRows,
  // 파일 (2가지)
  fileExtensionIs: evaluateFileExtensionIs,
  fileExtensionIsNot: evaluateFileExtensionIsNot,
};

/**
 * 단일 ValidationRule을 평가한다.
 *
 * rule.field가 지정된 경우 복합 객체에서 해당 서브 필드 값을 추출하여 평가하고,
 * 지정되지 않은 경우 전체 값을 그대로 평가한다.
 * 알 수 없는 규칙 유형은 통과(valid: true)로 처리한다.
 *
 * @param rule - 평가할 검증 규칙
 * @param value - 검증 대상 값
 * @returns 검증 결과
 */
export function evaluateRule(
  rule: ValidationRule,
  value: unknown
): ValidationResult {
  const evaluator = RULE_EVALUATORS[rule.type];

  // 알 수 없는 규칙 유형은 통과로 처리
  if (!evaluator) {
    return { valid: true, errors: [] };
  }

  // 서브 필드가 지정된 경우 해당 필드 값을 추출
  const targetValue =
    rule.field && typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)[rule.field]
      : value;

  return evaluator(targetValue, rule.params);
}

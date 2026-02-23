/**
 * Validation Engine.
 *
 * ValidationConfig에 따라 응답 값을 검증하는 도메인 로직 엔진.
 * builder의 Entity validate와는 별개로, 24가지 ValidationRule의
 * and/or 논리 결합을 평가한다.
 *
 * - 'and' 논리: 모든 규칙이 통과해야 유효
 * - 'or' 논리: 하나 이상의 규칙이 통과하면 유효
 */
import type { ValidationConfig, ValidationResult } from './validation.types';
import { evaluateRule } from './rules/index';

/**
 * ValidationConfig에 따라 응답 값을 검증한다.
 *
 * 규칙이 없는 경우 항상 유효로 판정한다.
 * and 논리에서는 실패한 규칙의 에러만 수집하고,
 * or 논리에서는 하나라도 통과하면 유효, 모두 실패하면 전체 에러를 수집한다.
 *
 * @param config - 검증 설정 (논리 + 규칙 목록)
 * @param value - 검증 대상 값
 * @returns 검증 결과
 */
export function evaluateValidation(
  config: ValidationConfig,
  value: unknown
): ValidationResult {
  // 규칙이 없으면 항상 유효
  if (!config.rules.length) {
    return { valid: true, errors: [] };
  }

  const results = config.rules.map((rule) => evaluateRule(rule, value));

  if (config.logic === 'and') {
    // AND: 모든 규칙이 통과해야 유효
    const allValid = results.every((r) => r.valid);
    return allValid
      ? { valid: true, errors: [] }
      : {
          valid: false,
          errors: results.filter((r) => !r.valid).flatMap((r) => r.errors),
        };
  }

  // OR: 하나 이상 통과하면 유효
  const anyValid = results.some((r) => r.valid);
  return anyValid
    ? { valid: true, errors: [] }
    : { valid: false, errors: results.flatMap((r) => r.errors) };
}

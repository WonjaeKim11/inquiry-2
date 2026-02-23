/**
 * 숫자 검증 규칙 (4가지).
 *
 * 숫자 값에 대한 최소/최대값, 초과/미만 비교를 수행한다.
 * 입력값을 Number로 파싱하며, NaN인 경우 검증 실패로 처리한다.
 */
import type { ValidationResult } from '../validation.types';

/**
 * 값을 숫자로 파싱한다.
 * @param value - 파싱할 값
 * @returns 파싱된 숫자 (실패 시 NaN)
 */
function parseNumericValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return NaN;
}

/**
 * 최소값 검증 (value >= min).
 * @param value - 검증할 값 (숫자로 파싱됨)
 * @param params - { min: number } 최소값
 * @returns 검증 결과
 */
export function evaluateMinValue(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const num = parseNumericValue(value);
  const min = Number(params?.min ?? -Infinity);

  if (!isNaN(num) && num >= min) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'minValue',
        messageKey: 'validation.error.minValue',
        params: { min },
      },
    ],
  };
}

/**
 * 최대값 검증 (value <= max).
 * @param value - 검증할 값 (숫자로 파싱됨)
 * @param params - { max: number } 최대값
 * @returns 검증 결과
 */
export function evaluateMaxValue(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const num = parseNumericValue(value);
  const max = Number(params?.max ?? Infinity);

  if (!isNaN(num) && num <= max) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'maxValue',
        messageKey: 'validation.error.maxValue',
        params: { max },
      },
    ],
  };
}

/**
 * 초과 검증 (value > threshold).
 * @param value - 검증할 값 (숫자로 파싱됨)
 * @param params - { value: number } 비교 기준값
 * @returns 검증 결과
 */
export function evaluateIsGreaterThan(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const num = parseNumericValue(value);
  const threshold = Number(params?.value ?? 0);

  if (!isNaN(num) && num > threshold) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'isGreaterThan',
        messageKey: 'validation.error.isGreaterThan',
        params: { value: threshold },
      },
    ],
  };
}

/**
 * 미만 검증 (value < threshold).
 * @param value - 검증할 값 (숫자로 파싱됨)
 * @param params - { value: number } 비교 기준값
 * @returns 검증 결과
 */
export function evaluateIsLessThan(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const num = parseNumericValue(value);
  const threshold = Number(params?.value ?? 0);

  if (!isNaN(num) && num < threshold) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'isLessThan',
        messageKey: 'validation.error.isLessThan',
        params: { value: threshold },
      },
    ],
  };
}

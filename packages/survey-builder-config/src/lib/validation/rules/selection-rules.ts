/**
 * 선택 검증 규칙 (2가지).
 *
 * 복수 선택 질문에서 선택된 항목 수의 최소/최대 제한을 검증한다.
 * 입력값은 배열이어야 하며, 배열이 아닌 경우 검증 실패로 처리한다.
 */
import type { ValidationResult } from '../validation.types';

/**
 * 최소 선택 수 검증.
 * @param value - 검증할 값 (선택된 항목 배열)
 * @param params - { min: number } 최소 선택 수
 * @returns 검증 결과
 */
export function evaluateMinSelections(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const selections = Array.isArray(value) ? value : [];
  const min = Number(params?.min ?? 0);

  if (selections.length >= min) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'minSelections',
        messageKey: 'validation.error.minSelections',
        params: { min },
      },
    ],
  };
}

/**
 * 최대 선택 수 검증.
 * @param value - 검증할 값 (선택된 항목 배열)
 * @param params - { max: number } 최대 선택 수
 * @returns 검증 결과
 */
export function evaluateMaxSelections(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const selections = Array.isArray(value) ? value : [];
  const max = Number(params?.max ?? Infinity);

  if (selections.length <= max) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'maxSelections',
        messageKey: 'validation.error.maxSelections',
        params: { max },
      },
    ],
  };
}

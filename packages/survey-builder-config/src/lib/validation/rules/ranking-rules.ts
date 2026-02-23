/**
 * 순위 검증 규칙 (2가지).
 *
 * 순위 지정 질문에서 순위가 매겨진 항목 수를 검증한다.
 * 입력값은 순위가 매겨진 항목의 배열이어야 한다.
 */
import type { ValidationResult } from '../validation.types';

/**
 * 최소 순위 지정 수 검증.
 * @param value - 검증할 값 (순위 매겨진 항목 배열)
 * @param params - { min: number } 최소 순위 지정 수
 * @returns 검증 결과
 */
export function evaluateMinRanked(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const ranked = Array.isArray(value) ? value : [];
  const min = Number(params?.min ?? 0);

  if (ranked.length >= min) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'minRanked',
        messageKey: 'validation.error.minRanked',
        params: { min },
      },
    ],
  };
}

/**
 * 전체 순위 지정 검증.
 * 모든 항목에 순위가 매겨졌는지 확인한다.
 * @param value - 검증할 값 (순위 매겨진 항목 배열)
 * @param params - { total: number } 전체 항목 수
 * @returns 검증 결과
 */
export function evaluateRankAll(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const ranked = Array.isArray(value) ? value : [];
  const total = Number(params?.total ?? 0);

  if (ranked.length >= total) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'rankAll',
        messageKey: 'validation.error.rankAll',
        params: { total },
      },
    ],
  };
}

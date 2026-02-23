/**
 * 행렬 검증 규칙 (2가지).
 *
 * 행렬(Matrix) 질문에서 응답된 행 수를 검증한다.
 * 입력값은 Record<string, unknown> 형태의 행별 응답 객체여야 한다.
 * 각 키가 행 ID이며, 값이 null/undefined가 아닌 경우 응답된 것으로 간주한다.
 */
import type { ValidationResult } from '../validation.types';

/**
 * 행 응답 객체에서 실제 응답된 행 수를 계산한다.
 * null, undefined, 빈 문자열은 미응답으로 간주한다.
 * @param value - 행별 응답 객체
 * @returns 응답된 행 수
 */
function countAnsweredRows(value: unknown): number {
  if (typeof value !== 'object' || value === null) return 0;

  const rows = value as Record<string, unknown>;
  return Object.values(rows).filter(
    (v) => v !== null && v !== undefined && v !== ''
  ).length;
}

/**
 * 최소 응답 행 수 검증.
 * @param value - 검증할 값 (행별 응답 객체)
 * @param params - { min: number } 최소 응답 행 수
 * @returns 검증 결과
 */
export function evaluateMinRowsAnswered(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const answered = countAnsweredRows(value);
  const min = Number(params?.min ?? 0);

  if (answered >= min) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'minRowsAnswered',
        messageKey: 'validation.error.minRowsAnswered',
        params: { min },
      },
    ],
  };
}

/**
 * 전체 행 응답 검증.
 * 모든 행에 응답했는지 확인한다.
 * @param value - 검증할 값 (행별 응답 객체)
 * @param params - { totalRows: number } 전체 행 수
 * @returns 검증 결과
 */
export function evaluateAnswerAllRows(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const answered = countAnsweredRows(value);
  const totalRows = Number(params?.totalRows ?? 0);

  if (answered >= totalRows) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'answerAllRows',
        messageKey: 'validation.error.answerAllRows',
        params: { totalRows },
      },
    ],
  };
}

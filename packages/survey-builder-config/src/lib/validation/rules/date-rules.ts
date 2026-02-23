/**
 * 날짜 검증 규칙 (4가지).
 *
 * 날짜 값에 대한 이후/이전, 범위 내/범위 외 비교를 수행한다.
 * 입력값을 Date로 파싱하며, 유효하지 않은 날짜는 검증 실패로 처리한다.
 */
import type { ValidationResult } from '../validation.types';

/**
 * 값을 Date 객체로 파싱한다.
 * @param value - 파싱할 값 (Date, string, number 등)
 * @returns 파싱된 Date 객체 (실패 시 Invalid Date)
 */
function parseDateValue(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  return new Date(NaN);
}

/**
 * Date 객체가 유효한지 확인한다.
 * @param date - 확인할 Date 객체
 * @returns 유효 여부
 */
function isValidDate(date: Date): boolean {
  return !isNaN(date.getTime());
}

/**
 * 특정 날짜 이후 검증 (value > date).
 * @param value - 검증할 날짜 값
 * @param params - { date: string | number } 비교 기준 날짜
 * @returns 검증 결과
 */
export function evaluateIsLaterThan(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const dateValue = parseDateValue(value);
  const compareDate = parseDateValue(params?.date);

  if (
    isValidDate(dateValue) &&
    isValidDate(compareDate) &&
    dateValue.getTime() > compareDate.getTime()
  ) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'isLaterThan',
        messageKey: 'validation.error.isLaterThan',
        params: { date: params?.date },
      },
    ],
  };
}

/**
 * 특정 날짜 이전 검증 (value < date).
 * @param value - 검증할 날짜 값
 * @param params - { date: string | number } 비교 기준 날짜
 * @returns 검증 결과
 */
export function evaluateIsEarlierThan(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const dateValue = parseDateValue(value);
  const compareDate = parseDateValue(params?.date);

  if (
    isValidDate(dateValue) &&
    isValidDate(compareDate) &&
    dateValue.getTime() < compareDate.getTime()
  ) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'isEarlierThan',
        messageKey: 'validation.error.isEarlierThan',
        params: { date: params?.date },
      },
    ],
  };
}

/**
 * 날짜 범위 내 검증 (startDate <= value <= endDate).
 * @param value - 검증할 날짜 값
 * @param params - { startDate: string | number, endDate: string | number } 범위
 * @returns 검증 결과
 */
export function evaluateIsBetween(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const dateValue = parseDateValue(value);
  const startDate = parseDateValue(params?.startDate);
  const endDate = parseDateValue(params?.endDate);

  if (
    isValidDate(dateValue) &&
    isValidDate(startDate) &&
    isValidDate(endDate) &&
    dateValue.getTime() >= startDate.getTime() &&
    dateValue.getTime() <= endDate.getTime()
  ) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'isBetween',
        messageKey: 'validation.error.isBetween',
        params: { startDate: params?.startDate, endDate: params?.endDate },
      },
    ],
  };
}

/**
 * 날짜 범위 외 검증 (value < startDate || value > endDate).
 * @param value - 검증할 날짜 값
 * @param params - { startDate: string | number, endDate: string | number } 범위
 * @returns 검증 결과
 */
export function evaluateIsNotBetween(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const dateValue = parseDateValue(value);
  const startDate = parseDateValue(params?.startDate);
  const endDate = parseDateValue(params?.endDate);

  if (
    isValidDate(dateValue) &&
    isValidDate(startDate) &&
    isValidDate(endDate) &&
    (dateValue.getTime() < startDate.getTime() ||
      dateValue.getTime() > endDate.getTime())
  ) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'isNotBetween',
        messageKey: 'validation.error.isNotBetween',
        params: { startDate: params?.startDate, endDate: params?.endDate },
      },
    ],
  };
}

import type { TimeUnit } from './types.js';

/**
 * 주어진 날짜에서 시간 단위만큼 뺀 날짜를 반환한다.
 * @param date - 기준 날짜
 * @param amount - 뺄 양
 * @param unit - 시간 단위
 * @returns 계산된 날짜
 */
export function subtractTimeUnit(
  date: Date,
  amount: number,
  unit: TimeUnit
): Date {
  const result = new Date(date);
  switch (unit) {
    case 'day':
      result.setDate(result.getDate() - amount);
      break;
    case 'week':
      result.setDate(result.getDate() - amount * 7);
      break;
    case 'month':
      result.setMonth(result.getMonth() - amount);
      break;
    case 'year':
      result.setFullYear(result.getFullYear() - amount);
      break;
  }
  return result;
}

/**
 * 주어진 날짜에서 시간 단위만큼 더한 날짜를 반환한다.
 * @param date - 기준 날짜
 * @param amount - 더할 양
 * @param unit - 시간 단위
 * @returns 계산된 날짜
 */
export function addTimeUnit(date: Date, amount: number, unit: TimeUnit): Date {
  const result = new Date(date);
  switch (unit) {
    case 'day':
      result.setDate(result.getDate() + amount);
      break;
    case 'week':
      result.setDate(result.getDate() + amount * 7);
      break;
    case 'month':
      result.setMonth(result.getMonth() + amount);
      break;
    case 'year':
      result.setFullYear(result.getFullYear() + amount);
      break;
  }
  return result;
}

/**
 * 날짜를 해당 일의 시작(00:00:00.000 UTC)으로 설정한다.
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/**
 * 날짜를 해당 일의 끝(23:59:59.999 UTC)으로 설정한다.
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

/**
 * 두 날짜가 같은 일인지 비교한다 (UTC 기준).
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * 날짜를 YYYY-MM-DD UTC 문자열로 변환한다.
 */
export function toUTCDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 날짜 비교 연산자 2개.
 *
 * 입력값을 Date 객체로 변환하여 타임스탬프 비교를 수행한다.
 * 유효하지 않은 날짜 문자열의 경우 false를 반환한다.
 */

/** 좌측 날짜가 우측 날짜보다 이전 */
export function evaluateIsBefore(left: unknown, right: unknown): boolean {
  const leftDate = new Date(String(left));
  const rightDate = new Date(String(right));
  if (isNaN(leftDate.getTime()) || isNaN(rightDate.getTime())) return false;
  return leftDate.getTime() < rightDate.getTime();
}

/** 좌측 날짜가 우측 날짜보다 이후 */
export function evaluateIsAfter(left: unknown, right: unknown): boolean {
  const leftDate = new Date(String(left));
  const rightDate = new Date(String(right));
  if (isNaN(leftDate.getTime()) || isNaN(rightDate.getTime())) return false;
  return leftDate.getTime() > rightDate.getTime();
}

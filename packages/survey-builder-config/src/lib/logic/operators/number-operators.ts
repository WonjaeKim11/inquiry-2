/**
 * 숫자 비교 연산자 4개.
 *
 * 모든 함수는 (left: unknown, right: unknown) => boolean 시그니처를 따르며,
 * 입력값을 Number()로 변환하여 비교한다.
 * NaN 변환 시 false를 반환하여 안전하게 처리한다.
 */

/** 좌측이 우측보다 큰지 비교 */
export function evaluateIsGreaterThan(left: unknown, right: unknown): boolean {
  const l = Number(left);
  const r = Number(right);
  if (isNaN(l) || isNaN(r)) return false;
  return l > r;
}

/** 좌측이 우측보다 작은지 비교 */
export function evaluateIsLessThan(left: unknown, right: unknown): boolean {
  const l = Number(left);
  const r = Number(right);
  if (isNaN(l) || isNaN(r)) return false;
  return l < r;
}

/** 좌측이 우측 이상인지 비교 */
export function evaluateIsGreaterThanOrEqual(
  left: unknown,
  right: unknown
): boolean {
  const l = Number(left);
  const r = Number(right);
  if (isNaN(l) || isNaN(r)) return false;
  return l >= r;
}

/** 좌측이 우측 이하인지 비교 */
export function evaluateIsLessThanOrEqual(
  left: unknown,
  right: unknown
): boolean {
  const l = Number(left);
  const r = Number(right);
  if (isNaN(l) || isNaN(r)) return false;
  return l <= r;
}

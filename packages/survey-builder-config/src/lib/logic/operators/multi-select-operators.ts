/**
 * 다중 선택 비교 연산자 5개.
 *
 * 좌측(left)은 선택된 값의 배열(string[]) 또는 단일 값,
 * 우측(right)은 비교 대상 배열(string[])을 기대한다.
 * 배열이 아닌 경우 빈 배열로 안전하게 처리한다.
 */

/** 좌측 값이 우측 배열의 값 중 하나와 일치 */
export function evaluateEqualsOneOf(left: unknown, right: unknown): boolean {
  const rightArr = Array.isArray(right) ? right : [];
  return rightArr.some(
    (item) => String(item).toLowerCase() === String(left).toLowerCase()
  );
}

/** 좌측 배열이 우측 배열의 모든 값을 포함 */
export function evaluateIncludesAllOf(left: unknown, right: unknown): boolean {
  const leftArr = Array.isArray(left) ? left.map(String) : [];
  const rightArr = Array.isArray(right) ? right.map(String) : [];
  return rightArr.every((item) => leftArr.includes(item));
}

/** 좌측 배열이 우측 배열의 값 중 하나 이상을 포함 */
export function evaluateIncludesOneOf(left: unknown, right: unknown): boolean {
  const leftArr = Array.isArray(left) ? left.map(String) : [];
  const rightArr = Array.isArray(right) ? right.map(String) : [];
  return rightArr.some((item) => leftArr.includes(item));
}

/** 좌측 배열이 우측 배열의 값 중 어느 것도 포함하지 않음 */
export function evaluateDoesNotIncludeOneOf(
  left: unknown,
  right: unknown
): boolean {
  return !evaluateIncludesOneOf(left, right);
}

/** 좌측 배열이 우측 배열의 모든 값을 포함하지 않음 */
export function evaluateDoesNotIncludeAllOf(
  left: unknown,
  right: unknown
): boolean {
  return !evaluateIncludesAllOf(left, right);
}

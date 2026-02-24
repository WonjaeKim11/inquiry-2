/**
 * 계산 연산자 7개.
 *
 * 각 함수는 (currentValue: unknown, operand: unknown) => string | number 시그니처를 따른다.
 * NaN 변환 시 안전한 기본값을 반환하며, 0 나누기를 방지한다.
 */

/** 값을 할당 */
export function executeAssign(
  _current: unknown,
  operand: unknown
): string | number {
  if (typeof operand === 'number') return operand;
  return String(operand);
}

/** 문자열 연결 */
export function executeConcat(current: unknown, operand: unknown): string {
  return String(current ?? '') + String(operand ?? '');
}

/** 숫자 덧셈 */
export function executeAdd(current: unknown, operand: unknown): number {
  const c = Number(current);
  const o = Number(operand);
  if (isNaN(c) || isNaN(o)) return isNaN(c) ? 0 : c;
  return c + o;
}

/** 숫자 뺄셈 */
export function executeSubtract(current: unknown, operand: unknown): number {
  const c = Number(current);
  const o = Number(operand);
  if (isNaN(c) || isNaN(o)) return isNaN(c) ? 0 : c;
  return c - o;
}

/** 숫자 곱셈 */
export function executeMultiply(current: unknown, operand: unknown): number {
  const c = Number(current);
  const o = Number(operand);
  if (isNaN(c) || isNaN(o)) return 0;
  return c * o;
}

/** 숫자 나눗셈 (0 나누기 방지) */
export function executeDivide(current: unknown, operand: unknown): number {
  const c = Number(current);
  const o = Number(operand);
  if (isNaN(c) || isNaN(o) || o === 0) return isNaN(c) ? 0 : c;
  return c / o;
}

/** equalsOneOf와 동일 동작 (isAnyOf) — 매칭 시 1, 불일치 시 0 반환 */
export function executeIsAnyOf(
  current: unknown,
  operand: unknown
): string | number {
  const arr = Array.isArray(operand) ? operand : [];
  const match = arr.some(
    (item) => String(item).toLowerCase() === String(current).toLowerCase()
  );
  return match ? 1 : 0;
}

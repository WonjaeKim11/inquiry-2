/**
 * 문자열 비교 연산자 12개.
 *
 * 모든 함수는 (left: unknown, right: unknown) => boolean 시그니처를 따르며,
 * 입력값을 String()으로 변환하여 대소문자 무시(case-insensitive) 비교를 수행한다.
 * isEmpty/isNotEmpty/isSet/isNotSet은 우측 피연산자를 사용하지 않는다.
 */

/** 문자열 동등 비교 (대소문자 무시) */
export function evaluateEquals(left: unknown, right: unknown): boolean {
  return String(left).toLowerCase() === String(right).toLowerCase();
}

/** 문자열 비동등 비교 (대소문자 무시) */
export function evaluateDoesNotEqual(left: unknown, right: unknown): boolean {
  return String(left).toLowerCase() !== String(right).toLowerCase();
}

/** 문자열 포함 여부 */
export function evaluateContains(left: unknown, right: unknown): boolean {
  return String(left).toLowerCase().includes(String(right).toLowerCase());
}

/** 문자열 미포함 여부 */
export function evaluateDoesNotContain(left: unknown, right: unknown): boolean {
  return !String(left).toLowerCase().includes(String(right).toLowerCase());
}

/** 문자열 시작 여부 */
export function evaluateStartsWith(left: unknown, right: unknown): boolean {
  return String(left).toLowerCase().startsWith(String(right).toLowerCase());
}

/** 문자열 시작하지 않음 */
export function evaluateDoesNotStartWith(
  left: unknown,
  right: unknown
): boolean {
  return !String(left).toLowerCase().startsWith(String(right).toLowerCase());
}

/** 문자열 끝 여부 */
export function evaluateEndsWith(left: unknown, right: unknown): boolean {
  return String(left).toLowerCase().endsWith(String(right).toLowerCase());
}

/** 문자열 끝나지 않음 */
export function evaluateDoesNotEndWith(left: unknown, right: unknown): boolean {
  return !String(left).toLowerCase().endsWith(String(right).toLowerCase());
}

/** 값이 비어있는지 (null, undefined, 빈 문자열) */
export function evaluateIsEmpty(left: unknown): boolean {
  return left === null || left === undefined || String(left).trim() === '';
}

/** 값이 비어있지 않은지 */
export function evaluateIsNotEmpty(left: unknown): boolean {
  return !evaluateIsEmpty(left);
}

/** 값이 설정되어 있는지 (null/undefined가 아닌지) */
export function evaluateIsSet(left: unknown): boolean {
  return left !== null && left !== undefined;
}

/** 값이 설정되지 않았는지 */
export function evaluateIsNotSet(left: unknown): boolean {
  return left === null || left === undefined;
}

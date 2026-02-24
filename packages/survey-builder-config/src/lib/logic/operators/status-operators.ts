/**
 * 상태 확인 연산자 8개.
 *
 * 좌측(left)은 요소의 상태 문자열을 기대한다.
 * 우측 피연산자는 사용하지 않는다 (OPERATORS_WITHOUT_RIGHT_OPERAND 소속).
 * String() 변환을 통해 안전하게 비교한다.
 */

/** 제출됨 */
export function evaluateIsSubmitted(left: unknown): boolean {
  return String(left) === 'submitted';
}

/** 건너뜀 */
export function evaluateIsSkipped(left: unknown): boolean {
  return String(left) === 'skipped';
}

/** 클릭됨 */
export function evaluateIsClicked(left: unknown): boolean {
  return String(left) === 'clicked';
}

/** 클릭되지 않음 */
export function evaluateIsNotClicked(left: unknown): boolean {
  return String(left) !== 'clicked';
}

/** 동의됨 */
export function evaluateIsAccepted(left: unknown): boolean {
  return String(left) === 'accepted';
}

/** 예약됨 */
export function evaluateIsBooked(left: unknown): boolean {
  return String(left) === 'booked';
}

/** 부분 제출됨 */
export function evaluateIsPartiallySubmitted(left: unknown): boolean {
  return String(left) === 'partiallySubmitted';
}

/** 완전 제출됨 */
export function evaluateIsCompletelySubmitted(left: unknown): boolean {
  return String(left) === 'completelySubmitted';
}

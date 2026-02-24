/**
 * 조건 비교 연산자 (31개).
 * 문자열(12), 숫자(4), 다중 선택(5), 상태 확인(8), 날짜(2) 연산자를 포함한다.
 */
export type ConditionOperator =
  // 문자열 연산자 (12개)
  | 'equals'
  | 'doesNotEqual'
  | 'contains'
  | 'doesNotContain'
  | 'startsWith'
  | 'doesNotStartWith'
  | 'endsWith'
  | 'doesNotEndWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'isSet'
  | 'isNotSet'
  // 숫자 연산자 (4개)
  | 'isGreaterThan'
  | 'isLessThan'
  | 'isGreaterThanOrEqual'
  | 'isLessThanOrEqual'
  // 다중 선택 연산자 (5개)
  | 'equalsOneOf'
  | 'includesAllOf'
  | 'includesOneOf'
  | 'doesNotIncludeOneOf'
  | 'doesNotIncludeAllOf'
  // 상태 확인 연산자 (8개)
  | 'isSubmitted'
  | 'isSkipped'
  | 'isClicked'
  | 'isNotClicked'
  | 'isAccepted'
  | 'isBooked'
  | 'isPartiallySubmitted'
  | 'isCompletelySubmitted'
  // 날짜 연산자 (2개)
  | 'isBefore'
  | 'isAfter';

/**
 * 계산 연산자 (7개).
 * 변수/hiddenField 값을 설정하거나 계산하는 연산자.
 */
export type CalculateOperator =
  | 'assign'
  | 'concat'
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'isAnyOf';
